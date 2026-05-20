import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { analyzeAgentEvalInputColumns } from './analyze-agent-input-columns.service';
import {
	extractJsonColumnRefs,
	extractNamedRefMatches,
	isRecord,
	nodeHasName,
	nodeTypeEndsWith,
	unique,
	type WorkflowNode,
} from './column-ref-utils';
import { detectAiNodes } from './detect-ai-nodes';

export interface EvalDataTarget {
	dataTableId: string;
	evaluationTriggerName: string;
	targetNodeName?: string;
	targetAgentNodeName?: string;
	inputColumns: string[];
	expectedOutputColumns: string[];
	actualOutputColumns: string[];
	metricNodeNames: string[];
	/**
	 * Pairs from setMetrics nodes: for each metric, the expected_* column
	 * (read from the eval trigger row via `expectedAnswer`) and the agent
	 * output field (read from $json via `actualAnswer`). Used by eval-data
	 * to populate expected_* columns from a past execution's agent output.
	 */
	expectedToActualPairs: Array<{ expectedColumn: string; actualField: string }>;
}

export interface EvalDataRequirements {
	targets: EvalDataTarget[];
	reason?: string;
}

function readOperation(node: WorkflowNode): string | undefined {
	const parameters = node.parameters;
	if (!isRecord(parameters)) return undefined;
	const operation = parameters.operation;
	return typeof operation === 'string' ? operation : undefined;
}

function readDataTableId(node: WorkflowNode): string | undefined {
	const parameters = node.parameters;
	if (!isRecord(parameters)) return undefined;
	const dataTableId = parameters.dataTableId;
	if (typeof dataTableId === 'string') return dataTableId;
	if (!isRecord(dataTableId)) return undefined;
	const value = dataTableId.value;
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function childNames(workflow: WorkflowJSON, sourceName: string, outputIndex?: number): string[] {
	const connectionsByType = workflow.connections?.[sourceName];
	if (!connectionsByType || typeof connectionsByType !== 'object') return [];
	const main = (connectionsByType as Record<string, unknown>).main;
	if (!Array.isArray(main)) return [];
	const slots =
		outputIndex === undefined
			? main
			: [main[outputIndex]].filter((slot): slot is unknown[] => Array.isArray(slot));
	return unique(
		slots.flatMap((slot) => {
			if (!Array.isArray(slot)) return [];
			return slot.flatMap((connection) => {
				if (!isRecord(connection)) return [];
				const node = connection.node;
				return typeof node === 'string' ? [node] : [];
			});
		}),
	);
}

function collectReachableNodeNames(workflow: WorkflowJSON, startName: string): string[] {
	const seen = new Set<string>();
	const queue = [startName];
	while (queue.length > 0) {
		const current = queue.shift();
		if (!current || seen.has(current)) continue;
		seen.add(current);
		for (const child of childNames(workflow, current)) {
			if (!seen.has(child)) queue.push(child);
		}
	}
	seen.delete(startName);
	return [...seen];
}

function nodeByName(workflow: WorkflowJSON): Map<string, WorkflowNode> {
	return new Map(workflow.nodes.filter(nodeHasName).map((node) => [node.name, node]));
}

function isAiAgentNode(node: WorkflowNode | undefined): boolean {
	return Boolean(node?.type.includes('n8n-nodes-langchain.agent'));
}

function isAiAgentNodeName(
	byName: Map<string, WorkflowNode>,
	nodeName: string | undefined,
): nodeName is string {
	return typeof nodeName === 'string' && isAiAgentNode(byName.get(nodeName));
}

function extractEvalTriggerColumnRefs(text: string): string[] {
	return unique([
		...extractJsonColumnRefs(text),
		...extractNamedRefMatches(text).map((match) => match.field),
	]);
}

function expectedColumnsFromMetricNodes(nodes: WorkflowNode[]): string[] {
	return unique(
		nodes.flatMap((node) => {
			if (!nodeTypeEndsWith(node, 'evaluation') || readOperation(node) !== 'setMetrics') return [];
			const parameters = node.parameters;
			if (!isRecord(parameters)) return [];
			const expectedRawValues = [parameters.expectedAnswer, parameters.expectedTools];
			return expectedRawValues.flatMap((expectedRaw) =>
				typeof expectedRaw === 'string' ? extractEvalTriggerColumnRefs(expectedRaw) : [],
			);
		}),
	);
}

function actualColumnsFromSetOutputs(nodes: WorkflowNode[]): string[] {
	return unique(
		nodes.flatMap((node) => {
			if (!nodeTypeEndsWith(node, 'evaluation') || readOperation(node) !== 'setOutputs') return [];
			const parameters = node.parameters;
			if (!isRecord(parameters)) return [];
			const outputs = parameters.outputs;
			if (!isRecord(outputs)) return [];
			const values = outputs.values;
			if (!Array.isArray(values)) return [];
			return values.flatMap((value) => {
				if (!isRecord(value)) return [];
				const outputName = value.outputName;
				return typeof outputName === 'string' ? [outputName] : [];
			});
		}),
	);
}

function pairsFromMetricNodes(
	nodes: WorkflowNode[],
): Array<{ expectedColumn: string; actualField: string }> {
	const pairs: Array<{ expectedColumn: string; actualField: string }> = [];
	for (const node of nodes) {
		if (!nodeTypeEndsWith(node, 'evaluation') || readOperation(node) !== 'setMetrics') continue;
		const parameters = node.parameters;
		if (!isRecord(parameters)) continue;
		const expectedRaw = parameters.expectedAnswer;
		const actualRaw = parameters.actualAnswer;
		if (typeof expectedRaw !== 'string' || typeof actualRaw !== 'string') continue;
		const expectedRefs = extractEvalTriggerColumnRefs(expectedRaw).filter((ref) =>
			ref.startsWith('expected'),
		);
		const actualRefs = extractJsonColumnRefs(actualRaw);
		const len = Math.min(expectedRefs.length, actualRefs.length);
		for (let i = 0; i < len; i++) {
			pairs.push({ expectedColumn: expectedRefs[i], actualField: actualRefs[i] });
		}
	}
	// Dedup by expectedColumn (last one wins). Multiple setMetrics nodes may
	// reference the same expected column; the actualField mapping should be
	// consistent in that case.
	const map = new Map<string, string>();
	for (const p of pairs) map.set(p.expectedColumn, p.actualField);
	return [...map.entries()].map(([expectedColumn, actualField]) => ({
		expectedColumn,
		actualField,
	}));
}

function firstReachableAgentName(
	workflow: WorkflowJSON,
	evalTriggerName: string,
): string | undefined {
	const byName = nodeByName(workflow);
	return collectReachableNodeNames(workflow, evalTriggerName).find((name) =>
		isAiAgentNode(byName.get(name)),
	);
}

function firstReachableTargetNodeName(
	workflow: WorkflowJSON,
	evalTriggerName: string,
): string | undefined {
	const reachableNodeNames = collectReachableNodeNames(workflow, evalTriggerName);
	const reachableNameSet = new Set(reachableNodeNames);
	const reachableNodes = (workflow.nodes ?? []).filter(
		(node): node is WorkflowNode & { name: string } =>
			nodeHasName(node) && reachableNameSet.has(node.name),
	);
	const aiNodeNames = new Set(detectAiNodes({ ...workflow, nodes: reachableNodes }).aiNodeNames);

	return reachableNodeNames.find((name) => aiNodeNames.has(name));
}

function resolveTargetAgentName(
	workflow: WorkflowJSON,
	evalTriggerName: string,
	requestedTargetAgentNodeName?: string,
): string | undefined {
	const byName = nodeByName(workflow);
	if (requestedTargetAgentNodeName !== undefined) {
		const reachableNames = new Set(collectReachableNodeNames(workflow, evalTriggerName));
		const isReachableTarget =
			reachableNames.has(requestedTargetAgentNodeName) &&
			isAiAgentNodeName(byName, requestedTargetAgentNodeName);
		return isReachableTarget ? requestedTargetAgentNodeName : undefined;
	}
	return firstReachableAgentName(workflow, evalTriggerName);
}

export function analyzeEvalDataRequirements(
	workflow: WorkflowJSON,
	targetAgentNodeName?: string,
): EvalDataRequirements {
	const evaluationTriggers = (workflow.nodes ?? []).filter(
		(node): node is WorkflowNode & { name: string } =>
			nodeHasName(node) && nodeTypeEndsWith(node, 'evaluationTrigger'),
	);
	if (evaluationTriggers.length === 0) {
		return { targets: [], reason: 'Workflow has no EvaluationTrigger nodes.' };
	}

	const targets = evaluationTriggers.flatMap((trigger) => {
		const dataTableId = readDataTableId(trigger);
		if (!dataTableId) return [];

		const reachableNames = new Set(collectReachableNodeNames(workflow, trigger.name));
		const reachableNodes = (workflow.nodes ?? []).filter(
			(node): node is WorkflowNode & { name: string } =>
				nodeHasName(node) && reachableNames.has(node.name),
		);
		const metricNodeNames = reachableNodes
			.filter(
				(node) => nodeTypeEndsWith(node, 'evaluation') && readOperation(node) === 'setMetrics',
			)
			.map((node) => node.name);

		const targetNodeName = firstReachableTargetNodeName(workflow, trigger.name);
		const resolvedTargetAgentNodeName = resolveTargetAgentName(
			workflow,
			trigger.name,
			targetAgentNodeName,
		);
		const inputTargetNodeName =
			resolvedTargetAgentNodeName ??
			(targetAgentNodeName === undefined ? targetNodeName : undefined);

		return [
			{
				dataTableId,
				evaluationTriggerName: trigger.name,
				targetNodeName,
				targetAgentNodeName: resolvedTargetAgentNodeName,
				inputColumns: inputTargetNodeName
					? analyzeAgentEvalInputColumns(workflow, inputTargetNodeName).inputColumns
					: [],
				expectedOutputColumns: expectedColumnsFromMetricNodes(reachableNodes),
				actualOutputColumns: actualColumnsFromSetOutputs(reachableNodes),
				metricNodeNames,
				expectedToActualPairs: pairsFromMetricNodes(reachableNodes),
			},
		];
	});

	if (targets.length === 0) {
		return {
			targets: [],
			reason: 'Workflow has EvaluationTrigger nodes, but none are wired to a DataTable id.',
		};
	}

	return { targets };
}
