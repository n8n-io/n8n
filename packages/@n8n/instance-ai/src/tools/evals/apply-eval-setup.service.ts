import type { InstanceAiEvalMetricProposal } from '@n8n/api-types';
import type { NodeJSON, WorkflowJSON } from '@n8n/workflow-sdk';
import { nanoid } from 'nanoid';

import { generateSampleRows } from './generate-sample-rows.service';
import {
	findFirstProcessingNodeName,
	findMainTriggerName,
	findTerminalNodeNames,
} from './graph-helpers';
import type { EvalShape } from './infer-eval-shape.service';
import type { InstanceAiContext } from '../../types';

const EVAL_TRIGGER_TYPE = 'n8n-nodes-base.evaluationTrigger';
const EVAL_NODE_TYPE = 'n8n-nodes-base.evaluation';
const MERGE_NODE_TYPE = 'n8n-nodes-base.merge';
const EVAL_TRIGGER_VERSION = 4.7;
const EVAL_NODE_VERSION = 4.8;
const MERGE_NODE_VERSION = 3;

const EVAL_TRIGGER_NAME = 'EvaluationTrigger';
const SET_OUTPUTS_NAME = 'EvaluationSetOutputs';
const SET_METRICS_NAME = 'EvaluationSetMetrics';
const MERGE_NODE_NAME = 'EvalMerge';

export interface ApplyEvalSetupInput {
	workflowId: string;
	projectId?: string;
	userChoice: {
		datasetChoice: 'generate' | 'link-existing' | 'later';
		existingDataTableId?: string;
		enabledMetricIds: string[];
	};
	proposal: EvalShape;
}

export interface ApplyEvalSetupResult {
	success: boolean;
	evalTriggerNodeName?: string;
	dataTableId?: string;
	errors?: string[];
}

function setConn(
	connections: Record<
		string,
		Record<string, Array<Array<{ node: string; type: string; index: number }>>>
	>,
	from: string,
	toNode: string,
): void {
	connections[from] = { main: [[{ node: toNode, type: 'main', index: 0 }]] };
}

function findNode(wf: WorkflowJSON, name: string): NodeJSON | undefined {
	return (wf.nodes ?? []).find((n) => n.name === name);
}

function resolveMetricsParameters(
	enabledMetricIds: string[],
	proposal: EvalShape,
): Record<string, unknown> {
	const metrics: Array<Record<string, unknown>> = [];
	for (const id of enabledMetricIds) {
		const m = proposal.suggestedMetrics.find((p) => p.id === id);
		if (!m) continue;
		metrics.push(buildMetricParameter(m));
	}
	return { metrics };
}

function buildMetricParameter(metric: InstanceAiEvalMetricProposal): Record<string, unknown> {
	if (metric.kind === 'llm-judge') {
		return {
			name: metric.name,
			type: 'llm-judge',
			prompt: metric.prompt ?? '',
			cannedKey: metric.cannedMetricKey,
		};
	}
	return { name: metric.name, type: metric.kind };
}

export async function applyEvalSetup(
	ctx: InstanceAiContext,
	input: ApplyEvalSetupInput,
): Promise<ApplyEvalSetupResult> {
	const wf = await ctx.workflowService.getAsWorkflowJSON(input.workflowId);
	const triggerName = findMainTriggerName(wf);
	if (!triggerName) {
		return { success: false, errors: ['Workflow has no main trigger to branch from.'] };
	}
	const firstProcessing = findFirstProcessingNodeName(wf, triggerName);
	if (!firstProcessing) {
		return {
			success: false,
			errors: ['Main trigger has no outgoing main connection — cannot wire EvaluationTrigger.'],
		};
	}
	const terminalsRaw = findTerminalNodeNames(wf, triggerName);
	// Sort terminals by position (top-to-bottom, left-to-right) for deterministic merge ordering.
	const terminals = [...terminalsRaw].sort((a, b) => {
		const na = findNode(wf, a);
		const nb = findNode(wf, b);
		const ya = na?.position?.[1] ?? 0;
		const yb = nb?.position?.[1] ?? 0;
		if (ya !== yb) return ya - yb;
		const xa = na?.position?.[0] ?? 0;
		const xb = nb?.position?.[0] ?? 0;
		return xa - xb;
	});
	if (terminals.length === 0) {
		return {
			success: false,
			errors: [
				'Could not identify a point to attach eval capture — please wire Evaluation nodes manually.',
			],
		};
	}

	let createdDataTableId: string | undefined;
	try {
		let dataTableId: string | undefined;
		if (input.userChoice.datasetChoice === 'link-existing') {
			dataTableId = input.userChoice.existingDataTableId;
		} else if (input.userChoice.datasetChoice === 'generate') {
			const columns = [
				...input.proposal.suggestedInputColumns,
				...input.proposal.suggestedOutputColumns,
			];
			const dt = await ctx.dataTableService.create(
				`${wf.name ?? 'Workflow'} — eval samples`,
				columns.map((n) => ({ name: n, type: 'string' as const })),
				input.projectId ? { projectId: input.projectId } : undefined,
			);
			createdDataTableId = dt.id;
			dataTableId = dt.id;
			const rows = await generateSampleRows(wf, columns, 3);
			await ctx.dataTableService.insertRows(dt.id, rows);
		}

		const connections = (wf.connections ?? {}) as Record<
			string,
			Record<string, Array<Array<{ node: string; type: string; index: number }>>>
		>;
		wf.connections = connections;

		// Build the new nodes
		const triggerNode = findNode(wf, triggerName);
		const triggerPos: [number, number] = triggerNode?.position ?? [0, 0];
		const firstProcNode = findNode(wf, firstProcessing);

		const evalTrigger: NodeJSON = {
			id: nanoid(),
			name: EVAL_TRIGGER_NAME,
			type: EVAL_TRIGGER_TYPE,
			typeVersion: EVAL_TRIGGER_VERSION,
			position: [triggerPos[0], triggerPos[1] - 200],
			parameters: {
				source: 'dataTable',
				...(dataTableId ? { dataTableId: { mode: 'id', value: dataTableId } } : {}),
			},
		};

		// Determine attach point
		let attachPoint: string;
		if (terminals.length === 1) {
			attachPoint = terminals[0];
		} else {
			const mergeNode: NodeJSON = {
				id: nanoid(),
				name: MERGE_NODE_NAME,
				type: MERGE_NODE_TYPE,
				typeVersion: MERGE_NODE_VERSION,
				position: [(firstProcNode?.position?.[0] ?? 0) + 600, firstProcNode?.position?.[1] ?? 0],
				parameters: { mode: 'append', numberInputs: terminals.length },
			};
			wf.nodes = [...(wf.nodes ?? []), mergeNode];
			for (const [i, terminalName] of terminals.entries()) {
				connections[terminalName] = { main: [[{ node: MERGE_NODE_NAME, type: 'main', index: i }]] };
			}
			attachPoint = MERGE_NODE_NAME;
		}

		const attachNode = findNode(wf, attachPoint);
		const baseX = (attachNode?.position?.[0] ?? 0) + 200;
		const baseY = attachNode?.position?.[1] ?? 0;

		const setOutputs: NodeJSON = {
			id: nanoid(),
			name: SET_OUTPUTS_NAME,
			type: EVAL_NODE_TYPE,
			typeVersion: EVAL_NODE_VERSION,
			position: [baseX, baseY],
			parameters: {
				operation: 'setOutputs',
				outputs: {
					values: input.proposal.suggestedOutputColumns.map((c) => ({
						name: c,
						value: `={{ $json.${c} }}`,
					})),
				},
			},
		};
		const setMetrics: NodeJSON = {
			id: nanoid(),
			name: SET_METRICS_NAME,
			type: EVAL_NODE_TYPE,
			typeVersion: EVAL_NODE_VERSION,
			position: [baseX + 200, baseY],
			parameters: {
				operation: 'setMetrics',
				...resolveMetricsParameters(input.userChoice.enabledMetricIds, input.proposal),
			},
		};

		wf.nodes = [...(wf.nodes ?? []), evalTrigger, setOutputs, setMetrics];

		// Wire connections
		setConn(connections, EVAL_TRIGGER_NAME, firstProcessing);
		setConn(connections, attachPoint, SET_OUTPUTS_NAME);
		setConn(connections, SET_OUTPUTS_NAME, SET_METRICS_NAME);

		await ctx.workflowService.updateFromWorkflowJSON(input.workflowId, wf);

		return {
			success: true,
			evalTriggerNodeName: EVAL_TRIGGER_NAME,
			...(dataTableId ? { dataTableId } : {}),
		};
	} catch (error) {
		if (createdDataTableId) {
			try {
				await ctx.dataTableService.delete(createdDataTableId);
			} catch {
				// Best-effort rollback; surface the original error regardless.
			}
		}
		return {
			success: false,
			errors: [error instanceof Error ? error.message : String(error)],
		};
	}
}
