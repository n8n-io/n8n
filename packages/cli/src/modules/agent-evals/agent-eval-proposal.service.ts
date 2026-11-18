import type { ModelConfig } from '@n8n/agents';
import {
	AGENT_PROPOSAL_MAX_CASES,
	type AgentEvalColumnMapping,
	type AgentEvalSuiteCase,
	type AgentEvalVerdict,
	type AgentProposalCaseArm,
	type AgentProposalCaseResult,
	type AgentProposalEdit,
	type AgentProposalEvalCase,
	type AgentProposalEvidence,
	type AgentProposalToolCall,
	type InstanceAiEvalLlmUsage,
} from '@n8n/api-types';
import { Logger, ModuleRegistry } from '@n8n/backend-common';
import { DataTableService } from '@n8n/backend-module-data-table';
import { InstanceWriteAccessService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import type { AgentEvalDataset, User } from '@n8n/db';
import { AgentEvalDatasetRepository } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import { ForbiddenError, NotFoundError, OperationalError, UserError } from '@n8n/errors';
import { meterEvalUsage } from '@n8n/instance-ai';
import type { Scope } from '@n8n/permissions';
import type { DataTableRow } from 'n8n-workflow';
import pLimit from 'p-limit';

import { CredentialsService } from '@/credentials/credentials.service';
import { AgentConfigService } from '@/modules/agents/agent-config.service';
import type { AgentEvaluationSource } from '@/modules/agents/evaluation/agent-evaluation.contracts';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import {
	createAgentEvalMockWorld,
	EvalAgentExecutionService,
	type AgentEvalExecutionResult,
	type AgentEvalMockWorld,
} from '@/modules/instance-ai/eval/agent-execution.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import { AgentEvalCaseGenerationService } from './agent-eval-case-generation.service';
import {
	cellToString,
	readSnapshotExpectedTools,
	readSnapshotText,
	resolveCases,
} from './agent-eval-case-reader';
import { judgeAgentAnswer } from './agent-eval-judge';

const MAX_LISTED_CASES = 200;
const COMPARE_CONCURRENCY = 3;
// One arm of one case. A comparison runs many arms inside one tool call.
const ARM_TIMEOUT_MS = 180_000;
const MAX_ERROR_CHARS = 500;
// Rows with the same input as an added case. More than this is not expected.
const IDEMPOTENCY_PAGE_SIZE = 100;
const STOPPED_REASON = 'The comparison was stopped before this case ran.';

const INPUT_COLUMN = 'input';
const CRITERIA_COLUMN = 'criteria';
const EXPECTED_TOOLS_COLUMN = 'expectedTools';

/** One case of a comparison. Both versions run it with the same checks. */
export type AgentEvalComparisonCase = {
	caseKey: string;
	origin: 'suite' | 'proposal';
	motivating: boolean;
	input: string;
	criteria: string | null;
	expectedOutput: string | null;
	expectedTools: string[];
};

type CompareInput = {
	projectId: string;
	agentId: string;
	baseVersionId: string;
	/** An empty list runs only the published version. */
	edits: AgentProposalEdit[];
	cases: AgentEvalComparisonCase[];
	helperModel?: ModelConfig;
	onHelperUsage?: (usage: InstanceAiEvalLlmUsage[]) => void | Promise<void>;
	abortSignal?: AbortSignal;
};

/** A dataset that can take case rows: a Data Table with a mapped input column. */
type SuiteTarget = {
	datasetId: string;
	dataTableId: string;
	tableProjectId: string;
	mapping: AgentEvalColumnMapping;
};

/**
 * Tests a proposed agent change: it runs the published agent and the published
 * agent with the edits on the same cases, and writes proposed cases to the
 * eval suite. It saves no eval run.
 *
 * The caller is not the agent evals REST layer, so the per-user feature flag
 * is not checked here.
 */
@Service()
export class AgentEvalProposalService {
	// Only light dependencies: a caller asks `availability()` when the modules
	// that own the other services can be inactive. Methods resolve those.
	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	availability(): 'ok' | 'queue_mode' | 'modules_inactive' {
		const inactive = (['agents', 'data-table', 'agent-evals'] as const).some(
			(name) => !this.moduleRegistry.isActive(name),
		);
		if (inactive) return 'modules_inactive';
		if (this.globalConfig.executions.mode === 'queue') return 'queue_mode';
		return 'ok';
	}

	/** Lists the cases of the agent's Data Table datasets, newest dataset first. */
	async listCases(user: User, projectId: string, agentId: string): Promise<AgentEvalSuiteCase[]> {
		await this.assertScope(user, 'agent:read', { projectId });
		await this.assertAgentInProject(agentId, projectId);

		const dataTableService = Container.get(DataTableService);
		const datasets = await Container.get(AgentEvalDatasetRepository).findByAgentId(agentId);
		const cases: AgentEvalSuiteCase[] = [];
		for (const dataset of datasets) {
			if (dataset.datasetSource !== 'data_table') continue;
			let resolved: Awaited<ReturnType<typeof resolveCases>>;
			try {
				resolved = await resolveCases(dataTableService, dataset, user);
			} catch {
				// A dataset that the user cannot read, or that has a broken mapping, is not listed.
				continue;
			}
			for (const resolvedCase of resolved) {
				if (resolvedCase.sourceRowId === null || resolvedCase.input.trim().length === 0) continue;
				if (cases.length >= MAX_LISTED_CASES) return cases;
				cases.push({
					caseId: `${dataset.id}:${resolvedCase.sourceRowId}`,
					input: resolvedCase.input,
					criteria: readSnapshotText(resolvedCase.snapshot, 'criteria'),
					expectedOutput: readSnapshotText(resolvedCase.snapshot, 'expectedOutput'),
					expectedTools: readSnapshotExpectedTools(resolvedCase.snapshot),
				});
			}
		}
		return cases;
	}

	/**
	 * Runs each case on the published version and, when `edits` is not empty,
	 * on the published version with the edits. A failed run gives an `error`
	 * arm. The call throws only when no published run finished.
	 */
	async compare(user: User, input: CompareInput): Promise<AgentProposalEvidence> {
		if (input.cases.length === 0 || input.cases.length > AGENT_PROPOSAL_MAX_CASES) {
			throw new UserError(`A comparison needs 1 to ${AGENT_PROPOSAL_MAX_CASES} cases.`);
		}

		const limit = pLimit(COMPARE_CONCURRENCY);
		const cases = await Promise.all(
			input.cases.map(
				async (comparisonCase) =>
					await limit(async () => await this.compareCase(user, input, comparisonCase)),
			),
		);

		if (cases.every((result) => result.published.status === 'error')) {
			throw new OperationalError(
				cases[0].published.verdict.reasoning ?? 'The published agent did not run.',
			);
		}
		return { ranAt: new Date().toISOString(), cases };
	}

	/**
	 * Writes proposed cases to the agent's eval suite. An added case that is
	 * already in the suite is not added again, so a retry is safe.
	 */
	async applyCases(
		user: User,
		input: { projectId: string; agentId: string; cases: AgentProposalEvalCase[] },
	): Promise<void> {
		const { projectId, agentId, cases } = input;
		if (cases.length === 0) return;
		if (Container.get(InstanceWriteAccessService).isReadOnly()) {
			throw new ForbiddenError(
				'Cannot change eval cases on a protected instance. This instance is in read-only mode.',
			);
		}
		await this.assertScope(user, 'agent:update', { projectId });
		const agentName = await this.assertAgentInProject(agentId, projectId);

		// Found or created for the first added case, then used for the next ones.
		let addTarget: SuiteTarget | undefined;
		for (const evalCase of cases) {
			let target: SuiteTarget;
			if (evalCase.change === 'updated') {
				const { dataset, rowId } = await this.findCaseDataset(evalCase.caseId, agentId);
				target = await this.prepareTarget(user, agentId, dataset, evalCase);
				await this.updateCaseRow(target, rowId, evalCase);
			} else {
				addTarget ??= await this.findOrCreateAddTarget(user, projectId, agentId, agentName);
				target = await this.prepareTarget(user, agentId, addTarget, evalCase);
				addTarget = target;
				await this.addCaseRow(target, evalCase);
			}
		}
	}

	// ---- compare ----

	private async compareCase(
		user: User,
		input: CompareInput,
		comparisonCase: AgentEvalComparisonCase,
	): Promise<AgentProposalCaseResult> {
		const world = createAgentEvalMockWorld();
		const published = await this.runArm(user, input, comparisonCase, world, {
			kind: 'published',
			versionId: input.baseVersionId,
		});
		const proposed =
			input.edits.length > 0
				? await this.runArm(user, input, comparisonCase, world, {
						kind: 'published',
						versionId: input.baseVersionId,
						edits: input.edits,
					})
				: null;
		return { ...comparisonCase, published, proposed };
	}

	private async runArm(
		user: User,
		input: CompareInput,
		comparisonCase: AgentEvalComparisonCase,
		world: AgentEvalMockWorld,
		source: AgentEvaluationSource,
	): Promise<AgentProposalCaseArm> {
		if (input.abortSignal?.aborted) return errorArm(STOPPED_REASON);

		let result: AgentEvalExecutionResult;
		try {
			const metered = await meterEvalUsage(
				async () =>
					await Container.get(EvalAgentExecutionService).executeWithLlmMock(
						input.agentId,
						user,
						{ projectId: input.projectId, timeoutMs: ARM_TIMEOUT_MS },
						comparisonCase.input,
						{
							source,
							world,
							...(input.helperModel ? { helperModel: input.helperModel } : {}),
							...(input.abortSignal ? { abortSignal: input.abortSignal } : {}),
						},
					),
			);
			result = metered.result;
			await this.reportHelperUsage(input, metered.usage);
		} catch (error) {
			return errorArm(error instanceof Error ? error.message : String(error));
		}

		if (!result.success) return errorArm(result.errors[0] ?? 'The agent run failed.', result);

		const verdict = await judgeAgentAnswer(
			{
				agentConfigService: Container.get(AgentConfigService),
				credentialsService: Container.get(CredentialsService),
				logger: this.logger,
			},
			{
				input: comparisonCase.input,
				output: result.finalText,
				criteria: comparisonCase.criteria,
				expectedOutput: comparisonCase.expectedOutput,
				expectedTools: comparisonCase.expectedTools,
				toolCalls: result.toolCalls,
			},
			{ agentId: input.agentId, projectId: input.projectId, user },
		);

		return {
			status: 'success',
			answer: result.finalText,
			verdict,
			toolCalls: result.toolCalls.map(
				(call): AgentProposalToolCall => ({
					tool: call.tool,
					kind: call.kind,
					...(call.input !== undefined ? { input: call.input } : {}),
					...(call.output !== undefined ? { output: call.output } : {}),
					// Other error texts are notes about attribution, not failed calls.
					failed: call.error === 'canceled',
				}),
			),
			usage: armUsage(result),
		};
	}

	/** A failed usage report must not change the result of a finished run. */
	private async reportHelperUsage(input: CompareInput, usage: InstanceAiEvalLlmUsage[]) {
		if (!input.onHelperUsage || usage.length === 0) return;
		try {
			await input.onHelperUsage(usage);
		} catch (error) {
			this.logger.error('[AgentEvalProposal] Could not report helper model usage', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	// ---- applyCases ----

	private async findCaseDataset(
		caseId: string | null,
		agentId: string,
	): Promise<{ dataset: SuiteTarget; rowId: number }> {
		const separator = caseId?.lastIndexOf(':') ?? -1;
		const datasetId = caseId?.slice(0, Math.max(separator, 0)) ?? '';
		const rowIdText = caseId?.slice(separator + 1) ?? '';
		if (!datasetId || !/^\d+$/.test(rowIdText)) {
			throw new UserError('The eval case to update has no valid case ID.');
		}
		// Scoped to the agent: a case ID must not address the suite of another agent.
		const dataset = await Container.get(AgentEvalDatasetRepository).findByIdAndAgentId(
			datasetId,
			agentId,
		);
		const target = dataset ? await this.toSuiteTarget(dataset) : undefined;
		if (!target) throw new UserError('The eval case to update is not in the suite of this agent.');
		return { dataset: target, rowId: Number(rowIdText) };
	}

	private async toSuiteTarget(dataset: AgentEvalDataset): Promise<SuiteTarget | undefined> {
		if (dataset.datasetSource !== 'data_table' || !dataset.columnMapping?.input) return undefined;
		const { datasetRef } = dataset;
		if (!('dataTableId' in datasetRef) || typeof datasetRef.dataTableId !== 'string') {
			return undefined;
		}
		return {
			datasetId: dataset.id,
			dataTableId: datasetRef.dataTableId,
			// The table can be in another project than the agent.
			tableProjectId: await Container.get(DataTableService).getProjectIdForDataTable(
				datasetRef.dataTableId,
			),
			mapping: dataset.columnMapping,
		};
	}

	private async findOrCreateAddTarget(
		user: User,
		projectId: string,
		agentId: string,
		agentName: string,
	): Promise<SuiteTarget> {
		const datasets = await Container.get(AgentEvalDatasetRepository).findByAgentId(agentId);
		for (const dataset of datasets) {
			const target = await this.toSuiteTarget(dataset);
			if (target) return target;
		}

		await this.assertScope(user, 'dataTable:create', { projectId });
		const mapping = {
			input: INPUT_COLUMN,
			criteria: CRITERIA_COLUMN,
			expectedTools: EXPECTED_TOOLS_COLUMN,
		};
		const created = await Container.get(AgentEvalCaseGenerationService).createDatasetForAgent(
			projectId,
			agentId,
			user.id,
			`Checks for ${agentName}`.slice(0, 128),
			mapping,
		);
		return {
			datasetId: created.datasetId,
			dataTableId: created.dataTableId,
			tableProjectId: projectId,
			mapping,
		};
	}

	/**
	 * Checks row write access and makes sure that the dataset has a column for
	 * each role that the case uses.
	 */
	private async prepareTarget(
		user: User,
		agentId: string,
		target: SuiteTarget,
		evalCase: AgentProposalEvalCase,
	): Promise<SuiteTarget> {
		const { dataTableId, tableProjectId } = target;
		await this.assertScope(user, 'dataTable:writeRow', { dataTableId });

		const missingRoles = (['criteria', 'expectedTools'] as const).filter(
			(role) =>
				!target.mapping[role] &&
				(role === 'criteria' ? evalCase.criteria !== null : evalCase.expectedTools.length > 0),
		);
		if (missingRoles.length === 0) return target;

		const dataTableService = Container.get(DataTableService);
		const columnNames = new Set(
			(await dataTableService.getColumns(dataTableId, tableProjectId)).map((column) => column.name),
		);
		const mapping = { ...target.mapping };
		for (const role of missingRoles) {
			if (!columnNames.has(role)) {
				await this.assertScope(user, 'dataTable:update', { dataTableId });
				await dataTableService.addColumn(dataTableId, tableProjectId, {
					name: role,
					type: 'string',
				});
			}
			mapping[role] = role;
		}
		await Container.get(AgentEvalDatasetRepository).updateDataset(target.datasetId, agentId, {
			columnMapping: mapping,
		});
		return { ...target, mapping };
	}

	/** The cells of the roles that a proposal can write. A mapped gold answer is not changed. */
	private caseCells(mapping: AgentEvalColumnMapping, evalCase: AgentProposalEvalCase) {
		const cells: Record<string, string | null> = { [mapping.input]: evalCase.input };
		if (mapping.criteria) cells[mapping.criteria] = evalCase.criteria;
		if (mapping.expectedTools) {
			cells[mapping.expectedTools] =
				evalCase.expectedTools.length > 0 ? evalCase.expectedTools.join(', ') : null;
		}
		return cells;
	}

	private async updateCaseRow(target: SuiteTarget, rowId: number, evalCase: AgentProposalEvalCase) {
		const updated = await Container.get(DataTableService).updateRows(
			target.dataTableId,
			target.tableProjectId,
			{
				filter: { type: 'and', filters: [{ columnName: 'id', condition: 'eq', value: rowId }] },
				data: this.caseCells(target.mapping, evalCase),
			},
			true,
		);
		if (updated.length === 0) {
			throw new UserError('The eval case to update is no longer in the suite.');
		}
	}

	private async addCaseRow(target: SuiteTarget, evalCase: AgentProposalEvalCase) {
		const dataTableService = Container.get(DataTableService);
		const cells = this.caseCells(target.mapping, evalCase);
		const { data } = await dataTableService.getManyRowsAndCount(
			target.dataTableId,
			target.tableProjectId,
			{
				take: IDEMPOTENCY_PAGE_SIZE,
				skip: 0,
				filter: {
					type: 'and',
					filters: [{ columnName: target.mapping.input, condition: 'eq', value: evalCase.input }],
				},
			},
		);
		const sameCells = (row: DataTableRow) =>
			Object.entries(cells).every(([column, value]) => cellToString(row[column]) === (value ?? ''));
		if (data.some(sameCells)) return;

		await dataTableService.insertRows(target.dataTableId, target.tableProjectId, [cells]);
	}

	// ---- access ----

	private async assertScope(
		user: User,
		scope: Scope,
		resource: { projectId: string } | { dataTableId: string },
	) {
		if (!(await userHasScopes(user, [scope], false, resource))) {
			throw new ForbiddenError(`You do not have the permission ${scope} for this change.`);
		}
	}

	/** Returns the agent name. */
	private async assertAgentInProject(agentId: string, projectId: string): Promise<string> {
		const agent = await Container.get(AgentRepository).findByIdAndProjectId(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent ${agentId} not found.`);
		return agent.name;
	}
}

function armUsage(result?: AgentEvalExecutionResult): AgentProposalCaseArm['usage'] {
	return {
		inputTokens: result?.usage?.inputTokens ?? null,
		outputTokens: result?.usage?.outputTokens ?? null,
		costUsd: result?.usage?.costUsd ?? null,
		durationMs: result?.durationMs ?? null,
	};
}

/** The arm of a run that did not finish. The verdict holds the reason; nothing is judged. */
function errorArm(reason: string, result?: AgentEvalExecutionResult): AgentProposalCaseArm {
	const verdict: AgentEvalVerdict = {
		status: 'error',
		outcome: null,
		reasoning: reason.slice(0, MAX_ERROR_CHARS),
	};
	return { status: 'error', answer: null, verdict, toolCalls: [], usage: armUsage(result) };
}
