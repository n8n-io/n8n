import { Get, Post, RestController } from '@n8n/decorators';
import { Service } from '@n8n/di';
import type { Request, Response } from 'express';

interface NodeSettings {
	continueOnFail: boolean;
	retryOnFail: boolean;
	maxTries: number;
	waitBetweenTries: number;
}

interface ExecutionResult {
	nodeResults: Array<{
		nodeName: string;
		status: 'success' | 'error';
		attempts: number;
		error?: string;
		data?: unknown;
	}>;
	workflowStatus: 'success' | 'error';
	totalRetries: number;
}

/**
 * Scenario 3: Error Handling and Retry
 *
 * Simulates node execution with retry logic and error handling:
 * - Retry with exponential backoff
 * - Max retries enforced (1-5)
 * - continueOnFail: workflow continues with empty data
 * - Error details stored in execution
 */
@Service()
class ErrorHandlingService {
	async executeWithRetry(
		nodeName: string,
		shouldFail: boolean,
		settings: NodeSettings,
	): Promise<ExecutionResult['nodeResults'][0]> {
		const maxTries = Math.min(Math.max(settings.maxTries, 1), 5);
		let attempts = 0;
		let lastError: string | undefined;

		for (let i = 0; i < maxTries; i++) {
			attempts++;

			if (!shouldFail || (settings.retryOnFail && i === maxTries - 1 && !shouldFail)) {
				return { nodeName, status: 'success', attempts, data: { result: 'ok' } };
			}

			if (shouldFail) {
				lastError = `Node "${nodeName}" failed on attempt ${attempts}`;

				if (!settings.retryOnFail) break;

				// Exponential backoff: wait × 2^attempt (simulated, not actually waiting)
				const _backoff = settings.waitBetweenTries * Math.pow(2, i);
			}
		}

		return { nodeName, status: 'error', attempts, error: lastError };
	}

	async simulateWorkflow(nodes: Array<{
		name: string;
		shouldFail: boolean;
		settings: NodeSettings;
	}>): Promise<ExecutionResult> {
		const nodeResults: ExecutionResult['nodeResults'] = [];
		let totalRetries = 0;

		for (const node of nodes) {
			const result = await this.executeWithRetry(
				node.name,
				node.shouldFail,
				node.settings,
			);
			nodeResults.push(result);
			totalRetries += result.attempts - 1;

			if (result.status === 'error' && !node.settings.continueOnFail) {
				return { nodeResults, workflowStatus: 'error', totalRetries };
			}

			// If continueOnFail, continue with empty data marker
			if (result.status === 'error' && node.settings.continueOnFail) {
				result.data = { continueOnFail: true, originalError: result.error };
			}
		}

		return { nodeResults, workflowStatus: 'success', totalRetries };
	}
}

@RestController('/scenario/error-handling')
export class ScenarioErrorHandlingController {
	constructor(private readonly service: ErrorHandlingService) {}

	/** POST /scenario/error-handling/execute - Execute nodes with error handling */
	@Post('/execute', { skipAuth: true })
	async execute(req: Request, _res: Response) {
		const { nodes } = req.body as {
			nodes: Array<{
				name: string;
				shouldFail: boolean;
				settings: NodeSettings;
			}>;
		};
		return await this.service.simulateWorkflow(nodes);
	}

	/** GET /scenario/error-handling/retry-demo - Demo retry with backoff */
	@Get('/retry-demo', { skipAuth: true })
	async retryDemo(_req: Request, _res: Response) {
		return await this.service.simulateWorkflow([
			{
				name: 'RetryNode',
				shouldFail: true,
				settings: { continueOnFail: false, retryOnFail: true, maxTries: 3, waitBetweenTries: 1 },
			},
		]);
	}

	/** GET /scenario/error-handling/continue-demo - Demo continueOnFail */
	@Get('/continue-demo', { skipAuth: true })
	async continueDemo(_req: Request, _res: Response) {
		return await this.service.simulateWorkflow([
			{
				name: 'FailingNode',
				shouldFail: true,
				settings: { continueOnFail: true, retryOnFail: false, maxTries: 1, waitBetweenTries: 0 },
			},
			{
				name: 'NextNode',
				shouldFail: false,
				settings: { continueOnFail: false, retryOnFail: false, maxTries: 1, waitBetweenTries: 0 },
			},
		]);
	}
}
