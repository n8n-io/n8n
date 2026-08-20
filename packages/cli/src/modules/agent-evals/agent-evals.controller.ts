import {
	AgentEvalRunDetailQueryDto,
	CreateAgentEvalRatingDto,
	CreateAgentEvalRunDto,
	GenerateDraftCasesOptionsDto,
	PaginationDto,
	UpdateAgentEvalDatasetDto,
	createAgentEvalDatasetSchema,
	type AgentEvalDatasetRecord,
	type AgentEvalRatingRecord,
	type AgentEvalRunDetail,
	type AgentEvalRunList,
	type AgentEvalRunRecord,
	type AgentEvalRunSummary,
	type GenerateDraftCasesResult,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	Patch,
	Post,
	ProjectScope,
	Query,
	RestController,
} from '@n8n/decorators';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { AgentEvalRatingService } from './agent-eval-rating.service';
import { AgentEvalService } from './agent-eval.service';
import { AgentEvalsFlagGate } from './agent-evals-flag-gate';

type AgentParam = { projectId: string; agentId: string };
type DatasetParam = AgentParam & { datasetId: string };
type RunParam = AgentParam & { runId: string };
type ResultParam = AgentParam & { resultId: string };

/**
 * REST surface for agent evals: generation, datasets, runs, per-case results and
 * the human ratings of them. Nested under the agent so `@ProjectScope` rejects
 * before the handler runs.
 *
 * **This is the single enforcement point** for both the project scope and the
 * `101_agent_evals` rollout — the services behind it check neither, so a route
 * added here without a scope decorator and a `flagGate` call is an open one.
 *
 * `agent:read` for reads, `agent:execute` for starting a run, `agent:update` for
 * eval-config writes — including generation, which spends the builder's model
 * credits, and cancellation, which acts on a run someone else started. Both must
 * stay closed to viewers, who hold `agent:execute`.
 *
 * Paged reads answer with `{ count, data }`, where `count` is the total.
 */
@RestController('/projects/:projectId/agents/v2')
export class AgentEvalsController {
	constructor(
		private readonly service: AgentEvalService,
		private readonly ratingService: AgentEvalRatingService,
		private readonly flagGate: AgentEvalsFlagGate,
	) {}

	// ---- datasets ----

	@Get('/:agentId/evals/datasets')
	@ProjectScope('agent:read')
	async listDatasets(req: AuthenticatedRequest<AgentParam>): Promise<AgentEvalDatasetRecord[]> {
		await this.flagGate.assertEnabled(req.user);
		const { agentId, projectId } = req.params;
		return await this.service.listDatasets(agentId, projectId);
	}

	@Post('/:agentId/evals/datasets')
	@ProjectScope('agent:update')
	async createDataset(req: AuthenticatedRequest<AgentParam>): Promise<AgentEvalDatasetRecord> {
		await this.flagGate.assertEnabled(req.user);
		const { agentId, projectId } = req.params;
		// Hand-parsed, not `@Body`-bound: the `DatasetRef` union can't be expressed as
		// a `Z.class`, so this DTO ships as a schema and the handler owns the 400.
		const parsed = createAgentEvalDatasetSchema.safeParse(req.body);
		if (!parsed.success) {
			throw new BadRequestError(parsed.error.issues.map((i) => i.message).join(', '));
		}
		return await this.service.createDataset(req.user, agentId, projectId, parsed.data);
	}

	@Get('/:agentId/evals/datasets/:datasetId')
	@ProjectScope('agent:read')
	async getDataset(req: AuthenticatedRequest<DatasetParam>): Promise<AgentEvalDatasetRecord> {
		await this.flagGate.assertEnabled(req.user);
		const { agentId, projectId, datasetId } = req.params;
		return await this.service.getDataset(agentId, projectId, datasetId);
	}

	@Patch('/:agentId/evals/datasets/:datasetId')
	@ProjectScope('agent:update')
	async updateDataset(
		req: AuthenticatedRequest<DatasetParam>,
		_res: unknown,
		@Body payload: UpdateAgentEvalDatasetDto,
	): Promise<AgentEvalDatasetRecord> {
		await this.flagGate.assertEnabled(req.user);
		const { agentId, projectId, datasetId } = req.params;
		return await this.service.updateDataset(agentId, projectId, datasetId, payload);
	}

	@Delete('/:agentId/evals/datasets/:datasetId')
	@ProjectScope('agent:update')
	async deleteDataset(req: AuthenticatedRequest<DatasetParam>): Promise<{ success: true }> {
		await this.flagGate.assertEnabled(req.user);
		const { agentId, projectId, datasetId } = req.params;
		await this.service.deleteDataset(agentId, projectId, datasetId);
		return { success: true };
	}

	// ---- case generation ----

	// Drafts cases from the agent's config into a new dataset, calling the agent's
	// model with its own credential — hence never on a read-only scope.
	@Post('/:agentId/evals/generate')
	@ProjectScope('agent:update')
	async generateDraftCases(
		req: AuthenticatedRequest<AgentParam>,
		_res: unknown,
		@Body payload: GenerateDraftCasesOptionsDto,
	): Promise<GenerateDraftCasesResult> {
		await this.flagGate.assertEnabled(req.user);
		const { agentId, projectId } = req.params;
		return await this.service.generateDraftCases(req.user, agentId, projectId, payload);
	}

	// ---- runs ----

	/** Returns as soon as the run is seeded; poll the summary route for progress. */
	@Post('/:agentId/evals/datasets/:datasetId/runs')
	@ProjectScope('agent:execute')
	async startRun(
		req: AuthenticatedRequest<DatasetParam>,
		_res: unknown,
		@Body payload: CreateAgentEvalRunDto,
	): Promise<AgentEvalRunRecord> {
		await this.flagGate.assertEnabled(req.user);
		const { agentId, projectId, datasetId } = req.params;
		return await this.service.startRun(req.user, agentId, projectId, datasetId, payload);
	}

	/** Newest first. Unbounded over a dataset's life, so the window is required. */
	@Get('/:agentId/evals/datasets/:datasetId/runs')
	@ProjectScope('agent:read')
	async listRuns(
		req: AuthenticatedRequest<DatasetParam>,
		_res: unknown,
		@Query query: PaginationDto,
	): Promise<AgentEvalRunList> {
		await this.flagGate.assertEnabled(req.user);
		const { agentId, projectId, datasetId } = req.params;
		return await this.service.listRuns(agentId, projectId, datasetId, query);
	}

	/** `take`/`skip` page the run's cases, not the run itself. */
	@Get('/:agentId/evals/runs/:runId')
	@ProjectScope('agent:read')
	async getRun(
		req: AuthenticatedRequest<RunParam>,
		_res: unknown,
		@Query query: AgentEvalRunDetailQueryDto,
	): Promise<AgentEvalRunDetail> {
		await this.flagGate.assertEnabled(req.user);
		const { agentId, projectId, runId } = req.params;
		return await this.service.getRunDetail(agentId, projectId, runId, query);
	}

	/** Counts only — cheap enough for the UI to poll while a run is in flight. */
	@Get('/:agentId/evals/runs/:runId/summary')
	@ProjectScope('agent:read')
	async getRunSummary(req: AuthenticatedRequest<RunParam>): Promise<AgentEvalRunSummary> {
		await this.flagGate.assertEnabled(req.user);
		const { agentId, projectId, runId } = req.params;
		return await this.service.getRunSummary(agentId, projectId, runId);
	}

	// Cancelling stops work someone else started, so it's a write, not an
	// execution — and `agent:execute` is all a chat-only user holds.
	@Post('/:agentId/evals/runs/:runId/cancel')
	@ProjectScope('agent:update')
	async cancelRun(req: AuthenticatedRequest<RunParam>): Promise<AgentEvalRunRecord> {
		await this.flagGate.assertEnabled(req.user);
		const { agentId, projectId, runId } = req.params;
		return await this.service.cancelRun(agentId, projectId, runId);
	}

	// ---- ratings ----

	/**
	 * `agent:update`, not `agent:execute`: the chat-user role holds execute and
	 * nothing else, and a rating — especially a correction, which seeds later judge
	 * calibration — is eval config a chat-only member has no business writing.
	 */
	@Post('/:agentId/evals/results/:resultId/ratings')
	@ProjectScope('agent:update')
	async rateResult(
		req: AuthenticatedRequest<ResultParam>,
		_res: unknown,
		@Body payload: CreateAgentEvalRatingDto,
	): Promise<AgentEvalRatingRecord> {
		await this.flagGate.assertEnabled(req.user);
		const { agentId, projectId, resultId } = req.params;
		return await this.ratingService.rateResult(req.user, agentId, projectId, resultId, payload);
	}

	/** Ratings are append-only, so this is the case's full history, newest first. */
	@Get('/:agentId/evals/results/:resultId/ratings')
	@ProjectScope('agent:read')
	async listRatingsForResult(
		req: AuthenticatedRequest<ResultParam>,
	): Promise<AgentEvalRatingRecord[]> {
		await this.flagGate.assertEnabled(req.user);
		const { agentId, projectId, resultId } = req.params;
		return await this.ratingService.listRatingsForResult(agentId, projectId, resultId);
	}

	/**
	 * Newest rating per rated case — what reopening a run renders. Not every rating
	 * in the run: superseded votes stay on record but are the per-case route's job.
	 */
	@Get('/:agentId/evals/runs/:runId/ratings')
	@ProjectScope('agent:read')
	async listLatestRatingsForRun(
		req: AuthenticatedRequest<RunParam>,
	): Promise<AgentEvalRatingRecord[]> {
		await this.flagGate.assertEnabled(req.user);
		const { agentId, projectId, runId } = req.params;
		return await this.ratingService.listLatestRatingsForRun(agentId, projectId, runId);
	}
}
