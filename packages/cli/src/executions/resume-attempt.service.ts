import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { ExecutionAlreadyResumingError } from '@/errors/execution-already-resuming.error';
import { ExecutionCrashService } from '@/executions/execution-crash.service';

export type ResumableStatus = 'waiting' | 'new';

export type ResumeClaim = { granted: true; attempt: number } | { granted: false };

/**
 * Limits how many times a `waiting` or `new` execution is loaded. The row keeps its status
 * while its run data loads, so a load that kills the process repeats on every start. This
 * service counts each load in the database before it starts and marks the execution
 * `crashed` once the count reaches the limit.
 */
@Service()
export class ResumeAttemptService {
	constructor(
		private readonly logger: Logger,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly executionRepository: ExecutionRepository,
		private readonly executionCrashService: ExecutionCrashService,
	) {}

	/**
	 * Counts one load. Once the limit is reached it marks the execution `crashed` instead and
	 * refuses. Throws `ExecutionAlreadyResumingError` when the row has left `status`.
	 */
	async claim(executionId: string, status: ResumableStatus): Promise<ResumeClaim> {
		const limit = this.executionsConfig.recovery.maxResumeAttempts;
		if (limit <= 0) return { granted: true, attempt: 0 };

		const claim = await this.executionRepository.claimResumeAttempt(executionId, status, limit);

		if (claim.outcome === 'conflict') throw new ExecutionAlreadyResumingError(executionId);

		if (claim.outcome === 'exhausted') {
			this.logger.warn('Marking execution as crashed because its resume attempts are used up', {
				executionId,
				status,
				attempts: claim.attempts,
				limit,
				jsonSizeBytes: claim.jsonSizeBytes,
			});
			await this.executionCrashService.markAsCrashedFrom(
				executionId,
				status,
				'resume-limit',
				claim.attempts,
			);
			return { granted: false };
		}

		this.logger.debug('Claimed a resume attempt', {
			executionId,
			status,
			attempts: claim.attempts,
			limit,
		});
		return { granted: true, attempt: claim.attempts };
	}

	/** Gives back an attempt. A failure is logged, not thrown. */
	async release(executionId: string, status: ResumableStatus, attempt: number) {
		if (attempt <= 0) return;

		try {
			await this.executionRepository.releaseResumeAttempt(executionId, status, attempt);
		} catch (error) {
			this.logger.warn('Failed to give back a resume attempt', {
				executionId,
				status,
				attempt,
				error: ensureError(error).message,
			});
		}
	}
}
