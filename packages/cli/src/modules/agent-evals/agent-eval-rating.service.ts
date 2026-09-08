import type { AgentEvalRatingRecord, CreateAgentEvalRatingPayload } from '@n8n/api-types';
import { AGENT_EVAL_MAX_COMMENT_CHARS, AGENT_EVAL_MAX_CORRECTION_TEXT_CHARS } from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { AgentEvalResult, User } from '@n8n/db';
import {
	AgentEvalRatingRepository,
	AgentEvalResultRepository,
	AgentEvalRunRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import { toRatingRecord } from './agent-eval-record-mappers';
import { assertRequiredModulesActive } from './agent-evals-required-modules';

// The body arrives straight from a request, so bound it before it hits the column.
// The per-field limits are shared with the editor so it can cap its inputs at the
// same numbers; the total stays here because it bounds the serialized blob, which
// a client can't usefully pre-check.
const MAX_CORRECTION_CHARS = 32_000;

/**
 * A human's 👍/👎 on an eval result, with an optional comment and correction.
 * Corrections stay on the rating row (never the dataset); ratings are append-only.
 *
 * **Every method is agent-scoped, and none of them authorizes.** As in the
 * sibling `AgentEvalService`, the project scope and the rollout flag are the
 * controller's to enforce — reach this service any other way and it checks
 * neither. What it does own is ownership: `@ProjectScope` proves the caller may
 * act on `:projectId`, not that the addressed agent lives there nor that a
 * result/run id belongs to it, so each entry point resolves `(agentId,
 * projectId)` and then reads through agent-filtered queries. A result on a
 * sibling agent 404s like a missing one.
 */
@Service()
export class AgentEvalRatingService {
	constructor(
		private readonly logger: Logger,
		private readonly moduleRegistry: ModuleRegistry,
		private readonly ratingRepository: AgentEvalRatingRepository,
		private readonly resultRepository: AgentEvalResultRepository,
		private readonly runRepository: AgentEvalRunRepository,
		private readonly agentRepository: AgentRepository,
	) {}

	async rateResult(
		user: User,
		agentId: string,
		projectId: string,
		resultId: string,
		payload: CreateAgentEvalRatingPayload,
	): Promise<AgentEvalRatingRecord> {
		await this.assertAgentInProject(agentId, projectId);
		assertPayloadWithinBounds(payload);

		const result = await this.resolveResult(agentId, resultId);
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

		return toRatingRecord(rating);
	}

	/** The per-case history, newest first. */
	async listRatingsForResult(
		agentId: string,
		projectId: string,
		resultId: string,
	): Promise<AgentEvalRatingRecord[]> {
		await this.assertAgentInProject(agentId, projectId);

		const result = await this.resolveResult(agentId, resultId);
		const ratings = await this.ratingRepository.findByResultId(result.id);

		return ratings.map(toRatingRecord);
	}

	/** What a reopened run renders, and the corrections calibration reads. */
	async listLatestRatingsForRun(
		agentId: string,
		projectId: string,
		runId: string,
	): Promise<AgentEvalRatingRecord[]> {
		await this.assertAgentInProject(agentId, projectId);

		await this.resolveRun(agentId, runId);
		const ratings = await this.ratingRepository.findLatestByRunId(runId);

		return ratings.map(toRatingRecord);
	}

	// ---- internals ----

	/**
	 * Stops a caller with access to one project from addressing an agent in another,
	 * which `@ProjectScope` alone cannot. Existence only: `findByIdAndProjectId`
	 * would load `activeVersion` on every rating call.
	 *
	 * Every public method starts here, which makes it the one place to assert the
	 * modules this one depends on — before the agent lookup that would otherwise
	 * fail as a TypeORM missing-metadata error.
	 */
	private async assertAgentInProject(agentId: string, projectId: string): Promise<void> {
		assertRequiredModulesActive(this.moduleRegistry);
		const inProject = await this.agentRepository.existsByIdAndProjectId(agentId, projectId);
		if (!inProject) throw new NotFoundError(`Agent ${agentId} not found.`);
	}

	/**
	 * A result is owned through its run, so this resolves the run agent-filtered
	 * rather than trusting a bare result id. A result on a sibling agent reads as
	 * missing, not forbidden, so its existence doesn't leak.
	 */
	private async resolveResult(agentId: string, resultId: string): Promise<AgentEvalResult> {
		const notFound = () => new NotFoundError(`Agent eval result ${resultId} not found.`);

		const result = await this.resultRepository.findById(resultId);
		if (!result) throw notFound();

		// Reported against the result, not the run: the run id is an internal detail
		// the caller never named, so surfacing it would leak more than it explains.
		const run = await this.runRepository.findByIdAndAgentId(result.runId, agentId);
		if (!run) throw notFound();

		return result;
	}

	/** The run's own agent scoping — `findByIdAndAgentId` walks run → dataset → agent. */
	private async resolveRun(agentId: string, runId: string): Promise<void> {
		const run = await this.runRepository.findByIdAndAgentId(runId, agentId);
		if (!run) throw new NotFoundError(`Agent eval run ${runId} not found.`);
	}
}

/** Rejects rather than truncating: a silently clipped gold answer is worse. */
function assertPayloadWithinBounds(payload: CreateAgentEvalRatingPayload): void {
	if (payload.comment !== undefined && payload.comment.length > AGENT_EVAL_MAX_COMMENT_CHARS) {
		throw new BadRequestError(
			`A rating comment cannot exceed ${AGENT_EVAL_MAX_COMMENT_CHARS} characters.`,
		);
	}

	const { correction } = payload;
	if (correction === undefined) return;

	// Required, not optional: a correction without a readable `finalText` records an
	// edit that calibration can never compare against the agent's answer.
	const finalText = correction.finalText;
	if (typeof finalText !== 'string' || finalText.trim().length === 0) {
		throw new BadRequestError("A correction must carry the edited answer in 'finalText'.");
	}
	if (finalText.length > AGENT_EVAL_MAX_CORRECTION_TEXT_CHARS) {
		throw new BadRequestError(
			`A corrected answer cannot exceed ${AGENT_EVAL_MAX_CORRECTION_TEXT_CHARS} characters.`,
		);
	}
	if (JSON.stringify(correction).length > MAX_CORRECTION_CHARS) {
		throw new BadRequestError(
			`A correction cannot exceed ${MAX_CORRECTION_CHARS} characters in total.`,
		);
	}
}
