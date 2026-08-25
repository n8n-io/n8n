/**
 * Skeleton checkpoint — deterministic, all-diagnostics-at-once validation of a
 * topology-only workflow skeleton, before any SDK source is generated.
 *
 * Composes the canvas-parity validator (`validateWorkflowConfig` over a
 * degenerate, parameterless WorkflowJSON) with the shared node-group rules,
 * plus skeleton-specific structural checks. Parameter-, credential- and
 * execution-level categories are out of scope by design: the skeleton has no
 * parameters yet, so only structure is checkable here.
 */
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type {
	IConnections,
	INode,
	INodeTypeDescription,
	IWorkflowGroup,
	NodeConnectionType,
} from 'n8n-workflow';
import {
	isNodeConnectionType,
	makeGetNodeTypeForGrouping,
	validateWorkflowGroups,
} from 'n8n-workflow';

import { validateWorkflowConfig } from './validate-workflow.service';
import { isTriggerNodeType } from './workflow-json-utils';
import type {
	SkeletonDiagnostic,
	ValidateSkeletonResult,
	WorkflowSkeleton,
} from './workflow-skeleton.schema';
import type { InstanceAiContext } from '../../types';

interface ResolvedNode {
	description: INodeTypeDescription | null;
	version: number;
}

function resolveNodeType(
	context: InstanceAiContext,
	type: string,
	version: number | undefined,
): ResolvedNode | null {
	const provider = context.nodeTypesProvider;
	if (!provider) return null;
	try {
		const description = provider.getByNameAndVersion(type, version).description;
		const declared = description.version;
		const resolved = version ?? (Array.isArray(declared) ? Math.max(...declared) : declared);
		return { description, version: resolved };
	} catch {
		return null;
	}
}

/** Number of statically declared main outputs, or null when outputs are dynamic
 *  (expression-driven, e.g. Switch — case count depends on parameters). */
function staticMainOutputCount(description: INodeTypeDescription): number | null {
	const outputs = description.outputs;
	if (!Array.isArray(outputs)) return null;
	let count = 0;
	for (const output of outputs) {
		const type = typeof output === 'string' ? output : output.type;
		if (type === 'main') count += 1;
	}
	return count;
}

export function edgesToConnections(
	skeleton: WorkflowSkeleton,
	diagnostics: SkeletonDiagnostic[],
): IConnections {
	const connections: IConnections = {};
	for (const edge of skeleton.connections) {
		if (!isNodeConnectionType(edge.type)) {
			diagnostics.push({
				severity: 'error',
				code: 'UNKNOWN_CONNECTION_TYPE',
				node: edge.from,
				message: `Connection ${edge.from} → ${edge.to} has unknown type "${edge.type}".`,
			});
			continue;
		}
		const type: NodeConnectionType = edge.type;
		const byType = (connections[edge.from] ??= {});
		const outputs = (byType[type] ??= []);
		while (outputs.length <= edge.fromIndex) outputs.push([]);
		(outputs[edge.fromIndex] ??= []).push({ node: edge.to, type, index: edge.toIndex });
	}
	return connections;
}

export async function validateSkeleton(
	context: InstanceAiContext,
	skeleton: WorkflowSkeleton,
): Promise<ValidateSkeletonResult> {
	const diagnostics: SkeletonDiagnostic[] = [];

	// Duplicate node names — everything downstream keys on the name.
	const seenNames = new Set<string>();
	for (const node of skeleton.nodes) {
		if (seenNames.has(node.name)) {
			diagnostics.push({
				severity: 'error',
				code: 'DUPLICATE_NODE_NAME',
				node: node.name,
				message: `Node name "${node.name}" is used more than once.`,
			});
		}
		seenNames.add(node.name);
	}

	// Connection endpoints must reference declared nodes.
	for (const edge of skeleton.connections) {
		for (const endpoint of [edge.from, edge.to]) {
			if (!seenNames.has(endpoint)) {
				diagnostics.push({
					severity: 'error',
					code: 'UNKNOWN_CONNECTION_ENDPOINT',
					node: endpoint,
					message: `Connection ${edge.from} → ${edge.to} references unknown node "${endpoint}".`,
				});
			}
		}
	}

	// Resolve node types and pin versions.
	const resolvedVersions: Record<string, number> = {};
	const resolvedByName = new Map<string, ResolvedNode | null>();
	for (const node of skeleton.nodes) {
		const resolved = resolveNodeType(context, node.type, node.typeVersion);
		resolvedByName.set(node.name, resolved);
		resolvedVersions[node.name] = resolved?.version ?? node.typeVersion ?? 1;
		if (!resolved && context.nodeTypesProvider) {
			const versionSuffix = node.typeVersion === undefined ? '' : ` (version ${node.typeVersion})`;
			diagnostics.push({
				severity: 'error',
				code: 'UNKNOWN_NODE_TYPE',
				node: node.name,
				message: `Unknown node type "${node.type}"${versionSuffix}.`,
			});
		}
	}

	// A workflow needs an entry point.
	const hasTrigger = skeleton.nodes.some((node) => {
		const description = resolvedByName.get(node.name)?.description;
		if (description) return description.group.includes('trigger');
		return isTriggerNodeType(node.type);
	});
	if (!hasTrigger) {
		diagnostics.push({
			severity: 'error',
			code: 'NO_TRIGGER',
			message: 'The skeleton has no trigger node, so the workflow could never start.',
		});
	}

	const connections = edgesToConnections(skeleton, diagnostics);

	// Partially wired multi-output nodes (e.g. IF with only the true branch).
	// Legal, so a warning — but it is the top wiring mistake in built workflows.
	for (const node of skeleton.nodes) {
		const description = resolvedByName.get(node.name)?.description;
		if (!description) continue;
		const mainOutputs = staticMainOutputCount(description);
		if (mainOutputs === null || mainOutputs < 2) continue;
		const wired = new Set(
			skeleton.connections
				.filter((edge) => edge.from === node.name && edge.type === 'main')
				.map((edge) => edge.fromIndex),
		);
		if (wired.size > 0 && wired.size < mainOutputs) {
			diagnostics.push({
				severity: 'warning',
				code: 'UNWIRED_OUTPUT_BRANCH',
				node: node.name,
				message: `"${node.name}" wires ${wired.size} of ${mainOutputs} main outputs. Leave a branch unwired only if the flow intentionally ends there.`,
			});
		}
	}

	// Nodes that take part in no connection at all.
	if (skeleton.nodes.length > 1) {
		const connected = new Set<string>();
		for (const edge of skeleton.connections) {
			connected.add(edge.from);
			connected.add(edge.to);
		}
		for (const node of skeleton.nodes) {
			if (!connected.has(node.name)) {
				diagnostics.push({
					severity: 'warning',
					code: 'ISOLATED_NODE',
					node: node.name,
					message: `"${node.name}" has no connections.`,
				});
			}
		}
	}

	// Canvas-parity structural checks (missing required input connections, e.g.
	// an AI Agent without a language model). Parameter-level categories are
	// suppressed — the skeleton has none — and typeUnknown is reported above.
	const engineNodes = skeleton.nodes.map((node, index) => ({
		id: node.name,
		name: node.name,
		type: node.type,
		typeVersion: resolvedVersions[node.name],
		position: [index * 220, 0] as [number, number],
		parameters: {},
	}));
	const degenerateWorkflow: WorkflowJSON = {
		name: skeleton.name,
		nodes: engineNodes,
		connections,
	};
	const configResult = await validateWorkflowConfig(context, {
		workflow: degenerateWorkflow,
		ignoreIssues: [
			'typeUnknown',
			'parameters',
			'credentials',
			'aiGateway',
			'chatModel',
			'execution',
		],
	});
	for (const [nodeName, nodeIssues] of Object.entries(configResult.issues)) {
		const inputIssues = nodeIssues.input;
		if (!inputIssues) continue;
		for (const messages of Object.values(inputIssues)) {
			for (const message of messages) {
				diagnostics.push({
					severity: 'error',
					code: 'MISSING_REQUIRED_INPUT',
					node: nodeName,
					message,
				});
			}
		}
	}

	// Group rules — shared with the save path. Invalid groups no longer block a
	// save (they are dropped), so violations surface as warnings here.
	if (skeleton.groups?.length) {
		const nodeGroups: IWorkflowGroup[] = skeleton.groups.map((group, index) => ({
			id: `skeleton-group-${index}`,
			name: group.name,
			nodeIds: [...group.nodes],
		}));
		const groupResult = validateWorkflowGroups<INode>({
			nodes: engineNodes,
			connectionsBySourceNode: connections,
			nodeGroups,
			getNodeType: context.nodeTypesProvider
				? makeGetNodeTypeForGrouping(context.nodeTypesProvider)
				: null,
		});
		if (!groupResult.valid) {
			for (const violation of groupResult.violations) {
				diagnostics.push({
					severity: 'warning',
					code: 'NODE_GROUP_INVALID',
					message: `Group "${violation.groupName}" would be dropped on save: ${violation.message}`,
				});
			}
		}
	}

	return {
		valid: !diagnostics.some((diagnostic) => diagnostic.severity === 'error'),
		diagnostics,
		resolvedVersions,
	};
}
