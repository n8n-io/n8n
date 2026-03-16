import { Router } from 'express';
import type { Request, Response } from 'express';

import { WorkflowStepExecution } from '../database/entities/workflow-step-execution.entity';
import { StepStatus } from '../database/enums';
import type { AppDependencies } from './server';

export function createStepExecutionRouter(deps: AppDependencies): Router {
	const router = Router();
	const { dataSource, eventBus } = deps;

	// GET /api/workflow-step-executions/:id - Get step details
	router.get('/:id', async (req: Request, res: Response) => {
		try {
			const { id } = req.params;

			const step = await dataSource.getRepository(WorkflowStepExecution).findOneBy({ id });

			if (!step) {
				res.status(404).json({ error: 'Step execution not found' });
				return;
			}

			res.status(200).json({
				id: step.id,
				executionId: step.executionId,
				stepId: step.stepId,
				stepType: step.stepType,
				status: step.status,
				input: step.input,
				output: step.output,
				error: step.error,
				attempt: step.attempt,
				parentStepExecutionId: step.parentStepExecutionId,
				startedAt: step.startedAt,
				completedAt: step.completedAt,
				durationMs: step.durationMs,
			});
		} catch (error) {
			res.status(500).json({ error: (error as Error).message });
		}
	});

	// POST /api/workflow-step-executions/:id/approve - Approve/decline
	router.post('/:id/approve', async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const { approved, token } = req.body as { approved: boolean; token: string };

			if (typeof approved !== 'boolean') {
				res.status(400).json({ error: 'approved (boolean) is required' });
				return;
			}

			if (typeof token !== 'string' || token.length === 0) {
				res.status(400).json({ error: 'token (string) is required' });
				return;
			}

			// Load the step to get existing output for merging
			const step = await dataSource.getRepository(WorkflowStepExecution).findOneBy({ id });

			if (!step) {
				res.status(404).json({ error: 'Step execution not found' });
				return;
			}

			// Merge existing output (approval context from step function) with approval decision
			const existingOutput = (step.output as Record<string, unknown>) ?? {};
			const mergedOutput = { ...existingOutput, approved };

			// Atomically update only if step is in waiting_approval status AND token matches
			const updateResult = await dataSource
				.getRepository(WorkflowStepExecution)
				.createQueryBuilder()
				.update(WorkflowStepExecution)
				.set({
					status: StepStatus.Completed,
					output: mergedOutput as unknown as Record<string, unknown>,
					completedAt: new Date(),
				})
				.where('id = :id AND status = :status AND "approvalToken" = :token', {
					id,
					status: StepStatus.WaitingApproval,
					token,
				})
				.execute();

			if (updateResult.affected === 0) {
				res.status(409).json({
					error: 'Approval already processed, step not waiting, or invalid token',
				});
				return;
			}

			// Emit step:completed event so event handlers plan next steps
			eventBus.emit({
				type: 'step:completed',
				executionId: step.executionId,
				stepId: step.stepId,
				output: mergedOutput,
				durationMs: 0,
				parentStepExecutionId: step.parentStepExecutionId ?? undefined,
			});

			res.status(200).json({
				status: 'completed',
				output: mergedOutput,
			});
		} catch (error) {
			res.status(500).json({ error: (error as Error).message });
		}
	});

	// POST /api/workflow-step-executions/:id/resume - Resume suspended agent step
	router.post('/:id/resume', async (req: Request, res: Response) => {
		try {
			const { id } = req.params;
			const { data } = req.body as { data: unknown };

			const step = await dataSource.getRepository(WorkflowStepExecution).findOneBy({ id });

			if (!step) {
				res.status(404).json({ error: 'Step execution not found' });
				return;
			}

			if (step.status !== StepStatus.Suspended) {
				res.status(409).json({
					error: `Step is not suspended (current status: ${step.status})`,
				});
				return;
			}

			// Set resume data in metadata and re-queue the step
			const metadata = (step.metadata as Record<string, unknown>) ?? {};
			await dataSource
				.getRepository(WorkflowStepExecution)
				.createQueryBuilder()
				.update(WorkflowStepExecution)
				.set({
					status: StepStatus.Queued,
					metadata: {
						...metadata,
						agentResumeData: data,
					},
				} as Record<string, unknown>)
				.where('id = :id AND status = :status', {
					id,
					status: StepStatus.Suspended,
				})
				.execute();

			// Emit step:agent_resumed event
			eventBus.emit({
				type: 'step:agent_resumed',
				executionId: step.executionId,
				stepId: step.stepId,
			});

			res.status(200).json({ status: 'queued' });
		} catch (error) {
			res.status(500).json({ error: (error as Error).message });
		}
	});

	return router;
}
