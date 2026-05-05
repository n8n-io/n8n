import type { WorkflowJSON } from '@n8n/workflow-sdk';

type WorkflowNode = WorkflowJSON['nodes'][number];

export interface EvalDataTarget {
	dataTableId: string;
	evaluationTriggerName: string;
	targetAgentNodeName?: string;
	inputColumns: string[];
	expectedOutputColumns: string[];
	actualOutputColumns: string[];
	metricNodeNames: string[];
}

export interface EvalDataRequirements {
	targets: EvalDataTarget[];
	reason?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function unique(values: string[]): string[] {
	return [...new Set(values.filter((value) => value.length > 0))];
}

function nodeTypeEndsWith(node: WorkflowNode, suffix: string): boolean {
	return node.type === suffix || node.type.endsWith(`.${suffix}`);
}

function nodeHasName(node: WorkflowNode): node is WorkflowNode & { name: string } {
	return typeof node.name === 'string' && node.name.length > 0;
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

function collectStrings(value: unknown): string[] {
	if (typeof value === 'string') return [value];
	if (Array.isArray(value)) return value.flatMap(collectStrings);
	if (!isRecord(value)) return [];
	return Object.values(value).flatMap(collectStrings);
}

function extractJsonColumnRefs(text: string): string[] {
	const refs: string[] = [];
	const patterns = [
		/\$json\.([A-Za-z_][A-Za-z0-9_]*)/g,
		/\.item\.json\.([A-Za-z_][A-Za-z0-9_]*)/g,
		/item\.json\.([A-Za-z_][A-Za-z0-9_]*)/g,
	];
	for (const pattern of patterns) {
		for (const match of text.matchAll(pattern)) {
			if (match[1]) refs.push(match[1]);
		}
	}
	return unique(refs);
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

function inputColumnsFromShapeBridge(workflow: WorkflowJSON, evalTriggerName: string): string[] {
	const byName = nodeByName(workflow);
	const directChildren = childNames(workflow, evalTriggerName);
	const setNodes = directChildren
		.map((name) => byName.get(name))
		.filter((node): node is WorkflowNode => Boolean(node && nodeTypeEndsWith(node, 'set')));
	return unique(
		setNodes.flatMap((node) =>
			collectStrings(node.parameters).flatMap((text) => extractJsonColumnRefs(text)),
		),
	);
}

function expectedColumnsFromMetricNodes(nodes: WorkflowNode[]): string[] {
	return unique(
		nodes.flatMap((node) => {
			if (!nodeTypeEndsWith(node, 'evaluation') || readOperation(node) !== 'setMetrics') return [];
			return collectStrings(node.parameters)
				.filter((text) => text.includes('.item.json.') || text.includes('item.json.'))
				.flatMap((text) => extractJsonColumnRefs(text));
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

function firstReachableAgentName(
	workflow: WorkflowJSON,
	evalTriggerName: string,
): string | undefined {
	const byName = nodeByName(workflow);
	return collectReachableNodeNames(workflow, evalTriggerName).find((name) =>
		isAiAgentNode(byName.get(name)),
	);
}

export function analyzeEvalDataRequirements(workflow: WorkflowJSON): EvalDataRequirements {
	const evaluationTriggers = workflow.nodes.filter(
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
		const reachableNodes = workflow.nodes.filter(
			(node): node is WorkflowNode & { name: string } =>
				nodeHasName(node) && reachableNames.has(node.name),
		);
		const metricNodeNames = reachableNodes
			.filter(
				(node) => nodeTypeEndsWith(node, 'evaluation') && readOperation(node) === 'setMetrics',
			)
			.map((node) => node.name);

		return [
			{
				dataTableId,
				evaluationTriggerName: trigger.name,
				targetAgentNodeName: firstReachableAgentName(workflow, trigger.name),
				inputColumns: inputColumnsFromShapeBridge(workflow, trigger.name),
				expectedOutputColumns: expectedColumnsFromMetricNodes(reachableNodes),
				actualOutputColumns: actualColumnsFromSetOutputs(reachableNodes),
				metricNodeNames,
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
