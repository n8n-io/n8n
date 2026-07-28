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

/** Statuses a run can still be asked to stop from. */
const CANCELLABLE_STATUSES = new Set(['new', 'running']);

/**
 * Read/write operations behind the agent-eval REST routes: dataset CRUD, run
 * listing and detail, cancellation, and the delegations to case generation and
 * the runner.
 *
 * **Every method is agent-scoped.** `@ProjectScope` on the routes proves the
 * caller may act on `:projectId`, but nothing about it proves the addressed
 * agent lives in that project, nor that a dataset/run id belongs to that agent.
 * So each entry point resolves the agent through `(agentId, projectId)` and then
 * loads datasets and runs through agent-filtered repository reads — a caller
 * can't reach another project's agent, or another agent's evals, by id. Missing
 * or foreign ids are all reported as 404 so the routes don't confirm that an id
 * exists somewhere else.
 */
@Service()
export class AgentEvalService {
	constructor(
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

	/**
	 * The body carries `agentId` as well as the path, so a mismatch is rejected
	 * rather than silently resolved in favour of one of them — the two disagreeing
	 * means the client is confused about which agent it's configuring.
	 */
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

	/**
	 * Deletes the dataset and — by FK cascade — its runs and their results. The
	 * backing Data Table is left alone: it's an independent resource the user may
	 * share with other datasets or have authored by hand.
	 */
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

	/**
	 * Starts a run and returns as soon as it's been created and seeded — the cases
	 * then execute in the background, so the caller polls
	 * {@link getRunSummary} for progress. The runner's `finished` promise is
	 * deliberately dropped rather than awaited: it settles only once every case
	 * has run, and it never rejects (the runner records failures on the run).
	 */
	async startRun(
		user: User,
		agentId: string,
		projectId: string,
		datasetId: string,
		payload: CreateAgentEvalRunPayload,
	): Promise<AgentEvalRunRecord> {
		await this.assertAgentInProject(agentId, projectId);
		await this.resolveDataset(agentId, datasetId);

		// Accepting this and quietly running the live agent instead would misreport
		// what was measured, so refuse until the runner can execute a snapshot.
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

	/**
	 * Per-case status counts for polling a run's progress. Ownership is resolved
	 * here before the summary is read, so this read path is gated exactly like the
	 * write paths.
	 */
	async getRunSummary(
		agentId: string,
		projectId: string,
		runId: string,
	): Promise<AgentEvalRunSummary> {
		await this.assertAgentInProject(agentId, projectId);
		return await this.runner.getRunSummary(runId, agentId);
	}

	/**
	 * Requests cancellation. This sets the run's flag rather than stopping anything
	 * synchronously: the executing cases poll it and abort at their next
	 * checkpoint, so the returned run is still `running` and settles to `cancelled`
	 * shortly after.
	 */
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

	/**
	 * The agent must exist *in this project*. Rejecting here is what stops a
	 * caller with legitimate access to one project from addressing an agent in
	 * another: `@ProjectScope` only checks the project in the URL.
	 */
	private async assertAgentInProject(agentId: string, projectId: string): Promise<void> {
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
