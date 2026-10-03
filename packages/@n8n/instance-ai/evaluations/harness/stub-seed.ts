// ---------------------------------------------------------------------------
// Seeded state for the in-process stub instance (`stub-services.ts`).
//
// The stub normally holds nothing: no workflows, no executions, no tables. A
// routing case can seed workflows, data tables, and failed prior runs, so the
// orchestrator's read tools find what a real instance would hold. This module
// turns the authored seed into the shapes those services return. It keeps no
// state of its own beyond what a service asks it to track.
// ---------------------------------------------------------------------------

import { isRecord } from '@n8n/utils/is-record';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { jsonParse } from 'n8n-workflow';

import type {
	DataTableColumnInfo,
	DataTableSummary,
	ExecutionDebugInfo,
	ExecutionResult,
	ExecutionSummary,
	WorkflowDetail,
	WorkflowSummary,
} from '../../src/types';

/** The seed slots the stub instance can serve. Same field shapes as an inline case seed. */
export interface StubInstanceSeed {
	workflows?: Array<{
		id: string;
		name: string;
		nodes: Array<Record<string, unknown>>;
		connections: Record<string, unknown>;
		published?: boolean;
	}>;
	dataTables?: Array<{
		id: string;
		name: string;
		columns: Array<{ name: string; type: 'string' | 'number' | 'boolean' | 'date' }>;
	}>;
	priorRuns?: Array<{ workflow: string; hints?: string }>;
}

/** The error a prior run reports when the case gives no `hints`. */
export const DEFAULT_PRIOR_RUN_ERROR = 'The execution failed.';

/** Prior runs are spaced this far apart, the latest one this long before the stub starts. */
const PRIOR_RUN_SPACING_MS = 60 * 60 * 1000;

/** How long each prior run lasted. */
const PRIOR_RUN_DURATION_MS = 2_000;

/** The seed id a prior run execution carries, `seed-exec-1` for the first. */
export function priorRunExecutionId(index: number): string {
	return `seed-exec-${String(index + 1)}`;
}

/**
 * Converts a seeded workflow to the WorkflowJSON the build and code tools read.
 * A node without an id, a position, or a type version gets a stable default,
 * so code generation and structure summaries do not fail on a sparse fixture.
 */
export function seedWorkflowToJSON(workflow: NonNullable<StubInstanceSeed['workflows']>[number]) {
	const nodes = workflow.nodes.map((node, index) => {
		if (typeof node.type !== 'string' || node.type.length === 0) {
			throw new Error(`Seed workflow "${workflow.id}" node ${String(index)} has no "type"`);
		}
		return {
			...node,
			id:
				typeof node.id === 'string' && node.id.length > 0 ? node.id : `seed-node-${String(index)}`,
			typeVersion: typeof node.typeVersion === 'number' ? node.typeVersion : 1,
			position: isPosition(node.position) ? node.position : [index * 220, 0],
			parameters: isRecord(node.parameters) ? node.parameters : {},
		};
	});
	// The fixture is plain JSON checked above; the round trip drops its source type.
	return jsonParse<WorkflowJSON>(
		JSON.stringify({
			id: workflow.id,
			name: workflow.name,
			nodes,
			connections: workflow.connections,
		}),
	);
}

function isPosition(value: unknown): value is [number, number] {
	return (
		Array.isArray(value) &&
		value.length === 2 &&
		typeof value[0] === 'number' &&
		typeof value[1] === 'number'
	);
}

export function seededWorkflowSummary(
	json: WorkflowJSON,
	opts: { versionId: string; activeVersionId: string | null; createdAt: string },
): WorkflowSummary {
	return {
		id: json.id ?? '',
		name: json.name,
		versionId: opts.versionId,
		activeVersionId: opts.activeVersionId,
		isArchived: false,
		createdAt: opts.createdAt,
		updatedAt: opts.createdAt,
	};
}

export function seededWorkflowDetail(
	json: WorkflowJSON,
	opts: { versionId: string; activeVersionId: string | null; createdAt: string },
): WorkflowDetail {
	return {
		...seededWorkflowSummary(json, opts),
		nodes: json.nodes.map((node) => ({ ...node, name: node.name ?? node.id })),
		connections: json.connections,
	};
}

/** Filters seeded workflows the way the real list does: by name query, node type, and status. */
export function filterSeededWorkflows(
	workflows: WorkflowJSON[],
	options: { query?: string; status?: string; nodeTypes?: string[] } = {},
): { inScope: WorkflowJSON[]; matching: WorkflowJSON[] } {
	// Seeded workflows are never archived.
	if (options.status === 'archived') return { inScope: [], matching: [] };
	const nodeTypes = options.nodeTypes ?? [];
	const inScope =
		nodeTypes.length === 0
			? workflows
			: workflows.filter((json) => json.nodes.some((node) => nodeTypes.includes(node.type)));
	const query = options.query?.trim().toLowerCase();
	const matching = query
		? inScope.filter((json) => json.name.toLowerCase().includes(query))
		: inScope;
	return { inScope, matching };
}

export function seededDataTableSummary(
	table: NonNullable<StubInstanceSeed['dataTables']>[number],
	createdAt: string,
): DataTableSummary {
	return {
		id: table.id,
		name: table.name,
		columns: table.columns.map((column, index) => ({
			id: `${table.id}-col-${String(index)}`,
			name: column.name,
			type: column.type,
		})),
		createdAt,
		updatedAt: createdAt,
	};
}

export function seededDataTableSchema(
	table: NonNullable<StubInstanceSeed['dataTables']>[number],
): DataTableColumnInfo[] {
	return table.columns.map((column, index) => ({
		id: `${table.id}-col-${String(index)}`,
		name: column.name,
		type: column.type,
		index,
	}));
}

/** One failed execution the stub reports for a seeded prior run. */
export interface SeededExecution {
	id: string;
	workflowId: string;
	workflowName: string;
	error: string;
	startedAt: string;
	finishedAt: string;
	/** The seeded node the hints name, when they name one. */
	failedNode?: { name: string; type: string };
}

/**
 * Builds one failed execution per prior run, in declared order, ending an
 * hour before `now`. The hints are the error message. When the hints name a
 * node of the workflow, that node is reported as the one that failed.
 */
export function buildSeededExecutions(
	priorRuns: NonNullable<StubInstanceSeed['priorRuns']>,
	workflowsById: Map<string, WorkflowJSON>,
	now: number,
): SeededExecution[] {
	return priorRuns.map((priorRun, index) => {
		const workflow = workflowsById.get(priorRun.workflow);
		if (!workflow) {
			throw new Error(`Prior run names seed workflow "${priorRun.workflow}", which is not seeded`);
		}
		const started = now - (priorRuns.length - index) * PRIOR_RUN_SPACING_MS;
		const error = priorRun.hints ?? DEFAULT_PRIOR_RUN_ERROR;
		const failedNode = findNamedNode(workflow, error);
		return {
			id: priorRunExecutionId(index),
			workflowId: priorRun.workflow,
			workflowName: workflow.name,
			error,
			startedAt: new Date(started).toISOString(),
			finishedAt: new Date(started + PRIOR_RUN_DURATION_MS).toISOString(),
			...(failedNode ? { failedNode } : {}),
		};
	});
}

/** The node whose name the text mentions; the longest name wins, so "Send email" beats "Send". */
function findNamedNode(
	workflow: WorkflowJSON,
	text: string,
): { name: string; type: string } | undefined {
	const lower = text.toLowerCase();
	let found: { name: string; type: string } | undefined;
	for (const node of workflow.nodes) {
		const name = node.name;
		if (!name || !lower.includes(name.toLowerCase())) continue;
		if (!found || name.length > found.name.length) found = { name, type: node.type };
	}
	return found;
}

/** Newest first, like the real execution list. */
export function listSeededExecutions(
	executions: SeededExecution[],
	options: { workflowId?: string; status?: string; limit?: number } = {},
	workflowVersionId: string,
): ExecutionSummary[] {
	// Every seeded run failed, so a status filter keeps all of them or none.
	if (options.status !== undefined && options.status !== 'error') return [];
	return executions
		.filter((execution) => !options.workflowId || execution.workflowId === options.workflowId)
		.reverse()
		.slice(0, options.limit ?? executions.length)
		.map((execution) => ({
			id: execution.id,
			workflowId: execution.workflowId,
			workflowName: execution.workflowName,
			status: 'error',
			startedAt: execution.startedAt,
			finishedAt: execution.finishedAt,
			mode: 'trigger',
			workflowVersionId,
		}));
}

export function seededExecutionResult(
	execution: SeededExecution,
	workflowVersionId: string,
): ExecutionResult {
	return {
		executionId: execution.id,
		status: 'error',
		error: execution.error,
		startedAt: execution.startedAt,
		finishedAt: execution.finishedAt,
		workflowVersionId,
		...(execution.failedNode
			? {
					lastNodeExecuted: execution.failedNode.name,
					nodeErrors: [{ nodeName: execution.failedNode.name, message: execution.error }],
				}
			: {}),
	};
}

export function seededExecutionDebugInfo(
	execution: SeededExecution,
	workflowVersionId: string,
): ExecutionDebugInfo {
	const { failedNode } = execution;
	return {
		...seededExecutionResult(execution, workflowVersionId),
		...(failedNode ? { failedNode: { ...failedNode, error: execution.error } } : {}),
		nodeTrace: failedNode
			? [
					{
						...failedNode,
						status: 'error',
						startedAt: execution.startedAt,
						finishedAt: execution.finishedAt,
					},
				]
			: [],
	};
}
