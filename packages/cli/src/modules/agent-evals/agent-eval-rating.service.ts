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

// The rating body reaches this service straight from a request, so bound it
// before it lands in a text/JSON column. `finalText` carries the edited answer;
// the outer cap leaves headroom for the other keys a correction may mirror.
const MAX_COMMENT_CHARS = 2_000;
const MAX_CORRECTION_TEXT_CHARS = 20_000;
const MAX_CORRECTION_CHARS = 32_000;

/**
 * Records and reads back a human's judgment of an eval result: a 👍/👎 vote, an
 * optional comment, and an optional correction — the edited "should have been"
 * answer. The highest-value signal in the flow, and what a later calibration
 * pass measures a judge against.
 *
 * **Edit capture is rating-scoped.** A correction is stored on the rating row
 * only; it is deliberately *not* written back to the dataset row as that case's
 * expected output, so an edit does not become the reference answer for later
 * runs. The product decision there is still open, so this takes the narrower
 * behavior — calibration reads corrections from these rows.
 *
 * **Ratings are append-only.** A result may hold several (re-voting is history,
 * not an overwrite, so a flipped judgment stays auditable), which is why the
 * run-level read returns the newest rating per result.
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

	/**
	 * Record a vote (and optional correction) against a result. Authorization is
	 * enforced here — the project scope *and* the result belonging to that
	 * project — so no caller can skip it; the REST layer adds its own scope
	 * decorator on top.
	 */
	async rateResult(
		user: User,
		projectId: string,
		resultId: string,
		payload: CreateAgentEvalRatingPayload,
	): Promise<AgentEvalRating> {
		await this.assertFeatureEnabled(user);
		// `agent:execute`, not `agent:update`: a project viewer holds execute (so the
		// runner lets them test-drive an agent) but not update, and the reviewer of a
		// result is often not its builder. Matches how the runner gates a run, and how
		// execution annotations treat a vote as metadata rather than a mutation.
		await this.assertProjectScopes(user, projectId, ['agent:execute']);
		assertPayloadWithinBounds(payload);

		const result = await this.resolveResultInProject(projectId, resultId);
		// A pending case has no output to judge, so a vote on it would seed
		// calibration with a verdict about nothing. Errored and cancelled cases stay
		// rateable — "it failed" is a legitimate judgment.
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

	/** Every rating on a single result, newest first — the per-case history. */
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

	/**
	 * The newest rating per result across a run: what the review view renders when
	 * a reviewed run is reopened, and the corrections available for calibration.
	 */
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
	 * Gate on the agent-evals rollout flag (honors the env override). Throws
	 * NotFoundError rather than Forbidden so a flag-off instance looks like an
	 * unknown feature and leaks no flag state (matching the case-generation gate).
	 */
	private async assertFeatureEnabled(user: User): Promise<void> {
		const flags = await this.postHogClient.getFeatureFlags(user);
		if (flags?.[AGENT_EVALS_FLAG] !== true) {
			throw new NotFoundError('Not found');
		}
	}

	/**
	 * Authorize before touching the eval tables, so a caller without access to the
	 * project can't probe which result or run ids exist.
	 */
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
	 * Walk run → dataset → agent to confirm the run belongs to `projectId`. A run
	 * in another project reads as missing rather than forbidden, so its existence
	 * doesn't leak.
	 */
	private async resolveRunInProject(projectId: string, runId: string): Promise<void> {
		const notFound = () => new NotFoundError(`Agent eval run ${runId} not found.`);

		const run = await this.runRepository.findById(runId);
		if (!run) throw notFound();

		const dataset = await this.datasetRepository.findById(run.datasetId);
		if (!dataset) throw notFound();

		// Existence only — `findByIdAndProjectId` eagerly loads `activeVersion` for the
		// frontend's publish state, which this path would pull on every rating.
		const inProject = await this.agentRepository.existsByIdAndProjectId(dataset.agentId, projectId);
		if (!inProject) throw notFound();
	}
}

/**
 * Bound the untrusted parts of the body. Rejects rather than truncating: a
 * silently clipped gold answer is worse than a failed request, since the whole
 * point of the correction is that it is the answer the user signed off on.
 */
function assertPayloadWithinBounds(payload: CreateAgentEvalRatingPayload): void {
	if (payload.comment !== undefined && payload.comment.length > MAX_COMMENT_CHARS) {
		throw new BadRequestError(`A rating comment cannot exceed ${MAX_COMMENT_CHARS} characters.`);
	}

	const { correction } = payload;
	if (correction === undefined) return;

	// `finalText` mirrors the key the runner writes into a result's output, so the
	// corrected answer stays diffable against what the agent actually said.
	if ('finalText' in correction) {
		const finalText = correction.finalText;
		if (finalText !== null && typeof finalText !== 'string') {
			throw new BadRequestError("A correction's 'finalText' must be a string.");
		}
		if (typeof finalText === 'string' && finalText.length > MAX_CORRECTION_TEXT_CHARS) {
			throw new BadRequestError(
				`A corrected answer cannot exceed ${MAX_CORRECTION_TEXT_CHARS} characters.`,
			);
		}
	}
	if (JSON.stringify(correction).length > MAX_CORRECTION_CHARS) {
		throw new BadRequestError(
			`A correction cannot exceed ${MAX_CORRECTION_CHARS} characters in total.`,
		);
	}
}
