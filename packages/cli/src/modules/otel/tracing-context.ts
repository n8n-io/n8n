import { Logger } from '@n8n/backend-common';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { createHash } from 'node:crypto';

export type TracingContext = { traceparent: string; tracestate?: string };

@Service()
export class TraceContextService {
	constructor(
		private readonly executionRepository: ExecutionRepository,
		private readonly logger: Logger,
	) {}

	/**
	 * Seed tracing context for an execution.
	 * - If `inbound` is provided (from webhook headers), persist it.
	 * - Otherwise, generate a deterministic traceparent from the executionId.
	 * Persists to DB so it can be read by any process (queue mode worker).
	 */
	async seed(executionId: string, inbound?: TracingContext): Promise<TracingContext> {
		try {
			const tracingContext: TracingContext = inbound ?? {
				traceparent: TraceContextService.deterministicTraceparent(executionId),
			};

			await this.executionRepository.update(executionId, { tracingContext });

			return tracingContext;
		} catch (error) {
			this.logger.error('Failed to seed tracing context', {
				executionId,
				error: error instanceof Error ? error.message : String(error),
			});

			// Return a context even if persistence fails so spans can still be created
			return (
				inbound ?? {
					traceparent: TraceContextService.deterministicTraceparent(executionId),
				}
			);
		}
	}

	/**
	 * Get tracing context for an execution from the DB.
	 */
	async get(executionId: string): Promise<TracingContext | null> {
		try {
			const execution = await this.executionRepository.findOne({
				where: { id: executionId },
				select: ['tracingContext'],
			});
			return execution?.tracingContext ?? null;
		} catch (error) {
			this.logger.error('Failed to load tracing context', {
				executionId,
				error: error instanceof Error ? error.message : String(error),
			});
			return null;
		}
	}

	/**
	 * Generate a deterministic W3C traceparent from an executionId.
	 *
	 * Format: 00-{trace-id}-{parent-id}-01
	 *   trace-id  = sha256(executionId)[0..32]   (32 hex chars = 16 bytes)
	 *   parent-id = sha256(executionId)[32..48]   (16 hex chars = 8 bytes)
	 *   flags     = 01 (sampled)
	 */
	static deterministicTraceparent(executionId: string): string {
		const hash = createHash('sha256').update(executionId).digest('hex');
		const traceId = hash.slice(0, 32);
		const parentId = hash.slice(32, 48);
		return `00-${traceId}-${parentId}-01`;
	}
}
