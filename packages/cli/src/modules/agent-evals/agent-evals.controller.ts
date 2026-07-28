import {
	CreateAgentEvalRunDto,
	GenerateDraftCasesOptionsDto,
	UpdateAgentEvalDatasetDto,
	createAgentEvalDatasetSchema,
	type AgentEvalDatasetRecord,
	type AgentEvalRunDetail,
	type AgentEvalRunRecord,
	type GenerateDraftCasesResult,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Patch, Post, ProjectScope, RestController } from '@n8n/decorators';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { AgentEvalRunSummary } from './agent-eval-runner.service';
import { AgentEvalService } from './agent-eval.service';
import { AgentEvalsFlagGate } from './agent-evals-flag-gate';

type AgentParam = { projectId: string; agentId: string };
type DatasetParam = AgentParam & { datasetId: string };
type RunParam = AgentParam & { runId: string };

/**
 * REST surface for agent evals: draft-case generation, datasets, runs, and
 * per-case results.
 *
 * Nested under the agent so `@ProjectScope` can resolve the project straight
 * from `:projectId` and reject before the handler runs. Scope choices mirror the
 * agent's own controllers: `agent:read` for every read, `agent:execute` for
 * starting and cancelling a run (it really does execute the agent, the same
 * capability a project viewer already has), and `agent:update` for anything that
 * writes eval configuration — including case generation, which creates a Data
 * Table and spends the builder's own model credits, so it must not be open to
 * viewers.
 *
 * Ratings live on their own route in a follow-up, together with the service that
 * persists them.
 */
@RestController('/projects/:projectId/agents/v2')
export class AgentEvalsController {
	constructor(
		private readonly service: AgentEvalService,
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
		// Hand-parsed rather than bound via `@Body`: the body carries the
		// `DatasetRef` discriminated union, which `Z.class` (flat shapes only)
		// can't express, so this DTO ships as a schema instead of a class.
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

	/**
	 * Drafts cases from the agent's own config and persists them as a new dataset.
	 * Calls the agent's model with the agent's credential, so it is never exposed
	 * on a read-only scope.
	 */
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

	@Get('/:agentId/evals/datasets/:datasetId/runs')
	@ProjectScope('agent:read')
	async listRuns(req: AuthenticatedRequest<DatasetParam>): Promise<AgentEvalRunRecord[]> {
		await this.flagGate.assertEnabled(req.user);
		const { agentId, projectId, datasetId } = req.params;
		return await this.service.listRuns(agentId, projectId, datasetId);
	}

	@Get('/:agentId/evals/runs/:runId')
	@ProjectScope('agent:read')
	async getRun(req: AuthenticatedRequest<RunParam>): Promise<AgentEvalRunDetail> {
		await this.flagGate.assertEnabled(req.user);
		const { agentId, projectId, runId } = req.params;
		return await this.service.getRunDetail(agentId, projectId, runId);
	}

	/** Counts only — cheap enough for the UI to poll while a run is in flight. */
	@Get('/:agentId/evals/runs/:runId/summary')
	@ProjectScope('agent:read')
	async getRunSummary(req: AuthenticatedRequest<RunParam>): Promise<AgentEvalRunSummary> {
		await this.flagGate.assertEnabled(req.user);
		const { agentId, projectId, runId } = req.params;
		return await this.service.getRunSummary(agentId, projectId, runId);
	}

	@Post('/:agentId/evals/runs/:runId/cancel')
	@ProjectScope('agent:execute')
	async cancelRun(req: AuthenticatedRequest<RunParam>): Promise<AgentEvalRunRecord> {
		await this.flagGate.assertEnabled(req.user);
		const { agentId, projectId, runId } = req.params;
		return await this.service.cancelRun(agentId, projectId, runId);
	}
}
