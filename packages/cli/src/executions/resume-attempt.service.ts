import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { ExecutionAlreadyResumingError } from '@/errors/execution-already-resuming.error';
import { ExecutionCrashService } from '@/executions/execution-crash.service';

export type ResumableStatus = 'waiting' | 'new';

/** A granted claim carries the attempt number, which `release` needs to give it back. */
export type ResumeClaim = { granted: true; attempt: number } | { granted: false };

/**
 * Bounds how many times a parked execution is loaded into memory. A resume of a `waiting`
 * execution and a start of a `new` one both load the full run data first, and the row keeps
 * its status until the load completes. If the load kills the process, nothing in the row
 * says so, and the next start loads it again, without limit. This service claims an attempt
 * in the database before each load and marks the execution as crashed once the attempts
 * are used up.
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
	 * Claims one attempt to load the execution. A refused claim means the attempts are used
	 * up: the execution is then marked as crashed and the caller must not load it. Throws
	 * `ExecutionAlreadyResumingError` when the row has left `status`, for example because
	 * another process claimed it first.
	 */
	async claim(executionId: string, status: ResumableStatus): Promise<ResumeClaim> {
		const limit = this.executionsConfig.recovery.maxResumeAttempts;
		if (limit <= 0) return { granted: true, attempt: 0 };

		const claim = await this.executionRepository.claimResumeAttempt(executionId, status, limit);

		if (claim.outcome === 'conflict') throw new ExecutionAlreadyResumingError(executionId);

		if (claim.outcome === 'exhausted') {
			this.logger.warn('Marking execution as crashed because its load attempts are used up', {
				executionId,
				status,
				attempts: claim.attempts,
				limit,
				jsonSizeBytes: claim.jsonSizeBytes,
			});
			await this.executionCrashService.markParkedAsCrashed(
				executionId,
				status,
				'resume-limit',
				claim.attempts,
			);
			return { granted: false };
		}

		this.logger.debug('Claimed an attempt to load execution', {
			executionId,
			status,
			attempts: claim.attempts,
			limit,
		});
		return { granted: true, attempt: claim.attempts };
	}

	/**
	 * Gives back a claimed attempt, for a load that ended without a resume. A failed release
	 * only leaves the count one higher, so it is logged and not thrown.
	 */
	async release(executionId: string, status: ResumableStatus, attempt: number) {
		if (attempt <= 0) return;

		try {
			await this.executionRepository.releaseResumeAttempt(executionId, status, attempt);
		} catch (error) {
			this.logger.warn('Failed to give back a load attempt', {
				executionId,
				status,
				attempt,
				error: ensureError(error).message,
			});
		}
	}
}
