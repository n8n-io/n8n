import type { WorkflowNodeResponse, WorkflowResponse } from '../clients/n8n-client';
import type {
	TopologyFinding,
	TopologyTargetExpectation,
	TopologyTargetResult,
	TopologyVerifierInput,
	TopologyVerifierResult,
	WorkflowConnection,
	WorkflowConnections,
} from './types';
import { toWorkflowConnections } from './types';

const EVAL_TRIGGER_NODE_TYPE = 'n8n-nodes-base.evaluationTrigger';
const EVALUATION_NODE_TYPE = 'n8n-nodes-base.evaluation';
const SET_NODE_TYPE = 'n8n-nodes-base.set';

const LANGUAGE_MODEL_CONNECTION_TYPE = 'ai_languageModel';

const CHECK_IF_EVALUATING_OPERATION = 'checkIfEvaluating';
const SET_OUTPUTS_OPERATION = 'setOutputs';
const SET_METRICS_OPERATION = 'setMetrics';

const DEFAULT_EXPECTED_OUTPUT_COLUMN = 'expected_output';
const DEFAULT_ACTUAL_OUTPUT_COLUMN = 'actual_output';

const METRICS_REQUIRING_LANGUAGE_MODEL = new Set(['correctness', 'helpfulness']);
const METRICS_REQUIRING_EXPECTED_ANSWER = new Set([
	'correctness',
	'stringSimilarity',
	'categorization',
]);

interface EffectiveTargetExpectation {
	nodeName: string;
	inputColumns: string[];
	expectedShape?: Record<string, string>;
	expectedOutputColumns: string[];
	actualOutputColumns: string[];
	sideEffectNodes: string[];
	hasSidecarExpectedShape: boolean;
}

function finding(code: string, message: string, nodeName?: string): TopologyFinding {
	return { severity: 'error', code, message, nodeName };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getNodeByName(
	workflow: WorkflowResponse,
	nodeName: string,
): WorkflowNodeResponse | undefined {
	return workflow.nodes.find((node) => node.name === nodeName);
}

function getStringParameter(node: WorkflowNodeResponse, key: string): string | undefined {
	const value = node.parameters?.[key];
	return typeof value === 'string' ? value : undefined;
}

function getDataTableIdValue(node: WorkflowNodeResponse): string | undefined {
	const dataTableId = node.parameters?.dataTableId;

	if (typeof dataTableId === 'string') {
		return dataTableId;
	}

	if (!isRecord(dataTableId)) {
		return undefined;
	}

	const value = dataTableId.value;
	return typeof value === 'string' ? value : undefined;
}

export function getTargetsByType(
	connections: WorkflowConnections,
	sourceNodeName: string,
	connectionType: string,
): WorkflowConnection[] {
	const outputs = connections[sourceNodeName]?.[connectionType] ?? [];

	return outputs.flatMap((output) => output ?? []);
}

export function getMainTargets(
	connections: WorkflowConnections,
	sourceNodeName: string,
	outputIndex?: number,
): string[] {
	const outputs = connections[sourceNodeName]?.main ?? [];
	const selectedOutputs = outputIndex === undefined ? outputs : [outputs[outputIndex]];

	return selectedOutputs.flatMap((output) => output?.map((connection) => connection.node) ?? []);
}

export function reachableFrom(workflow: WorkflowResponse, startNodeNames: string[]): Set<string> {
	const connections = toWorkflowConnections(workflow.connections);
	const reachable = new Set<string>();
	const queue = [...startNodeNames];

	while (queue.length > 0) {
		const nodeName = queue.shift();

		if (!nodeName || reachable.has(nodeName)) {
			continue;
		}

		reachable.add(nodeName);

		for (const nextNodeName of getMainTargets(connections, nodeName)) {
			if (!reachable.has(nextNodeName)) {
				queue.push(nextNodeName);
			}
		}
	}

	return reachable;
}

export function hasConnectionTo(
	workflow: WorkflowResponse,
	source: string,
	target: string,
	connectionType: string,
): boolean {
	const connections = toWorkflowConnections(workflow.connections);

	return getTargetsByType(connections, source, connectionType).some(
		(connection) => connection.node === target,
	);
}

function hasIncomingConnectionOfType(
	workflow: WorkflowResponse,
	target: string,
	connectionType: string,
): boolean {
	return workflow.nodes.some((node) =>
		hasConnectionTo(workflow, node.name, target, connectionType),
	);
}

function detectTargets(input: TopologyVerifierInput): string[] {
	const excludedTargets = new Set(input.sidecar.excludeTargets);

	if (input.sidecar.targets.length > 0) {
		return input.sidecar.targets
			.map((target) => target.nodeName)
			.filter((nodeName) => !excludedTargets.has(nodeName));
	}

	const connections = toWorkflowConnections(input.originalWorkflow.connections);
	const mainInputNodeNames = new Set<string>();

	for (const nodeConnections of Object.values(connections)) {
		for (const connection of nodeConnections.main?.flatMap((output) => output ?? []) ?? []) {
			mainInputNodeNames.add(connection.node);
		}
	}

	return input.originalWorkflow.nodes
		.filter((node) => mainInputNodeNames.has(node.name))
		.filter((node) => isLikelyAiRootNode(node))
		.map((node) => node.name)
		.filter((nodeName) => !excludedTargets.has(nodeName));
}

function isLikelyAiRootNode(node: WorkflowNodeResponse): boolean {
	if (!node.type.startsWith('@n8n/n8n-nodes-langchain.')) {
		return false;
	}

	const type = node.type.toLowerCase();

	return !['trigger', 'lm', 'model', 'embedding', 'memory', 'tool'].some((excludedTypePart) =>
		type.includes(excludedTypePart),
	);
}

function findTargetExpectation(
	sidecarTargets: TopologyTargetExpectation[],
	nodeName: string,
): TopologyTargetExpectation | undefined {
	return sidecarTargets.find((target) => target.nodeName === nodeName);
}

function resolveEffectiveTargetExpectation(
	input: TopologyVerifierInput,
	nodeName: string,
): EffectiveTargetExpectation {
	const sidecarTarget = findTargetExpectation(input.sidecar.targets, nodeName);

	if (sidecarTarget) {
		return {
			nodeName,
			inputColumns: sidecarTarget.inputColumns,
			expectedShape: sidecarTarget.expectedShape,
			expectedOutputColumns: sidecarTarget.expectedOutputColumns,
			actualOutputColumns: sidecarTarget.actualOutputColumns,
			sideEffectNodes: sidecarTarget.sideEffectNodes,
			hasSidecarExpectedShape: sidecarTarget.expectedShape !== undefined,
		};
	}

	const expectedOutputColumns = input.datasetColumns.includes(DEFAULT_EXPECTED_OUTPUT_COLUMN)
		? [DEFAULT_EXPECTED_OUTPUT_COLUMN]
		: [];
	const actualOutputColumns = [DEFAULT_ACTUAL_OUTPUT_COLUMN];
	const outputColumns = new Set([...expectedOutputColumns, ...actualOutputColumns]);

	return {
		nodeName,
		inputColumns: input.datasetColumns.filter((column) => !outputColumns.has(column)),
		expectedOutputColumns,
		actualOutputColumns,
		sideEffectNodes: [],
		hasSidecarExpectedShape: false,
	};
}

function getAssignments(node: WorkflowNodeResponse): Array<{ name: string; value: string }> {
	const assignmentsContainer = node.parameters?.assignments;

	if (!isRecord(assignmentsContainer)) {
		return [];
	}

	const assignments = assignmentsContainer.assignments;

	if (!Array.isArray(assignments)) {
		return [];
	}

	return assignments.flatMap((assignment) => {
		if (!isRecord(assignment)) {
			return [];
		}

		const name = assignment.name;
		const value = assignment.value;

		if (typeof name !== 'string' || typeof value !== 'string') {
			return [];
		}

		return [{ name, value }];
	});
}

function referencesCurrentJsonColumn(value: string, columnName: string): boolean {
	const escapedColumnName = columnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const currentJsonReferencePrefix = String.raw`(?:^|[^\w$])\$json`;
	const dotReferencePattern = new RegExp(`${currentJsonReferencePrefix}\\.${escapedColumnName}\\b`);
	const bracketReferencePattern = new RegExp(
		`${currentJsonReferencePrefix}\\[["']${escapedColumnName}["']\\]`,
	);

	return dotReferencePattern.test(value) || bracketReferencePattern.test(value);
}

function referencesEvalTrigger(value: unknown): boolean {
	if (typeof value !== 'string') {
		return false;
	}

	return value.includes("$('Eval Trigger')") || value.includes('$("Eval Trigger")');
}

function referencesEvalTriggerJsonColumn(value: string, columnName: string): boolean {
	const escapedColumnName = columnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const evalTriggerReferencePattern = String.raw`\$\((?:"Eval Trigger"|'Eval Trigger')\)\.item\.json`;
	const dotReferencePattern = new RegExp(
		`${evalTriggerReferencePattern}\\.${escapedColumnName}\\b`,
	);
	const bracketReferencePattern = new RegExp(
		`${evalTriggerReferencePattern}\\[["']${escapedColumnName}["']\\]`,
	);

	return dotReferencePattern.test(value) || bracketReferencePattern.test(value);
}

function referencesNodeItemJson(value: unknown): boolean {
	return typeof value === 'string' && /\$\((?:"[^"]+"|'[^']+')\)\.item\.json\b/.test(value);
}

interface NodeItemJsonReference {
	nodeName: string;
	columnName?: string;
}

function getNodeItemJsonReferences(value: unknown): NodeItemJsonReference[] {
	if (typeof value !== 'string') {
		return [];
	}

	return [
		...value.matchAll(
			/\$\((?:"([^"]+)"|'([^']+)')\)\.item\.json\b(?:\.([A-Za-z_$][\w$]*)|\[["']([^"']+)["']\])?/g,
		),
	].map((match) => ({
		nodeName: match[1] ?? match[2],
		columnName: match[3] ?? match[4],
	}));
}

function getNodeItemJsonReferenceNames(value: unknown): string[] {
	return getNodeItemJsonReferences(value).map((reference) => reference.nodeName);
}

function referencesCurrentJson(value: unknown): boolean {
	return typeof value === 'string' && /(?:^|[^\w$])\$json(?![A-Za-z0-9_])/.test(value);
}

function getOutputNames(node: WorkflowNodeResponse): string[] {
	const outputs = node.parameters?.outputs;

	if (!isRecord(outputs) || !Array.isArray(outputs.values)) {
		return [];
	}

	return outputs.values.flatMap((output) => {
		if (!isRecord(output) || typeof output.outputName !== 'string') {
			return [];
		}

		return [output.outputName];
	});
}

function isEvaluationOperation(node: WorkflowNodeResponse, operation: string): boolean {
	return node.type === EVALUATION_NODE_TYPE && getStringParameter(node, 'operation') === operation;
}

function getEvaluationNodesInReach(
	workflow: WorkflowResponse,
	reachableNodeNames: Set<string>,
	operation: string,
): WorkflowNodeResponse[] {
	return workflow.nodes.filter(
		(node) => reachableNodeNames.has(node.name) && isEvaluationOperation(node, operation),
	);
}

function verifyGlobalTopology(
	input: TopologyVerifierInput,
	targetNodeNames: string[],
): TopologyFinding[] {
	const findings: TopologyFinding[] = [];
	const updatedNodeNames = new Set(input.updatedWorkflow.nodes.map((node) => node.name));

	for (const originalNode of input.originalWorkflow.nodes) {
		if (!updatedNodeNames.has(originalNode.name)) {
			findings.push(
				finding(
					'original_node_removed',
					`Original node "${originalNode.name}" is missing.`,
					originalNode.name,
				),
			);
		}
	}

	const evalTriggers = input.updatedWorkflow.nodes.filter(
		(node) => node.type === EVAL_TRIGGER_NODE_TYPE,
	);

	if (evalTriggers.length !== 1) {
		findings.push(
			finding(
				'eval_trigger_count',
				`Expected exactly one Eval Trigger node, found ${evalTriggers.length}.`,
			),
		);
	}

	const evalTrigger = evalTriggers[0];

	if (input.expectedDataTableId && evalTrigger) {
		const actualDataTableId = getDataTableIdValue(evalTrigger);

		if (actualDataTableId !== input.expectedDataTableId) {
			findings.push(
				finding(
					'eval_trigger_wrong_datatable',
					`Eval Trigger should use data table "${input.expectedDataTableId}".`,
					evalTrigger.name,
				),
			);
		}
	}

	if (targetNodeNames.length === 0) {
		findings.push(finding('target_detection_empty', 'No eval setup target nodes were found.'));
	}

	return findings;
}

function verifyShapeBridge(
	input: TopologyVerifierInput,
	target: EffectiveTargetExpectation,
	targetNodeName: string,
	evalTrigger: WorkflowNodeResponse | undefined,
	connections: WorkflowConnections,
): { bridge?: WorkflowNodeResponse; findings: TopologyFinding[] } {
	const findings: TopologyFinding[] = [];

	if (!evalTrigger) {
		findings.push(
			finding(
				'shape_bridge_missing',
				`No shape bridge connects Eval Trigger to "${targetNodeName}".`,
				targetNodeName,
			),
		);
		return { findings };
	}

	const evalTriggerTargets = getMainTargets(connections, evalTrigger.name);

	if (evalTriggerTargets.includes(targetNodeName)) {
		findings.push(
			finding(
				'shape_bridge_bypassed',
				`Eval Trigger connects directly to target "${targetNodeName}".`,
				targetNodeName,
			),
		);
	}

	const bridge = evalTriggerTargets
		.map((nodeName) => getNodeByName(input.updatedWorkflow, nodeName))
		.find(
			(node) =>
				node?.type === SET_NODE_TYPE &&
				getMainTargets(connections, node.name).includes(targetNodeName),
		);

	if (!bridge) {
		findings.push(
			finding(
				'shape_bridge_missing',
				`No shape bridge connects Eval Trigger to "${targetNodeName}".`,
				targetNodeName,
			),
		);
		return { findings };
	}

	const assignments = getAssignments(bridge);

	if (assignments.length === 0) {
		findings.push(finding('shape_bridge_empty', 'Shape bridge has no assignments.', bridge.name));
	}

	for (const assignment of assignments) {
		if (referencesNodeItemJson(assignment.value)) {
			findings.push(
				finding(
					'shape_bridge_uses_node_json',
					`Shape bridge assignment for "${assignment.name}" should not reference another node item JSON.`,
					bridge.name,
				),
			);
		}
	}

	for (const [runtimePath, expectedColumn] of Object.entries(target?.expectedShape ?? {})) {
		const assignment = assignments.find((candidate) => candidate.name === runtimePath);

		if (!assignment) {
			findings.push(
				finding(
					'shape_bridge_expected_path_missing',
					`Shape bridge is missing assignment for "${runtimePath}".`,
					bridge.name,
				),
			);
			continue;
		}

		if (
			!input.datasetColumns.includes(expectedColumn) ||
			!referencesCurrentJsonColumn(assignment.value, expectedColumn)
		) {
			findings.push(
				finding(
					'shape_bridge_expected_column_missing',
					`Shape bridge assignment for "${runtimePath}" does not reference "${expectedColumn}".`,
					bridge.name,
				),
			);
		}
	}

	if (
		!target.hasSidecarExpectedShape &&
		target.inputColumns.length > 0 &&
		!assignments.some((assignment) =>
			target.inputColumns.some((inputColumn) =>
				referencesCurrentJsonColumn(assignment.value, inputColumn),
			),
		)
	) {
		findings.push(
			finding(
				'shape_bridge_input_column_missing',
				'Shape bridge should reference at least one dataset input column.',
				bridge.name,
			),
		);
	}

	return { bridge, findings };
}

function verifySetOutputs(
	setOutputsNodes: WorkflowNodeResponse[],
	target: EffectiveTargetExpectation,
	expectedDataTableId: string | undefined,
): TopologyFinding[] {
	const findings: TopologyFinding[] = [];

	for (const setOutputsNode of setOutputsNodes) {
		if (getStringParameter(setOutputsNode, 'source') !== 'dataTable') {
			findings.push(
				finding(
					'set_outputs_source_not_datatable',
					'setOutputs should write to a data table.',
					setOutputsNode.name,
				),
			);
		}

		if (expectedDataTableId && getDataTableIdValue(setOutputsNode) !== expectedDataTableId) {
			findings.push(
				finding(
					'set_outputs_wrong_datatable',
					`setOutputs should use data table "${expectedDataTableId}".`,
					setOutputsNode.name,
				),
			);
		}

		const outputNames = getOutputNames(setOutputsNode);

		for (const expectedOutputColumn of target?.expectedOutputColumns ?? []) {
			if (outputNames.includes(expectedOutputColumn)) {
				findings.push(
					finding(
						'set_outputs_overwrites_expected',
						`setOutputs writes to expected output column "${expectedOutputColumn}".`,
						setOutputsNode.name,
					),
				);
			}
		}

		for (const actualOutputColumn of target?.actualOutputColumns ?? []) {
			if (!outputNames.includes(actualOutputColumn)) {
				findings.push(
					finding(
						'set_outputs_actual_column_missing',
						`setOutputs is missing actual output column "${actualOutputColumn}".`,
						setOutputsNode.name,
					),
				);
			}
		}
	}

	return findings;
}

function verifySetMetrics(
	input: TopologyVerifierInput,
	setMetricsNodes: WorkflowNodeResponse[],
	target: EffectiveTargetExpectation,
): TopologyFinding[] {
	const findings: TopologyFinding[] = [];
	const presentMetrics = new Set<string>();

	for (const setMetricsNode of setMetricsNodes) {
		const metric = getStringParameter(setMetricsNode, 'metric');

		if (!metric) {
			findings.push(
				finding(
					'set_metrics_missing_metric',
					'setMetrics should specify a metric.',
					setMetricsNode.name,
				),
			);
			continue;
		}

		presentMetrics.add(metric);

		if (metric && !input.sidecar.metrics.some((allowedMetric) => allowedMetric === metric)) {
			findings.push(
				finding(
					'set_metrics_unexpected_metric',
					`setMetrics uses unexpected metric "${metric}".`,
					setMetricsNode.name,
				),
			);
		}

		if (metric && METRICS_REQUIRING_EXPECTED_ANSWER.has(metric)) {
			const expectedAnswer = setMetricsNode.parameters?.expectedAnswer;

			if (!referencesEvalTrigger(expectedAnswer)) {
				findings.push(
					finding(
						'set_metrics_expected_not_from_trigger',
						'setMetrics expected answer should come from Eval Trigger.',
						setMetricsNode.name,
					),
				);
			}

			if (referencesCurrentJson(expectedAnswer)) {
				findings.push(
					finding(
						'set_metrics_expected_uses_current_json',
						'setMetrics expected answer should not reference the current item JSON.',
						setMetricsNode.name,
					),
				);
			}

			if (
				getNodeItemJsonReferenceNames(expectedAnswer).some(
					(nodeName) => nodeName !== 'Eval Trigger',
				)
			) {
				findings.push(
					finding(
						'set_metrics_expected_uses_other_node_json',
						'setMetrics expected answer should not reference other node item JSON.',
						setMetricsNode.name,
					),
				);
			}

			if (
				target?.expectedOutputColumns.length &&
				getNodeItemJsonReferences(expectedAnswer).some(
					(reference) =>
						reference.nodeName === 'Eval Trigger' &&
						(reference.columnName === undefined ||
							!target.expectedOutputColumns.includes(reference.columnName)),
				)
			) {
				findings.push(
					finding(
						'set_metrics_expected_extra_trigger_json',
						'setMetrics expected answer should only reference expected output columns from Eval Trigger.',
						setMetricsNode.name,
					),
				);
			}

			if (
				typeof expectedAnswer === 'string' &&
				referencesEvalTrigger(expectedAnswer) &&
				target?.expectedOutputColumns.length &&
				!target.expectedOutputColumns.some((expectedOutputColumn) =>
					referencesEvalTriggerJsonColumn(expectedAnswer, expectedOutputColumn),
				)
			) {
				findings.push(
					finding(
						'set_metrics_expected_column_missing',
						'setMetrics expected answer should reference an expected output column.',
						setMetricsNode.name,
					),
				);
			}

			const actualAnswer = setMetricsNode.parameters?.actualAnswer;

			if (!referencesCurrentJson(actualAnswer)) {
				findings.push(
					finding(
						'set_metrics_actual_not_from_json',
						'setMetrics actual answer should come from the current item JSON.',
						setMetricsNode.name,
					),
				);
			}

			if (referencesNodeItemJson(actualAnswer)) {
				findings.push(
					finding(
						'set_metrics_actual_uses_node_json',
						'setMetrics actual answer should not reference another node item JSON.',
						setMetricsNode.name,
					),
				);
			}
		}

		if (metric === 'helpfulness') {
			if (!referencesEvalTrigger(setMetricsNode.parameters?.userQuery)) {
				findings.push(
					finding(
						'set_metrics_user_query_not_from_trigger',
						'setMetrics user query should come from Eval Trigger.',
						setMetricsNode.name,
					),
				);
			}

			const actualAnswer = setMetricsNode.parameters?.actualAnswer;

			if (!referencesCurrentJson(actualAnswer)) {
				findings.push(
					finding(
						'set_metrics_actual_not_from_json',
						'setMetrics actual answer should come from the current item JSON.',
						setMetricsNode.name,
					),
				);
			}

			if (referencesNodeItemJson(actualAnswer)) {
				findings.push(
					finding(
						'set_metrics_actual_uses_node_json',
						'setMetrics actual answer should not reference another node item JSON.',
						setMetricsNode.name,
					),
				);
			}
		}

		if (
			metric &&
			METRICS_REQUIRING_LANGUAGE_MODEL.has(metric) &&
			!hasIncomingConnectionOfType(
				input.updatedWorkflow,
				setMetricsNode.name,
				LANGUAGE_MODEL_CONNECTION_TYPE,
			)
		) {
			findings.push(
				finding(
					'set_metrics_missing_language_model',
					'setMetrics for an AI-judged metric needs a language model connection.',
					setMetricsNode.name,
				),
			);
		}
	}

	for (const requestedMetric of input.sidecar.metrics) {
		if (!presentMetrics.has(requestedMetric)) {
			findings.push(
				finding(
					'set_metrics_requested_metric_missing',
					`Evaluation branch is missing requested metric "${requestedMetric}".`,
				),
			);
		}
	}

	return findings;
}

function verifyTargetTopology(
	input: TopologyVerifierInput,
	targetNodeName: string,
	evalTrigger: WorkflowNodeResponse | undefined,
): TopologyTargetResult {
	const findings: TopologyFinding[] = [];
	const targetNode = getNodeByName(input.updatedWorkflow, targetNodeName);
	const target = resolveEffectiveTargetExpectation(input, targetNodeName);
	const connections = toWorkflowConnections(input.updatedWorkflow.connections);
	const originalConnections = toWorkflowConnections(input.originalWorkflow.connections);

	if (!targetNode) {
		findings.push(
			finding('target_missing', `Target node "${targetNodeName}" is missing.`, targetNodeName),
		);
		return { nodeName: targetNodeName, passed: false, findings };
	}

	findings.push(
		...verifyShapeBridge(input, target, targetNodeName, evalTrigger, connections).findings,
	);

	const checkIfEvaluatingNode = getMainTargets(connections, targetNodeName)
		.map((nodeName) => getNodeByName(input.updatedWorkflow, nodeName))
		.find(
			(node) => node !== undefined && isEvaluationOperation(node, CHECK_IF_EVALUATING_OPERATION),
		);

	if (!checkIfEvaluatingNode) {
		findings.push(
			finding(
				'check_if_evaluating_missing',
				`Target "${targetNodeName}" should connect directly to checkIfEvaluating.`,
				targetNodeName,
			),
		);
		return { nodeName: targetNodeName, passed: findings.length === 0, findings };
	}

	for (const targetMainDownstreamNodeName of getMainTargets(connections, targetNodeName)) {
		if (targetMainDownstreamNodeName !== checkIfEvaluatingNode.name) {
			findings.push(
				finding(
					'eval_branch_reaches_side_effect',
					`Target "${targetNodeName}" has an unprotected downstream node "${targetMainDownstreamNodeName}".`,
					targetMainDownstreamNodeName,
				),
			);
		}
	}

	const evalSlotTargets = getMainTargets(connections, checkIfEvaluatingNode.name, 0);
	const normalSlotTargets = getMainTargets(connections, checkIfEvaluatingNode.name, 1);

	if (evalSlotTargets.length === 0) {
		findings.push(
			finding(
				'eval_slot_empty',
				'checkIfEvaluating evaluation slot is empty.',
				checkIfEvaluatingNode.name,
			),
		);
	}

	if (normalSlotTargets.length === 0) {
		findings.push(
			finding(
				'normal_slot_empty',
				'checkIfEvaluating normal slot is empty.',
				checkIfEvaluatingNode.name,
			),
		);
	}

	const evalReachableNodeNames = reachableFrom(input.updatedWorkflow, evalSlotTargets);
	const normalReachableNodeNames = reachableFrom(input.updatedWorkflow, normalSlotTargets);
	const setOutputsNodes = getEvaluationNodesInReach(
		input.updatedWorkflow,
		evalReachableNodeNames,
		SET_OUTPUTS_OPERATION,
	);
	const setMetricsNodes = getEvaluationNodesInReach(
		input.updatedWorkflow,
		evalReachableNodeNames,
		SET_METRICS_OPERATION,
	);

	if (setOutputsNodes.length === 0) {
		findings.push(
			finding('set_outputs_missing', 'Evaluation branch is missing setOutputs.', targetNodeName),
		);
	}

	if (setMetricsNodes.length === 0) {
		findings.push(
			finding('set_metrics_missing', 'Evaluation branch is missing setMetrics.', targetNodeName),
		);
	}

	const originalDownstreamNodeNames = getMainTargets(originalConnections, targetNodeName);
	const originalDownstreamReachableNodeNames = reachableFrom(
		input.originalWorkflow,
		originalDownstreamNodeNames,
	);

	for (const downstreamNodeName of originalDownstreamNodeNames) {
		if (!normalReachableNodeNames.has(downstreamNodeName)) {
			findings.push(
				finding(
					'normal_branch_does_not_preserve_downstream',
					`Normal branch does not preserve downstream node "${downstreamNodeName}".`,
					targetNodeName,
				),
			);
		}
	}

	const sideEffectNodeNames = new Set([
		...originalDownstreamReachableNodeNames,
		...target.sideEffectNodes,
	]);

	for (const sideEffectNodeName of sideEffectNodeNames) {
		if (evalReachableNodeNames.has(sideEffectNodeName)) {
			findings.push(
				finding(
					'eval_branch_reaches_side_effect',
					`Evaluation branch can reach side-effect node "${sideEffectNodeName}".`,
					sideEffectNodeName,
				),
			);
		}
	}

	findings.push(...verifySetOutputs(setOutputsNodes, target, input.expectedDataTableId));
	findings.push(...verifySetMetrics(input, setMetricsNodes, target));

	return { nodeName: targetNodeName, passed: findings.length === 0, findings };
}

export function verifyEvalSetupTopology(input: TopologyVerifierInput): TopologyVerifierResult {
	const targetNodeNames = detectTargets(input);
	const globalFindings = verifyGlobalTopology(input, targetNodeNames);
	const evalTrigger = input.updatedWorkflow.nodes.find(
		(node) => node.type === EVAL_TRIGGER_NODE_TYPE,
	);
	const targetResults = targetNodeNames.map((targetNodeName) =>
		verifyTargetTopology(input, targetNodeName, evalTrigger),
	);
	const findings = [
		...globalFindings,
		...targetResults.flatMap((targetResult) => targetResult.findings),
	];

	return {
		passed: findings.length === 0,
		findings,
		targetResults,
		targetNodeNames,
	};
}
