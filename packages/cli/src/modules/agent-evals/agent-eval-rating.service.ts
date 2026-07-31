import { AGENT_EVALS_FLAG, type CreateAgentEvalRatingPayload } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { AgentEvalRating, AgentEvalResult, User } from '@n8n/db';
import {
	AgentEvalDatasetRepository,
	AgentEvalRatingRepository,
	AgentEvalResultRepository,
	AgentEvalRunRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { Scope } from '@n8n/permissions';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { userHasScopes } from '@/permissions.ee/check-access';
import { PostHogClient } from '@/posthog';

// The body arrives straight from a request, so bound it before it hits the column.
const MAX_COMMENT_CHARS = 2_000;
const MAX_CORRECTION_TEXT_CHARS = 20_000;
const MAX_CORRECTION_CHARS = 32_000;

/**
 * A human's 👍/👎 on an eval result, with an optional comment and correction.
 * Corrections stay on the rating row (never the dataset); ratings are append-only.
 */
@Service()
export class AgentEvalRatingService {
	constructor(
		private readonly logger: Logger,
		private readonly ratingRepository: AgentEvalRatingRepository,
		private readonly resultRepository: AgentEvalResultRepository,
		private readonly runRepository: AgentEvalRunRepository,
		private readonly datasetRepository: AgentEvalDatasetRepository,
		private readonly agentRepository: AgentRepository,
		private readonly postHogClient: PostHogClient,
	) {}

	/** Authorization is enforced here too, so no caller can skip it. */
	async rateResult(
		user: User,
		projectId: string,
		resultId: string,
		payload: CreateAgentEvalRatingPayload,
	): Promise<AgentEvalRating> {
		await this.assertFeatureEnabled(user);
		// Execute, not update: a project viewer holds execute and can run the eval, and
		// the reviewer of a result is often not its builder.
		await this.assertProjectScopes(user, projectId, ['agent:execute']);
		assertPayloadWithinBounds(payload);

		const result = await this.resolveResultInProject(projectId, resultId);
		// A pending case has no output, so the vote would judge nothing. Errored and
		// cancelled stay rateable — "it failed" is a judgment.
		if (result.status === 'new' || result.status === 'running') {
			throw new BadRequestError('This case has not finished running yet.');
		}

		const rating = await this.ratingRepository.createRating({
			resultId: result.id,
			vote: payload.vote,
			comment: payload.comment ?? null,
			correction: payload.correction ?? null,
			ratedById: user.id,
		});

		this.logger.debug('Recorded agent eval rating', {
			resultId: result.id,
			vote: rating.vote,
			hasCorrection: rating.correction !== null,
		});

		return rating;
	}

	/** The per-case history, newest first. */
	async listRatingsForResult(
		user: User,
		projectId: string,
		resultId: string,
	): Promise<AgentEvalRating[]> {
		await this.assertFeatureEnabled(user);
		await this.assertProjectScopes(user, projectId, ['agent:read']);

		const result = await this.resolveResultInProject(projectId, resultId);

		return await this.ratingRepository.findByResultId(result.id);
	}

	/** What a reopened run renders, and the corrections calibration reads. */
	async listLatestRatingsForRun(
		user: User,
		projectId: string,
		runId: string,
	): Promise<AgentEvalRating[]> {
		await this.assertFeatureEnabled(user);
		await this.assertProjectScopes(user, projectId, ['agent:read']);

		await this.resolveRunInProject(projectId, runId);

		return await this.ratingRepository.findLatestByRunId(runId);
	}

	// ---- internals ----

	/**
	 * Not-found rather than forbidden, so a flag-off instance leaks no flag state
	 * (matching the case-generation gate).
	 */
	private async assertFeatureEnabled(user: User): Promise<void> {
		const flags = await this.postHogClient.getFeatureFlags(user);
		if (flags?.[AGENT_EVALS_FLAG] !== true) {
			throw new NotFoundError('Not found');
		}
	}

	/** Runs before any lookup, so unauthorized callers can't probe for ids. */
	private async assertProjectScopes(user: User, projectId: string, scopes: Scope[]): Promise<void> {
		if (!(await userHasScopes(user, scopes, false, { projectId }))) {
			throw new ForbiddenError('You do not have permission to review agent evals in this project.');
		}
	}

	private async resolveResultInProject(
		projectId: string,
		resultId: string,
	): Promise<AgentEvalResult> {
		const result = await this.resultRepository.findById(resultId);
		if (!result) throw new NotFoundError(`Agent eval result ${resultId} not found.`);

		await this.resolveRunInProject(projectId, result.runId);

		return result;
	}

	/**
	 * Walks run → dataset → agent to confirm project ownership. A run elsewhere reads
	 * as missing, not forbidden, so its existence doesn't leak.
	 */
	private async resolveRunInProject(projectId: string, runId: string): Promise<void> {
		const notFound = () => new NotFoundError(`Agent eval run ${runId} not found.`);

		const run = await this.runRepository.findById(runId);
		if (!run) throw notFound();

		const dataset = await this.datasetRepository.findById(run.datasetId);
		if (!dataset) throw notFound();

		// Existence only: `findByIdAndProjectId` would load `activeVersion` per rating.
		const inProject = await this.agentRepository.existsByIdAndProjectId(dataset.agentId, projectId);
		if (!inProject) throw notFound();
	}
}

/** Rejects rather than truncating: a silently clipped gold answer is worse. */
function assertPayloadWithinBounds(payload: CreateAgentEvalRatingPayload): void {
	if (payload.comment !== undefined && payload.comment.length > MAX_COMMENT_CHARS) {
		throw new BadRequestError(`A rating comment cannot exceed ${MAX_COMMENT_CHARS} characters.`);
	}

	const { correction } = payload;
	if (correction === undefined) return;

	// Required, not optional: a correction without a readable `finalText` records an
	// edit that calibration can never compare against the agent's answer.
	const finalText = correction.finalText;
	if (typeof finalText !== 'string' || finalText.trim().length === 0) {
		throw new BadRequestError("A correction must carry the edited answer in 'finalText'.");
	}
	if (finalText.length > MAX_CORRECTION_TEXT_CHARS) {
		throw new BadRequestError(
			`A corrected answer cannot exceed ${MAX_CORRECTION_TEXT_CHARS} characters.`,
		);
	}
	if (JSON.stringify(correction).length > MAX_CORRECTION_CHARS) {
		throw new BadRequestError(
			`A correction cannot exceed ${MAX_CORRECTION_CHARS} characters in total.`,
		);
	}
}
