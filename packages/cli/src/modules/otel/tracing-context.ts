import { Logger } from '@n8n/backend-common';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';

export type TracingContext = { traceparent: string; tracestate?: string };

@Service()
export class TraceContextService {
	constructor(
		private readonly executionRepository: ExecutionRepository,
		private readonly logger: Logger,
	) {}

	/**
	 * Persist tracing context for an execution.
	 * Stored in DB so it can be read by any process (queue mode worker).
	 */
	async persist(executionId: string, tracingContext: TracingContext): Promise<void> {
		try {
			await this.executionRepository.update(executionId, { tracingContext });
		} catch (error) {
			this.logger.error('Failed to persist tracing context', {
				executionId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Get tracing context for an execution from the DB.
	 */
	async get(executionId: string): Promise<TracingContext | undefined> {
		try {
			const execution = await this.executionRepository.findOne({
				where: { id: executionId },
				select: ['tracingContext'],
			});
			return execution?.tracingContext ?? undefined;
		} catch (error) {
			this.logger.error('Failed to load tracing context', {
				executionId,
				error: error instanceof Error ? error.message : String(error),
			});
			return undefined;
		}
	}
}
