import { Router } from 'express';
import type { Request, Response } from 'express';

import { WebhookEntity } from '../database/entities/webhook.entity';
import { WorkflowEntity } from '../database/entities/workflow.entity';
import { WorkflowExecution } from '../database/entities/workflow-execution.entity';
import { WorkflowStepExecution } from '../database/entities/workflow-step-execution.entity';
import { ExecutionStatus, StepStatus, StepType } from '../database/enums';
import type { WebhookTriggerConfig, WebhookResponseMode } from '../sdk/types';
import type { EngineEvent } from '../engine/event-bus.types';
import type { AppDependencies } from './server';
import { validateWebhookRequest } from './validate-webhook-schema';

export function createWebhookRouter(deps: AppDependencies): Router {
	const router = Router();
	const { dataSource, engineService, eventBus, metrics } = deps;

	// ALL /webhook/* - Handle incoming webhook
	router.all('/*path', async (req: Request, res: Response) => {
		const startTime = Date.now();

		// Track webhook metrics when the response finishes
		res.on('finish', () => {
			const durationMs = Date.now() - startTime;
			const rawParam = req.params.path ?? req.params[0] ?? '';
			const rawPath = Array.isArray(rawParam) ? rawParam.join('/') : String(rawParam);
			const path = rawPath.replace(/^\//, '');
			metrics?.webhookRequestsTotal.inc({
				method: req.method.toUpperCase(),
				path,
				status_code: String(res.statusCode),
			});
			metrics?.webhookDuration.observe(durationMs);
		});

		try {
			// Express 5 wildcard params can be arrays
			const rawParam = req.params.path ?? req.params[0] ?? '';
			const rawPath = Array.isArray(rawParam) ? rawParam.join('/') : String(rawParam);
			const webhookPath = rawPath.replace(/^\//, '');
			const method = req.method.toUpperCase();

			// Look up webhook registration by method + path
			const webhook = await dataSource
				.getRepository(WebhookEntity)
				.findOneBy({ method, path: webhookPath });

			if (!webhook) {
				res.status(404).json({ error: 'Webhook not found' });
				return;
			}

			// Fetch workflow once -- used for both response mode and schema validation
			const workflow = await dataSource
				.getRepository(WorkflowEntity)
				.createQueryBuilder('w')
				.where('w.id = :id', { id: webhook.workflowId })
				.orderBy('w.version', 'DESC')
				.limit(1)
				.getOne();

			// Extract matching trigger config
			const triggers = (workflow?.triggers ?? []) as WebhookTriggerConfig[];
			const matchingTrigger = triggers.find(
				(t) => t.type === 'webhook' && t.config.path.replace(/^\//, '') === webhookPath,
			);

			// Determine response mode
			const responseMode: WebhookResponseMode = matchingTrigger?.config.responseMode ?? 'lastNode';

			// Build trigger data from the request
			const triggerData = {
				body: req.body,
				headers: req.headers,
				query: req.query,
				method: req.method,
				path: webhookPath,
			};

			// Validate request against schema if defined
			if (matchingTrigger) {
				const validation = validateWebhookRequest(matchingTrigger, triggerData);
				if (!validation.valid) {
					// Create a failed execution so the validation error is visible in the UI
					const now = new Date();
					const executionResult = await dataSource
						.getRepository(WorkflowExecution)
						.createQueryBuilder()
						.insert()
						.into(WorkflowExecution)
						.values({
							workflowId: webhook.workflowId,
							workflowVersion: workflow?.version ?? 1,
							status: ExecutionStatus.Failed,
							mode: 'production',
							startedAt: now,
							completedAt: now,
							error: {
								message: `Webhook schema validation failed: ${validation.errors!.map((e) => `${e.path} ${e.message}`).join('; ')}`,
								code: 'VALIDATION_ERROR',
								category: 'validation',
								retriable: false,
							},
						} as Record<string, unknown>)
						.returning('id')
						.execute();

					const executionId = executionResult.raw[0].id as string;

					const errorMessage = `Webhook schema validation failed: ${validation.errors!.map((e) => `${e.path} ${e.message}`).join('; ')}`;

					// Create a failed trigger step with the validation errors
					await dataSource
						.getRepository(WorkflowStepExecution)
						.createQueryBuilder()
						.insert()
						.into(WorkflowStepExecution)
						.values({
							executionId,
							stepId: 'trigger',
							stepType: StepType.Trigger,
							status: StepStatus.Failed,
							input: triggerData,
							error: {
								message: errorMessage,
								code: 'VALIDATION_ERROR',
								category: 'validation',
								retriable: false,
							},
							startedAt: now,
							completedAt: now,
							durationMs: 0,
						} as Record<string, unknown>)
						.execute();

					// Emit events so the UI picks up the failed execution
					eventBus.emit({ type: 'execution:started', executionId });
					eventBus.emit({
						type: 'execution:failed',
						executionId,
						error: {
							message: errorMessage,
							code: 'VALIDATION_ERROR',
							category: 'validation' as const,
							retriable: false,
						},
					});

					res.status(422).json({
						executionId,
						error: 'Webhook schema validation failed',
						details: validation.errors,
					});
					return;
				}
			}

			// Start the execution
			const executionId = await engineService.startExecution(
				webhook.workflowId,
				triggerData,
				'production',
			);

			// Handle response based on mode
			switch (responseMode) {
				case 'respondImmediately':
					res.status(202).json({ executionId, status: 'running' });
					return;

				case 'lastNode':
					await waitForCompletion(eventBus, executionId, res, 'lastNode');
					return;

				case 'respondWithNode':
					await waitForWebhookResponse(eventBus, executionId, res);
					return;

				case 'allData':
					await waitForCompletion(eventBus, executionId, res, 'allData');
					return;

				default:
					// Default to lastNode behavior
					await waitForCompletion(eventBus, executionId, res, 'lastNode');
					return;
			}
		} catch (error) {
			if (!res.headersSent) {
				res.status(500).json({ error: (error as Error).message });
			}
		}
	});

	return router;
}

/**
 * Waits for execution completion and responds with the appropriate data.
 */
function waitForCompletion(
	eventBus: AppDependencies['eventBus'],
	executionId: string,
	res: Response,
	mode: 'lastNode' | 'allData',
): Promise<void> {
	return new Promise((resolve) => {
		const timeout = setTimeout(() => {
			cleanup();
			if (!res.headersSent) {
				res.status(504).json({ error: 'Execution timed out' });
			}
			resolve();
		}, 300_000); // 5 minute timeout

		const handler = async (event: EngineEvent) => {
			if (!('executionId' in event) || event.executionId !== executionId) {
				return;
			}

			if (event.type === 'execution:completed') {
				cleanup();
				if (mode === 'allData') {
					// For allData mode, we need to return the result as-is
					// The execution result contains the last leaf output
					// But for allData, we should return it wrapped
					res.status(200).json({ result: event.result });
				} else {
					// lastNode mode: return the last step output
					res.status(200).json(event.result);
				}
				resolve();
			} else if (event.type === 'execution:failed') {
				cleanup();
				res.status(500).json({ error: event.error });
				resolve();
			} else if (event.type === 'execution:cancelled') {
				cleanup();
				res.status(500).json({ error: 'Execution cancelled' });
				resolve();
			}
		};

		const cleanup = () => {
			clearTimeout(timeout);
			eventBus.off('execution:*', handler as (...args: unknown[]) => void);
		};

		eventBus.onExecutionEvent(handler);
	});
}

/**
 * Waits for a webhook:respond event and sends that as the HTTP response.
 */
function waitForWebhookResponse(
	eventBus: AppDependencies['eventBus'],
	executionId: string,
	res: Response,
): Promise<void> {
	return new Promise((resolve) => {
		const timeout = setTimeout(() => {
			cleanup();
			if (!res.headersSent) {
				res.status(504).json({ error: 'Webhook response timed out' });
			}
			resolve();
		}, 300_000); // 5 minute timeout

		const webhookHandler = (event: EngineEvent) => {
			if (event.type !== 'webhook:respond' || event.executionId !== executionId) {
				return;
			}

			cleanup();
			const statusCode = event.statusCode ?? 200;

			if (event.headers) {
				for (const [key, value] of Object.entries(event.headers)) {
					res.setHeader(key, value);
				}
			}

			res.status(statusCode).json(event.body);
			resolve();
		};

		const failureHandler = (event: EngineEvent) => {
			if (!('executionId' in event) || event.executionId !== executionId) {
				return;
			}

			if (event.type === 'execution:failed') {
				cleanup();
				res.status(500).json({ error: event.error });
				resolve();
			} else if (event.type === 'execution:cancelled') {
				cleanup();
				res.status(500).json({ error: 'Execution cancelled' });
				resolve();
			}
		};

		const cleanup = () => {
			clearTimeout(timeout);
			eventBus.off('webhook:respond', webhookHandler as (...args: unknown[]) => void);
			eventBus.off('execution:*', failureHandler as (...args: unknown[]) => void);
		};

		eventBus.on('webhook:respond', webhookHandler);
		eventBus.onExecutionEvent(failureHandler);
	});
}
