import type {
	AgentEvalDatasetRecord,
	ApplyAgentEvalSuggestionsResult,
	AgentEvalResultRecord,
	AgentEvalRunDetail,
	AgentEvalRunList,
	AgentEvalRunRecord,
	AgentEvalRunSummary,
	AgentEvalVerdict,
	CreateAgentEvalDatasetDto,
	CreateAgentEvalRunPayload,
	CreateDraftDatasetResult,
	GenerateDraftCasesOptions,
	GenerateDraftCasesResult,
	PreviewRunOptions,
	PreviewRunResult,
	RerunResultOptions,
	UpdateAgentEvalDatasetPayload,
} from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { AgentEvalDataset, AgentEvalResult, AgentEvalRun, User } from '@n8n/db';
import {
	AgentEvalDatasetRepository,
	AgentEvalResultRepository,
	AgentEvalRunRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import pLimit from 'p-limit';

import { BadRequestError, ForbiddenError, NotFoundError, OperationalError } from '@n8n/errors';
import { userHasScopes } from '@/permissions.ee/check-access';
import { CredentialsService } from '@/credentials/credentials.service';
import { AgentConfigService } from '@/modules/agents/agent-config.service';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { getAgentConfigHash } from '@/modules/agents/utils/agent-config-hash';

import { AgentEvalCaseGenerationService } from './agent-eval-case-generation.service';
import { rewriteAgentInstructions } from './agent-eval-instructions-rewrite';
import { toDatasetRecord, toResultRecord, toRunRecord } from './agent-eval-record-mappers';
import { AgentEvalRunnerService } from './agent-eval-runner.service';
import { assertRequiredModulesActive } from './agent-evals-required-modules';

/** How many suggestion reruns run at once. */
const SUGGESTION_RERUN_CONCURRENCY = 3;

/** Statuses a run can still be asked to stop from. */
const CANCELLABLE_STATUSES = new Set(['new', 'running']);

/**
 * Required, not optional, so a caller can't forget to pass a window. Note a
 * `take` of 0 is n8n's "no limit" idiom, so this bounds the default path only.
 */
type PageParams = { take: number; skip: number };

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
		private readonly agentConfigService: AgentConfigService,
		private readonly credentialsService: CredentialsService,
		private readonly logger: Logger,
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

	// Discards a draft dataset *and* the Data Table `createDraftDataset` made for it
	// — what a failed "commit this preview" has to clean up. Only for a draft that
	// never ran: a dataset with runs is real history.
	//
	// Nothing here proves the table was created for this draft (a dataset can point
	// at any table in the project), so the table is removed only when the caller may
	// delete it anyway and no other dataset, of any agent, still reads it. Otherwise
	// just the dataset goes and the table is left alone.
	async deleteDraftDataset(
		user: User,
		agentId: string,
		projectId: string,
		datasetId: string,
	): Promise<void> {
		await this.assertAgentInProject(agentId, projectId);
		const dataset = await this.resolveDataset(agentId, datasetId);

		if ((await this.runRepository.findByDatasetId(datasetId)).length > 0) {
			throw new BadRequestError(`Agent eval dataset ${datasetId} already has runs.`);
		}

		const dataTableId = getDataTableId(dataset);
		let mayDeleteTable = false;
		if (dataTableId !== null) {
			try {
				mayDeleteTable =
					(await userHasScopes(user, ['dataTable:delete'], false, { dataTableId })) &&
					!(await this.datasetRepository.isDataTableReadByOtherDataset(dataTableId, datasetId));
			} catch (error) {
				// The scope check reports a missing table as "not found". A table that
				// is already gone needs no cleanup, and must not strand the dataset.
				if (!(error instanceof NotFoundError)) throw error;
			}
		}

		// Table first: if it cannot be removed the dataset is still there, so the
		// cleanup can be retried instead of orphaning the table for good.
		if (dataTableId !== null && mayDeleteTable) {
			try {
				await this.caseGenerationService.deleteDraftTable(dataTableId, projectId);
			} catch (error) {
				// Deleted in the meantime — the outcome is the same as having removed it.
				if (!(error instanceof NotFoundError)) throw error;
			}
		}

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

	async createDraftDataset(
		user: User,
		agentId: string,
		projectId: string,
		datasetName?: string,
	): Promise<CreateDraftDatasetResult> {
		await this.assertAgentInProject(agentId, projectId);
		return await this.caseGenerationService.createEmptyDataset(
			user,
			projectId,
			agentId,
			datasetName,
		);
	}

	async previewRun(
		user: User,
		agentId: string,
		projectId: string,
		options: PreviewRunOptions,
	): Promise<PreviewRunResult> {
		await this.assertAgentInProject(agentId, projectId);
		return await this.caseGenerationService.previewRun(user, projectId, agentId, options);
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
		page: PageParams,
	): Promise<AgentEvalRunList> {
		await this.assertAgentInProject(agentId, projectId);
		await this.resolveDataset(agentId, datasetId);
		const [runs, count] = await this.runRepository.findAndCountByDatasetIdAndAgentId(
			datasetId,
			agentId,
			page,
		);
		return { count, data: runs.map(toRunRecord) };
	}

	/** A run with a page of its per-case results — the "open a run" view. */
	async getRunDetail(
		agentId: string,
		projectId: string,
		runId: string,
		page: PageParams,
	): Promise<AgentEvalRunDetail> {
		await this.assertAgentInProject(agentId, projectId);
		const run = await this.resolveRun(agentId, runId);
		const [results, count] = await this.resultRepository.findAndCountByRunId(runId, page);
		return { ...toRunRecord(run), results: { count, data: results.map(toResultRecord) } };
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

	// ---- results ----

	// Re-executes one already-settled case in place — no new run, and no effect
	// on any other result in the run it belongs to. `agent:execute`, same as
	// `startRun`: running a case is the same action, just scoped to one of them.
	async rerunResult(
		user: User,
		agentId: string,
		projectId: string,
		resultId: string,
		options: RerunResultOptions = {},
	): Promise<AgentEvalResultRecord> {
		await this.assertAgentInProject(agentId, projectId);
		const result = await this.resolveResult(agentId, resultId);

		if (result.status === 'new' || result.status === 'running') {
			throw new BadRequestError(`Agent eval result ${resultId} is already running.`);
		}

		const updated = await this.runner.rerunResult(result, agentId, projectId, user, options);
		return toResultRecord(updated);
	}

	// Folds the stored fix suggestions of failed results into one rewrite of the
	// agent's instructions, saves it, then reruns only those results. The rewrite
	// and the save happen before any result is claimed, so a failure in either
	// leaves every result untouched. `agent:update` comes from the route scope;
	// the reruns need `agent:execute` on top.
	async applySuggestions(
		user: User,
		agentId: string,
		projectId: string,
		resultIds: string[],
		pushRef?: string,
	): Promise<ApplyAgentEvalSuggestionsResult> {
		await this.assertAgentInProject(agentId, projectId);

		if (!(await userHasScopes(user, ['agent:execute'], false, { projectId }))) {
			throw new ForbiddenError('You do not have permission to run agents in this project.');
		}

		const uniqueIds = [...new Set(resultIds)];
		const results = await Promise.all(
			uniqueIds.map(async (id) => await this.resolveResult(agentId, id)),
		);

		const invalidIds = results
			.filter((result) => readFailedRuleSuggestion(result) === null)
			.map((result) => result.id);
		if (invalidIds.length > 0) {
			throw new BadRequestError(
				`These results have no fix suggestion to apply: ${invalidIds.join(', ')}.`,
			);
		}

		const config = await this.agentConfigService.getConfig(agentId, projectId);
		const baseConfigHash = getAgentConfigHash(config);

		const instructions = await rewriteAgentInstructions(
			{
				agentConfigService: this.agentConfigService,
				credentialsService: this.credentialsService,
				logger: this.logger,
			},
			{
				currentInstructions: config.instructions,
				suggestions: results.map((result) => ({
					suggestion: readFailedRuleSuggestion(result) ?? '',
					rule: readCriteria(result),
				})),
			},
			{ agentId, projectId, user },
		);

		const saved = await this.agentConfigService.updateConfig(
			agentId,
			projectId,
			{ ...config, instructions },
			user,
			{ baseConfigHash, modifiedBy: 'user', pushRef },
		);

		const limit = pLimit(SUGGESTION_RERUN_CONCURRENCY);
		const settled = await Promise.allSettled(
			results.map(
				async (result) =>
					await limit(async () => await this.runner.rerunResult(result, agentId, projectId, user)),
			),
		);

		// One failed rerun must not hide the others. Only when every rerun failed is
		// there nothing to report, so that error is rethrown.
		const failures = settled.filter((entry) => entry.status === 'rejected');
		if (failures.length === settled.length) {
			const { reason } = failures[0];
			throw reason instanceof Error ? reason : new OperationalError(String(reason));
		}

		const rows = await Promise.all(
			settled.map(async (entry, index) => {
				if (entry.status === 'fulfilled') return entry.value;
				const refreshed = await this.resultRepository.findById(results[index].id);
				return refreshed ?? results[index];
			}),
		);

		return { configHash: saved.configHash, results: rows.map(toResultRecord) };
	}

	// "Actually fine": the user overrides the judge's call — or an execution error —
	// on a settled case. Recorded as a passing verdict so every reader of the
	// result (the checks view, reopened runs) sees the same status without a second
	// source of truth. Only a user can leave a completed pass on an errored or
	// cancelled case, since the judge only ever grades cases that succeeded.
	async acceptResult(
		agentId: string,
		projectId: string,
		resultId: string,
	): Promise<AgentEvalResultRecord> {
		await this.assertAgentInProject(agentId, projectId);
		const result = await this.resolveResult(agentId, resultId);

		if (result.status === 'new' || result.status === 'running') {
			throw new BadRequestError(`Agent eval result ${resultId} has not finished.`);
		}

		const verdict: AgentEvalVerdict = { status: 'completed', outcome: 'pass', reasoning: null };
		await this.resultRepository.updateVerdict(resultId, verdict);

		const refreshed = await this.resultRepository.findById(resultId);
		if (!refreshed) throw new NotFoundError(`Agent eval result ${resultId} not found.`);
		return toResultRecord(refreshed);
	}

	// Drops one case's result from its run, and brings a settled run's recorded
	// counts back in line with the rows that remain.
	async deleteResult(agentId: string, projectId: string, resultId: string): Promise<void> {
		await this.assertAgentInProject(agentId, projectId);
		const result = await this.resolveResult(agentId, resultId);

		// A case that is still pending or running will keep writing to its row, so
		// removing it would drop work the run then reports as done.
		if (result.status === 'new' || result.status === 'running') {
			throw new BadRequestError(`Agent eval result ${resultId} is still running.`);
		}

		const deleted = await this.resultRepository.deleteById(resultId, result.runId);
		if (!deleted) throw new NotFoundError(`Agent eval result ${resultId} not found.`);

		// A run that is still going records its tally when it settles; only a
		// settled run has stored counts to correct.
		const run = await this.runRepository.findById(result.runId);
		if (run?.metrics) {
			const { counts } = await this.runner.getRunSummary(run.id, agentId);
			await this.runRepository.updateMetrics(run.id, { ...run.metrics, ...counts });
		}
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

	/**
	 * A result is owned through its run, so this resolves the run agent-filtered
	 * rather than trusting a bare result id. A result on a sibling agent reads as
	 * missing, not forbidden, so its existence doesn't leak.
	 */
	private async resolveResult(agentId: string, resultId: string): Promise<AgentEvalResult> {
		const notFound = () => new NotFoundError(`Agent eval result ${resultId} not found.`);

		const result = await this.resultRepository.findById(resultId);
		if (!result) throw notFound();

		const run = await this.runRepository.findByIdAndAgentId(result.runId, agentId);
		if (!run) throw notFound();

		return result;
	}
}

/** The stored fix suggestion of a settled result whose rule failed, or `null`. */
function readFailedRuleSuggestion(result: AgentEvalResult): string | null {
	if (result.status === 'new' || result.status === 'running') return null;
	const verdict = result.verdict;
	if (!verdict || verdict.status !== 'completed' || verdict.outcome !== 'fail') return null;
	const suggestion = verdict.suggestion;
	return typeof suggestion === 'string' && suggestion.trim().length > 0 ? suggestion.trim() : null;
}

function readCriteria(result: AgentEvalResult): string | null {
	const criteria = result.input?.criteria;
	return typeof criteria === 'string' && criteria.length > 0 ? criteria : null;
}

function getDataTableId(dataset: AgentEvalDataset): string | null {
	if (dataset.datasetSource !== 'data_table') return null;
	return 'dataTableId' in dataset.datasetRef ? dataset.datasetRef.dataTableId : null;
}
