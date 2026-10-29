import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';

import { ExecutionAlreadyResumingError } from '@/errors/execution-already-resuming.error';
import { ExecutionCrashService } from '@/executions/execution-crash.service';

export type ResumableStatus = 'waiting' | 'new';

/** A granted claim carries its attempt number, which `release` needs. */
export type ResumeClaim = { granted: true; attempt: number } | { granted: false };

/**
 * Bounds how often an execution is resumed from `waiting` or `new`. A resume loads the full
 * run data while the row keeps its status, so a resume that kills the process repeats on
 * every start. This service claims an attempt in the database before each resume and marks
 * the execution as crashed once the attempts are used up.
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
	 * Claims one resume attempt. A refused claim means the attempts are used up: the
	 * execution is then marked as crashed and the caller must not resume it. Throws
	 * `ExecutionAlreadyResumingError` when the row has left `status`.
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

	/** Gives back a claimed attempt. A failed release is logged, not thrown. */
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
