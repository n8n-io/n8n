import type {
	AgentEvalDatasetRecord,
	AgentEvalRunDetail,
	AgentEvalRunRecord,
	AgentEvalRunSummary,
	CreateAgentEvalDatasetDto,
	CreateAgentEvalRunPayload,
	GenerateDraftCasesOptions,
	GenerateDraftCasesResult,
	UpdateAgentEvalDatasetPayload,
} from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import type { AgentEvalDataset, AgentEvalRun, User } from '@n8n/db';
import {
	AgentEvalDatasetRepository,
	AgentEvalResultRepository,
	AgentEvalRunRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import { AgentEvalCaseGenerationService } from './agent-eval-case-generation.service';
import { toDatasetRecord, toResultRecord, toRunRecord } from './agent-eval-record-mappers';
import { AgentEvalRunnerService } from './agent-eval-runner.service';
import { assertRequiredModulesActive } from './agent-evals-required-modules';

/** Statuses a run can still be asked to stop from. */
const CANCELLABLE_STATUSES = new Set(['new', 'running']);

/**
 * Dataset CRUD, run reads and cancellation behind the agent-eval REST routes.
 *
 * **Every method is agent-scoped.** `@ProjectScope` proves the caller may act on
 * `:projectId` — not that the agent lives there, nor that a dataset/run id
 * belongs to it. So each entry point resolves `(agentId, projectId)` and then
 * reads through agent-filtered queries. Foreign ids 404 like missing ones.
 */
@Service()
export class AgentEvalService {
	constructor(
		private readonly moduleRegistry: ModuleRegistry,
		private readonly agentRepository: AgentRepository,
		private readonly datasetRepository: AgentEvalDatasetRepository,
		private readonly runRepository: AgentEvalRunRepository,
		private readonly resultRepository: AgentEvalResultRepository,
		private readonly runner: AgentEvalRunnerService,
		private readonly caseGenerationService: AgentEvalCaseGenerationService,
	) {}

	// ---- datasets ----

	async listDatasets(agentId: string, projectId: string): Promise<AgentEvalDatasetRecord[]> {
		await this.assertAgentInProject(agentId, projectId);
		const datasets = await this.datasetRepository.findByAgentId(agentId);
		return datasets.map(toDatasetRecord);
	}

	async getDataset(
		agentId: string,
		projectId: string,
		datasetId: string,
	): Promise<AgentEvalDatasetRecord> {
		await this.assertAgentInProject(agentId, projectId);
		return toDatasetRecord(await this.resolveDataset(agentId, datasetId));
	}

	// `agentId` is in both the body and the path; disagreement means the client is
	// confused about which agent it's configuring, so neither side wins.
	async createDataset(
		user: User,
		agentId: string,
		projectId: string,
		payload: CreateAgentEvalDatasetDto,
	): Promise<AgentEvalDatasetRecord> {
		await this.assertAgentInProject(agentId, projectId);

		if (payload.agentId !== agentId) {
			throw new BadRequestError(
				`The dataset's agentId ('${payload.agentId}') does not match the agent in the URL.`,
			);
		}

		const dataset = await this.datasetRepository.createDataset({
			name: payload.name,
			description: payload.description ?? null,
			agentId,
			datasetSource: payload.datasetSource,
			datasetRef: payload.datasetRef,
			columnMapping: payload.columnMapping ?? null,
			createdById: user.id,
		});

		return toDatasetRecord(dataset);
	}

	async updateDataset(
		agentId: string,
		projectId: string,
		datasetId: string,
		payload: UpdateAgentEvalDatasetPayload,
	): Promise<AgentEvalDatasetRecord> {
		await this.assertAgentInProject(agentId, projectId);
		const updated = await this.datasetRepository.updateDataset(datasetId, agentId, payload);
		if (!updated) throw new NotFoundError(`Agent eval dataset ${datasetId} not found.`);
		return toDatasetRecord(updated);
	}

	// FK cascade takes the runs and results. The backing Data Table is left alone —
	// it's independent, and may be shared or hand-authored.
	async deleteDataset(agentId: string, projectId: string, datasetId: string): Promise<void> {
		await this.assertAgentInProject(agentId, projectId);
		const deleted = await this.datasetRepository.deleteDataset(datasetId, agentId);
		if (!deleted) throw new NotFoundError(`Agent eval dataset ${datasetId} not found.`);
	}

	// ---- case generation ----

	async generateDraftCases(
		user: User,
		agentId: string,
		projectId: string,
		options: GenerateDraftCasesOptions,
	): Promise<GenerateDraftCasesResult> {
		await this.assertAgentInProject(agentId, projectId);
		return await this.caseGenerationService.generateDraftCases(user, projectId, agentId, options);
	}

	// ---- runs ----

	// Returns once seeded; cases run in the background, so callers poll the summary.
	// The runner's `finished` promise is dropped on purpose — it never rejects.
	async startRun(
		user: User,
		agentId: string,
		projectId: string,
		datasetId: string,
		payload: CreateAgentEvalRunPayload,
	): Promise<AgentEvalRunRecord> {
		await this.assertAgentInProject(agentId, projectId);
		await this.resolveDataset(agentId, datasetId);

		// Accepting a pin and running the live agent would misreport what was measured.
		if (payload.agentVersionId !== undefined) {
			throw new BadRequestError('Pinning an agent version for an eval run is not supported yet.');
		}

		const { runId } = await this.runner.startRun(datasetId, projectId, user);

		const run = await this.runRepository.findById(runId);
		if (!run) throw new NotFoundError(`Agent eval run ${runId} not found.`);
		return toRunRecord(run);
	}

	async listRuns(
		agentId: string,
		projectId: string,
		datasetId: string,
	): Promise<AgentEvalRunRecord[]> {
		await this.assertAgentInProject(agentId, projectId);
		await this.resolveDataset(agentId, datasetId);
		const runs = await this.runRepository.findByDatasetIdAndAgentId(datasetId, agentId);
		return runs.map(toRunRecord);
	}

	/** A run with every per-case result — the "open a run" view. */
	async getRunDetail(
		agentId: string,
		projectId: string,
		runId: string,
	): Promise<AgentEvalRunDetail> {
		await this.assertAgentInProject(agentId, projectId);
		const run = await this.resolveRun(agentId, runId);
		const results = await this.resultRepository.findByRunId(runId);
		return { ...toRunRecord(run), results: results.map(toResultRecord) };
	}

	// Per-case status counts for progress polling, ownership-resolved first so this
	// read path is gated like the writes.
	async getRunSummary(
		agentId: string,
		projectId: string,
		runId: string,
	): Promise<AgentEvalRunSummary> {
		await this.assertAgentInProject(agentId, projectId);
		return await this.runner.getRunSummary(runId, agentId);
	}

	// Sets the flag rather than stopping anything: running cases abort at their next
	// checkpoint, so the returned run is still `running` and settles shortly after.
	async cancelRun(agentId: string, projectId: string, runId: string): Promise<AgentEvalRunRecord> {
		await this.assertAgentInProject(agentId, projectId);
		const run = await this.resolveRun(agentId, runId);

		if (!CANCELLABLE_STATUSES.has(run.status)) {
			throw new BadRequestError(`Agent eval run ${runId} has already finished ('${run.status}').`);
		}

		await this.runRepository.requestCancellation(runId);

		const updated = await this.runRepository.findById(runId);
		return toRunRecord(updated ?? run);
	}

	// ---- internals ----

	// `@ProjectScope` only checks the project in the URL, so this is what stops a
	// caller with access to one project from addressing an agent in another.
	//
	// Every public method starts here, which makes it the one place to assert the
	// modules this one depends on — before the agent lookup that would otherwise
	// fail as a TypeORM missing-metadata error.
	private async assertAgentInProject(agentId: string, projectId: string): Promise<void> {
		assertRequiredModulesActive(this.moduleRegistry);
		const agent = await this.agentRepository.findByIdAndProjectId(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent ${agentId} not found.`);
	}

	private async resolveDataset(agentId: string, datasetId: string): Promise<AgentEvalDataset> {
		const dataset = await this.datasetRepository.findByIdAndAgentId(datasetId, agentId);
		if (!dataset) throw new NotFoundError(`Agent eval dataset ${datasetId} not found.`);
		return dataset;
	}

	private async resolveRun(agentId: string, runId: string): Promise<AgentEvalRun> {
		const run = await this.runRepository.findByIdAndAgentId(runId, agentId);
		if (!run) throw new NotFoundError(`Agent eval run ${runId} not found.`);
		return run;
	}
}
