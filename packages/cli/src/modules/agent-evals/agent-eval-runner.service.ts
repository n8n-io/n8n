import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { AgentEvalDataset, AgentEvalResult, User } from '@n8n/db';
import {
	AgentEvalDatasetRepository,
	AgentEvalResultRepository,
	AgentEvalRunRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import type {
	DataTableColumnJsType,
	DataTableRow,
	IDataObject,
	JsonObject,
	JsonValue,
} from 'n8n-workflow';
import { jsonParse, jsonStringify } from 'n8n-workflow';
import pLimit from 'p-limit';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { EvalAgentExecutionService } from '@/modules/instance-ai/eval/agent-execution.service';
import { userHasScopes } from '@/permissions.ee/check-access';

const DEFAULT_CONCURRENCY = 5;
const MAX_CONCURRENCY = 10;
const ROW_PAGE_SIZE = 100;

/** A dataset row resolved into a runnable case via the dataset's column mapping. */
interface ResolvedCase {
	/** Origin Data Table row id, tracked loosely (rows are external/mutable). */
	sourceRowId: string | null;
	/** The opening message the agent receives. */
	input: string;
	/** The case snapshot persisted on the result row for later judging. */
	snapshot: JsonObject;
}

interface CaseUsage {
	inputTokens: number;
	outputTokens: number;
}

export interface AgentEvalRunSummary {
	runId: string;
	status: string;
	counts: { total: number; success: number; error: number; cancelled: number; pending: number };
}

/**
 * Executes an agent-eval dataset against a real agent and persists per-case
 * results, then aggregates run-level status.
 *
 * Runs on the main process only: the tool-mock substrate reused from the
 * instance-ai eval path carries a closure that cannot cross a queue boundary
 * (see {@link EvalAgentExecutionService}). Cases run in a bounded in-process
 * pool; cross-main *cancellation* is honored via the run's `cancelRequested`
 * flag. Behind the `101_agent_evals` flag.
 */
@Service()
export class AgentEvalRunnerService {
	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly datasetRepository: AgentEvalDatasetRepository,
		private readonly runRepository: AgentEvalRunRepository,
		private readonly resultRepository: AgentEvalResultRepository,
		private readonly agentRepository: AgentRepository,
		private readonly dataTableService: DataTableService,
		private readonly evalAgentExecutionService: EvalAgentExecutionService,
	) {}

	/**
	 * Validate + create a run, seed one result per case, then execute the cases in
	 * the background. Returns immediately with the run id and a `finished` promise
	 * that resolves once the run settles (used by callers that want to await it).
	 */
	async startRun(
		datasetId: string,
		projectId: string,
		user: User,
		options: { concurrency?: number; timeoutMs?: number } = {},
	): Promise<{ runId: string; finished: Promise<void> }> {
		// Behind 101_agent_evals. Per-cohort PostHog resolution attaches at the REST
		// layer (which carries the request user); the gate available server-side
		// here is the operator override.
		if (!this.globalConfig.evaluation.agentEvalsEnabled) {
			throw new BadRequestError('Agent evals are not enabled on this instance.');
		}

		if (this.globalConfig.executions.mode === 'queue') {
			throw new BadRequestError('Agent eval runs are not supported in queue mode.');
		}

		const dataset = await this.datasetRepository.findById(datasetId);
		if (!dataset) throw new NotFoundError(`Agent eval dataset ${datasetId} not found.`);

		if (dataset.datasetSource !== 'data_table') {
			throw new BadRequestError(
				`Agent eval runs currently support only data_table datasets (got '${dataset.datasetSource}').`,
			);
		}

		const agent = await this.agentRepository.findByIdAndProjectId(dataset.agentId, projectId);
		if (!agent) {
			throw new NotFoundError(`Agent ${dataset.agentId} not found or not accessible.`);
		}

		const cases = await this.resolveCases(dataset, user);
		if (cases.length === 0) {
			throw new BadRequestError('The dataset has no rows to run.');
		}

		const run = await this.runRepository.createRun({
			datasetId: dataset.id,
			agentVersionId: agent.activeVersionId,
			createdById: user.id,
		});

		const seeded = await this.resultRepository.seedResults(
			cases.map((c, index) => ({
				runId: run.id,
				sourceRowId: c.sourceRowId,
				runIndex: index,
				input: c.snapshot,
			})),
		);

		await this.runRepository.markAsRunning(run.id, this.instanceSettings.hostId);

		const concurrency = Math.max(
			1,
			Math.min(MAX_CONCURRENCY, Math.floor(options.concurrency ?? DEFAULT_CONCURRENCY)),
		);

		const finished = this.executeRun({
			runId: run.id,
			agentId: dataset.agentId,
			projectId,
			user,
			cases,
			seeded,
			concurrency,
			timeoutMs: options.timeoutMs,
		});

		return { runId: run.id, finished };
	}

	/** Run + per-case status counts, for polling a run's progress. */
	async getRunSummary(runId: string): Promise<AgentEvalRunSummary> {
		const run = await this.runRepository.findById(runId);
		if (!run) throw new NotFoundError(`Agent eval run ${runId} not found.`);
		const results = await this.resultRepository.findByRunId(runId);
		return { runId: run.id, status: run.status, counts: countByStatus(results) };
	}

	/**
	 * Executes every case in a bounded pool and settles the run. Never throws —
	 * an unexpected failure marks the run as errored so callers awaiting
	 * `finished` always observe a settled run.
	 */
	private async executeRun(ctx: {
		runId: string;
		agentId: string;
		projectId: string;
		user: User;
		cases: ResolvedCase[];
		seeded: AgentEvalResult[];
		concurrency: number;
		timeoutMs?: number;
	}): Promise<void> {
		const { runId, cases, seeded, concurrency } = ctx;
		try {
			const limit = pLimit(concurrency);
			let cancelled = false;
			const totalUsage: CaseUsage = { inputTokens: 0, outputTokens: 0 };

			await Promise.all(
				cases.map(async (resolvedCase, index) => {
					await limit(async () => {
						const resultRow = seeded[index];
						// Cooperative cancellation: stop starting new cases once a cancel is
						// requested (in-flight cases finish). Re-read the flag so a cancel
						// from another main is seen.
						if (cancelled || (await this.runRepository.isCancellationRequested(runId))) {
							cancelled = true;
							await this.resultRepository.markAsCancelled(resultRow.id);
							return;
						}
						const usage = await this.runCase(resultRow, resolvedCase, ctx);
						if (usage) {
							totalUsage.inputTokens += usage.inputTokens;
							totalUsage.outputTokens += usage.outputTokens;
						}
					});
				}),
			);

			const results = await this.resultRepository.findByRunId(runId);
			const metrics: IDataObject = { ...countByStatus(results), usage: { ...totalUsage } };

			if (cancelled) {
				await this.runRepository.markAsCancelled(runId, metrics);
			} else {
				await this.runRepository.markAsCompleted(runId, metrics);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error(`[AgentEvalRunner] Run ${runId} failed to complete`, { error: message });
			await this.runRepository.markAsError(runId, 'run_failed', { message });
		}
	}

	/**
	 * Execute one case and persist its result. Returns the case's token usage.
	 * Fully self-contained: a thrown execution or DB error is converted into a
	 * per-case error so one case can never abort the batch or leave its result
	 * stuck `running`.
	 */
	private async runCase(
		resultRow: AgentEvalResult,
		resolvedCase: ResolvedCase,
		ctx: { agentId: string; projectId: string; user: User; timeoutMs?: number },
	): Promise<CaseUsage | undefined> {
		try {
			if (resolvedCase.input.trim().length === 0) {
				await this.resultRepository.markAsError(resultRow.id, 'empty_input', {
					message: 'Case has no value in the mapped input column.',
				});
				return undefined;
			}

			await this.resultRepository.markAsRunning(resultRow.id);

			const execResult = await this.evalAgentExecutionService.executeWithLlmMock(
				ctx.agentId,
				ctx.user,
				{ projectId: ctx.projectId, ...(ctx.timeoutMs ? { timeoutMs: ctx.timeoutMs } : {}) },
				resolvedCase.input,
			);

			const usage = normalizeUsage(execResult.usage);

			if (!execResult.success) {
				await this.resultRepository.markAsError(resultRow.id, 'execution_failed', {
					errors: execResult.errors,
					finalText: execResult.finalText,
				});
				return usage;
			}

			await this.resultRepository.markAsCompleted(resultRow.id, {
				output: toJsonObject({
					finalText: execResult.finalText,
					model: execResult.model ?? null,
					finishReason: execResult.finishReason ?? null,
					skippedFeatures: execResult.skippedFeatures,
				}),
				toolCalls: toJsonObject({ calls: execResult.toolCalls }),
				metrics: usage ? { usage: { ...usage } } : null,
			});

			return usage;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.logger.error(`[AgentEvalRunner] Case ${resultRow.id} failed`, { error: message });
			try {
				await this.resultRepository.markAsError(resultRow.id, 'execution_failed', { message });
			} catch (markError) {
				this.logger.error(`[AgentEvalRunner] Could not record failure for case ${resultRow.id}`, {
					error: markError instanceof Error ? markError.message : String(markError),
				});
			}
			return undefined;
		}
	}

	/**
	 * Resolve the dataset's Data Table rows into runnable cases via its column
	 * mapping. Mirrors {@link EvaluationDatasetService}'s data-table access: the
	 * table may live in a different project than the agent, so access is checked
	 * on the table directly.
	 */
	private async resolveCases(dataset: AgentEvalDataset, user: User): Promise<ResolvedCase[]> {
		const mapping = dataset.columnMapping;
		if (!mapping?.input) {
			throw new BadRequestError('The dataset has no input column mapping.');
		}

		// Narrowed above (datasetSource === 'data_table'): the ref carries a table id.
		const dataTableId = (dataset.datasetRef as { dataTableId: string }).dataTableId;

		const allowed = await userHasScopes(user, ['dataTable:readRow'], false, { dataTableId });
		if (!allowed) throw new ForbiddenError('You do not have access to this dataset.');

		const tableProjectId = await this.dataTableService.getProjectIdForDataTable(dataTableId);

		const rows: DataTableRow[] = [];
		let skip = 0;
		for (;;) {
			const { data, count } = await this.dataTableService.getManyRowsAndCount(
				dataTableId,
				tableProjectId,
				{ take: ROW_PAGE_SIZE, skip },
			);
			rows.push(...data);
			skip += data.length;
			if (data.length === 0 || skip >= count) break;
		}

		return rows.map((row) => {
			const snapshot: JsonObject = { input: cellToJson(row[mapping.input]) };
			if (mapping.expectedOutput) {
				snapshot.expectedOutput = cellToJson(row[mapping.expectedOutput]);
			}
			if (mapping.criteria) snapshot.criteria = cellToJson(row[mapping.criteria]);

			return {
				sourceRowId: row.id === undefined || row.id === null ? null : String(row.id),
				input: cellToString(row[mapping.input]),
				snapshot,
			};
		});
	}
}

function countByStatus(results: AgentEvalResult[]): AgentEvalRunSummary['counts'] {
	return {
		total: results.length,
		success: results.filter((r) => r.status === 'success').length,
		error: results.filter((r) => r.status === 'error').length,
		cancelled: results.filter((r) => r.status === 'cancelled').length,
		pending: results.filter((r) => r.status === 'new' || r.status === 'running').length,
	};
}

/** The execution result reports token counts optionally; default missing to 0. */
function normalizeUsage(usage?: { inputTokens?: number; outputTokens?: number }):
	| CaseUsage
	| undefined {
	if (!usage) return undefined;
	return { inputTokens: usage.inputTokens ?? 0, outputTokens: usage.outputTokens ?? 0 };
}

/** Coerce a Data Table cell into the agent's opening message. */
function cellToString(value: DataTableColumnJsType | undefined): string {
	if (value === null || value === undefined) return '';
	if (value instanceof Date) return value.toISOString();
	return String(value);
}

/** Coerce a Data Table cell into a JSON-safe snapshot value. */
function cellToJson(value: DataTableColumnJsType | undefined): JsonValue {
	if (value === null || value === undefined) return null;
	if (value instanceof Date) return value.toISOString();
	return value;
}

function toJsonObject(value: unknown): JsonObject {
	return jsonParse<JsonObject>(jsonStringify(value), { fallbackValue: {} });
}
