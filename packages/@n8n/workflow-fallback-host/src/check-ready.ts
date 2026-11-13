/**
 * n8n's check before a manual run (`WorkflowExecute.checkReadyForExecution` of
 * n8n-core): the parameter issues (`NodeHelpers.getNodeParametersIssues`) of the
 * start node and the nodes after it. Disabled nodes are not checked; nodes that
 * the start node does not reach are not checked. Without a start node, every
 * node is checked (a check when the workflow is published).
 *
 * The message is the one of n8n's `WorkflowHasIssuesError`.
 */
import { WorkflowHasIssuesError } from 'n8n-core';
import type {
	IConnections,
	INode,
	INodeCredentials,
	INodeIssues,
	INodeParameters,
	INodeTypes,
	NodeConnectionType,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeHelpers, Workflow } from 'n8n-workflow';

import { isJsonObject, type JsonObject, type JsonValue } from './protocol';

const CONNECTION_TYPES = new Set<string>(Object.values(NodeConnectionTypes));

function isConnectionType(value: unknown): value is NodeConnectionType {
	return typeof value === 'string' && CONNECTION_TYPES.has(value);
}

function textOf(value: JsonValue | undefined): string {
	return typeof value === 'string' ? value : '';
}

/** A node of workflow JSON, as n8n's `INode`. */
function toNode(node: JsonObject): INode {
	return {
		id: typeof node.id === 'string' ? node.id : textOf(node.name),
		name: textOf(node.name),
		type: textOf(node.type),
		typeVersion: typeof node.typeVersion === 'number' ? node.typeVersion : 1,
		position: [0, 0],
		disabled: node.disabled === true,
		parameters: isJsonObject(node.parameters) ? toNodeParameters(node.parameters) : {},
		...(isJsonObject(node.credentials) ? { credentials: toNodeCredentials(node.credentials) } : {}),
	};
}

/** The connections of workflow JSON, as n8n's `IConnections`. */
function toConnections(value: JsonObject): IConnections {
	const out: IConnections = {};
	for (const [from, types] of Object.entries(value)) {
		if (!isJsonObject(types)) continue;
		const byType: IConnections[string] = {};
		for (const [type, outputs] of Object.entries(types)) {
			if (!Array.isArray(outputs)) continue;
			byType[type] = outputs.map((list) =>
				Array.isArray(list)
					? list.filter(isJsonObject).map((c) => ({
							node: textOf(c.node),
							type: isConnectionType(c.type) ? c.type : 'main',
							index: typeof c.index === 'number' ? c.index : 0,
						}))
					: null,
			);
		}
		out[from] = byType;
	}
	return out;
}

/** The credentials of a node in workflow JSON, as n8n's `INodeCredentials`. */
function toNodeCredentials(value: JsonObject): INodeCredentials {
	const out: INodeCredentials = {};
	for (const [type, ref] of Object.entries(value)) {
		if (!isJsonObject(ref)) continue;
		out[type] = {
			id: typeof ref.id === 'string' ? ref.id : null,
			name: typeof ref.name === 'string' ? ref.name : '',
		};
	}
	return out;
}

/**
 * The message of n8n's `WorkflowHasIssuesError` for the workflow, or null when no
 * checked node has issues. `parameters`: `{ nodes, connections, startNode?,
 * pinDataNodeNames? }` (workflow JSON).
 */
export function readinessIssues(parameters: JsonObject, nodeTypes: INodeTypes): string | null {
	const nodes = Array.isArray(parameters.nodes) ? parameters.nodes.filter(isJsonObject) : [];
	const workflow = new Workflow({
		id: 'compiled-workflow',
		nodes: nodes.map(toNode),
		connections: isJsonObject(parameters.connections) ? toConnections(parameters.connections) : {},
		active: false,
		nodeTypes,
	});
	const start = typeof parameters.startNode === 'string' ? parameters.startNode : undefined;
	if (start !== undefined && !workflow.getNode(start)) return null;
	const pinned = Array.isArray(parameters.pinDataNodeNames)
		? parameters.pinDataNodeNames.filter((n): n is string => typeof n === 'string')
		: [];
	const names =
		start === undefined ? Object.keys(workflow.nodes) : [...workflow.getChildNodes(start), start];
	const issues: Record<string, INodeIssues> = {};
	for (const name of names) {
		const node = workflow.nodes[name];
		if (!node || node.disabled === true) continue;
		let found: INodeIssues | null;
		try {
			const nodeType = nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
			found = NodeHelpers.getNodeParametersIssues(
				nodeType.description.properties,
				node,
				nodeType.description,
				pinned,
			);
		} catch {
			found = { typeUnknown: true };
		}
		if (found !== null) issues[node.name] = found;
	}
	if (Object.keys(issues).length === 0) return null;
	return new WorkflowHasIssuesError(issues, workflow.nodes).message;
}

/** JSON parameters are valid node parameters; the copy drops the JSON type. */
export function toNodeParameters(parameters: JsonObject): INodeParameters {
	const copy: INodeParameters = {};
	for (const [key, value] of Object.entries(parameters)) copy[key] = toParameterValue(value);
	return copy;
}

function toParameterValue(value: JsonValue): INodeParameters[string] {
	if (Array.isArray(value)) {
		if (value.every(isJsonObject)) return value.map(toNodeParameters);
		return value.filter(
			(entry): entry is string | number | boolean =>
				typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean',
		);
	}
	if (isJsonObject(value)) return toNodeParameters(value);
	return value;
}
