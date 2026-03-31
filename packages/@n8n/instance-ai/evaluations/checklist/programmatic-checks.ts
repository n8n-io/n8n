import type { WorkflowNodeResponse, WorkflowResponse } from '../clients/n8n-client';
import type { ProgrammaticCheck } from '../types';

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface CheckResult {
	pass: boolean;
	reasoning: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractNodes(workflow: WorkflowResponse): WorkflowNodeResponse[] {
	return workflow.nodes;
}

function extractConnections(workflow: WorkflowResponse): Record<string, unknown> {
	return workflow.connections;
}

/**
 * Resolve a dot-separated path on an object, e.g. "resource.operation" on
 * { resource: { operation: "getAll" } } returns "getAll".
 */
function getNestedValue(obj: unknown, path: string): unknown {
	const segments = path.split('.');
	let current: unknown = obj;
	for (const segment of segments) {
		if (current === null || current === undefined || typeof current !== 'object') {
			return undefined;
		}
		current = (current as Record<string, unknown>)[segment];
	}
	return current;
}

// ---------------------------------------------------------------------------
// Individual check functions
// ---------------------------------------------------------------------------

export function checkNodeExists(
	workflow: WorkflowResponse,
	params: { nodeType: string },
): CheckResult {
	const nodes = extractNodes(workflow);
	const found = nodes.some((n) => n.type === params.nodeType);
	return found
		? { pass: true, reasoning: `Found node of type "${params.nodeType}" in the workflow` }
		: {
				pass: false,
				reasoning: `No node of type "${params.nodeType}" found. Present types: ${[...new Set(nodes.map((n) => n.type))].join(', ') || '(none)'}`,
			};
}

export function checkNodeConnected(
	workflow: WorkflowResponse,
	params: { nodeType: string },
): CheckResult {
	const nodes = extractNodes(workflow);
	const connections = extractConnections(workflow);

	const matchingNodes = nodes.filter((n) => n.type === params.nodeType);
	if (matchingNodes.length === 0) {
		return {
			pass: false,
			reasoning: `No node of type "${params.nodeType}" exists in the workflow`,
		};
	}

	// A node is "connected" if it appears as a source key in connections OR as a
	// target in any connection group.
	for (const node of matchingNodes) {
		const name = node.name ?? '';

		// Check as source
		if (name in connections) {
			return {
				pass: true,
				reasoning: `Node "${name}" (type "${params.nodeType}") has outgoing connections`,
			};
		}

		// Check as target in any connection value
		const connectionsJson = JSON.stringify(connections);
		if (connectionsJson.includes(`"node":"${name}"`)) {
			return {
				pass: true,
				reasoning: `Node "${name}" (type "${params.nodeType}") has incoming connections`,
			};
		}
	}

	return {
		pass: false,
		reasoning: `Node(s) of type "${params.nodeType}" exist but are not connected to any other node`,
	};
}

export function checkTriggerType(
	workflow: WorkflowResponse,
	params: { expectedTriggerType: string },
): CheckResult {
	const nodes = extractNodes(workflow);
	const triggerNode = nodes.find(
		(n) =>
			n.type === params.expectedTriggerType ||
			(typeof n.type === 'string' && n.type.toLowerCase().includes('trigger')),
	);

	if (!triggerNode) {
		return {
			pass: false,
			reasoning: `No trigger node found in the workflow. Expected type: "${params.expectedTriggerType}"`,
		};
	}

	if (triggerNode.type === params.expectedTriggerType) {
		return {
			pass: true,
			reasoning: `Workflow has a trigger node of type "${params.expectedTriggerType}"`,
		};
	}

	return {
		pass: false,
		reasoning: `Workflow trigger is "${triggerNode.type}", expected "${params.expectedTriggerType}"`,
	};
}

export function checkNodeCountGte(
	workflow: WorkflowResponse,
	params: { minCount: number },
): CheckResult {
	const nodes = extractNodes(workflow);
	const count = nodes.length;
	return count >= params.minCount
		? { pass: true, reasoning: `Workflow has ${count} node(s) (>= ${params.minCount})` }
		: {
				pass: false,
				reasoning: `Workflow has ${count} node(s), expected at least ${params.minCount}`,
			};
}

export function checkConnectionExists(
	workflow: WorkflowResponse,
	params: { sourceNodeType: string; targetNodeType: string },
): CheckResult {
	const nodes = extractNodes(workflow);
	const connections = extractConnections(workflow);

	const sourceNodes = nodes.filter((n) => n.type === params.sourceNodeType);
	const targetNodes = nodes.filter((n) => n.type === params.targetNodeType);

	if (sourceNodes.length === 0) {
		return {
			pass: false,
			reasoning: `No source node of type "${params.sourceNodeType}" found`,
		};
	}
	if (targetNodes.length === 0) {
		return {
			pass: false,
			reasoning: `No target node of type "${params.targetNodeType}" found`,
		};
	}

	const targetNames = new Set(targetNodes.map((n) => n.name));

	for (const sourceNode of sourceNodes) {
		const sourceName = sourceNode.name ?? '';
		const sourceConns = connections[sourceName];
		if (!sourceConns) continue;

		// Connections are structured as { main: [[{ node: "Name", ... }]] }
		const connJson = JSON.stringify(sourceConns);
		for (const targetName of targetNames) {
			if (connJson.includes(`"node":"${targetName}"`)) {
				return {
					pass: true,
					reasoning: `Found connection from "${sourceName}" (${params.sourceNodeType}) to "${targetName}" (${params.targetNodeType})`,
				};
			}
		}
	}

	return {
		pass: false,
		reasoning: `No connection found from any "${params.sourceNodeType}" node to any "${params.targetNodeType}" node`,
	};
}

export function checkNodeParameter(
	workflow: WorkflowResponse,
	params: { nodeType: string; parameterPath: string; expectedValue: unknown },
): CheckResult {
	const nodes = extractNodes(workflow);
	const matchingNodes = nodes.filter((n) => n.type === params.nodeType);

	if (matchingNodes.length === 0) {
		return {
			pass: false,
			reasoning: `No node of type "${params.nodeType}" found to check parameter "${params.parameterPath}"`,
		};
	}

	for (const node of matchingNodes) {
		const actualValue = getNestedValue(node.parameters ?? {}, params.parameterPath);
		if (actualValue === params.expectedValue) {
			return {
				pass: true,
				reasoning: `Node "${node.name}" (${params.nodeType}) has parameter "${params.parameterPath}" = ${JSON.stringify(params.expectedValue)}`,
			};
		}
		// Also compare stringified for loose matching (numbers vs strings, etc.)
		if (
			actualValue !== undefined &&
			JSON.stringify(actualValue) === JSON.stringify(params.expectedValue)
		) {
			return {
				pass: true,
				reasoning: `Node "${node.name}" (${params.nodeType}) has parameter "${params.parameterPath}" = ${JSON.stringify(params.expectedValue)}`,
			};
		}
	}

	const actualValues = matchingNodes.map((n) => ({
		name: n.name,
		value: getNestedValue(n.parameters ?? {}, params.parameterPath),
	}));

	return {
		pass: false,
		reasoning: `Parameter "${params.parameterPath}" on "${params.nodeType}" node(s) does not match expected value ${JSON.stringify(params.expectedValue)}. Actual: ${JSON.stringify(actualValues)}`,
	};
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export function runProgrammaticCheck(
	workflow: WorkflowResponse,
	check: ProgrammaticCheck,
): CheckResult {
	switch (check.type) {
		case 'node-exists':
			return checkNodeExists(workflow, { nodeType: check.nodeType });
		case 'node-connected':
			return checkNodeConnected(workflow, { nodeType: check.nodeType });
		case 'trigger-type':
			return checkTriggerType(workflow, { expectedTriggerType: check.expectedTriggerType });
		case 'node-count-gte':
			return checkNodeCountGte(workflow, { minCount: check.minCount });
		case 'connection-exists':
			return checkConnectionExists(workflow, {
				sourceNodeType: check.sourceNodeType,
				targetNodeType: check.targetNodeType,
			});
		case 'node-parameter':
			return checkNodeParameter(workflow, {
				nodeType: check.nodeType,
				parameterPath: check.parameterPath,
				expectedValue: check.expectedValue,
			});
	}
}
