import type { INodeTypeDescription, NodeConnectionType, IConnections } from 'n8n-workflow';

import { createConnection } from '@/tools/utils/connection.utils';
import type { SimpleWorkflow } from '@/types';
import { isSubNode } from '@/utils/node-helpers';
import { createNodeTypeMaps, getNodeTypeForNode } from '@/validation/utils/node-type-map';
import { resolveNodeInputs, resolveNodeOutputs } from '@/validation/utils/resolve-connections';

import type { ProgrammaticViolation, NodeResolvedConnectionTypesInfo } from '../types';

export interface AutoFixResult {
	fixed: AutoFixedConnection[];
	unfixable: UnfixableConnection[];
	updatedConnections: IConnections;
}

export interface AutoFixedConnection {
	sourceNodeName: string;
	targetNodeName: string;
	connectionType: NodeConnectionType;
	reason: string;
}

export interface UnfixableConnection {
	nodeName: string;
	missingInputType: NodeConnectionType;
	reason: string;
	candidateCount: number;
}

interface AutoFixContext {
	result: AutoFixResult;
	nodeTypeMap: Map<string, INodeTypeDescription>;
	nodeTypesByName: Map<string, INodeTypeDescription>;
	nodesByName: Map<string, SimpleWorkflow['nodes'][0]>;
	subNodeOutputs: Map<string, Set<NodeConnectionType>>;
	connectedSubNodes: Set<string>;
	workflow: SimpleWorkflow;
}

/**
 * Check if a sub-node already has an outgoing connection of a specific type
 */
function findExistingOutgoingConnection(
	connections: IConnections,
	nodeName: string,
	connectionType: NodeConnectionType,
): boolean {
	const nodeConnections = connections[nodeName];
	if (!nodeConnections) return false;

	const typeConnections = nodeConnections[connectionType];
	if (!typeConnections) return false;

	return typeConnections.some((connArray) => connArray && connArray.length > 0);
}

/**
 * Check if a specific connection already exists between two nodes
 */
function connectionExistsBetweenNodes(
	connections: IConnections,
	sourceNodeName: string,
	targetNodeName: string,
	connectionType: NodeConnectionType,
): boolean {
	const nodeConnections = connections[sourceNodeName];
	if (!nodeConnections) return false;

	const typeConnections = nodeConnections[connectionType];
	if (!typeConnections) return false;

	return typeConnections.some((connArray) =>
		connArray?.some((conn) => conn.node === targetNodeName),
	);
}

/**
 * Check if a target node already has an incoming connection of a specific type
 */
function checkNodeHasInputConnection(
	connections: IConnections,
	targetNodeName: string,
	connectionType: NodeConnectionType,
): boolean {
	for (const [, nodeConns] of Object.entries(connections)) {
		const typeConns = nodeConns[connectionType];
		if (!typeConns) continue;

		for (const connArray of typeConns) {
			if (connArray?.some((conn) => conn.node === targetNodeName)) {
				return true;
			}
		}
	}
	return false;
}

/**
 * Build a map of what each sub-node outputs
 */
function buildSubNodeOutputsMap(
	workflow: SimpleWorkflow,
	nodeTypeMap: Map<string, INodeTypeDescription>,
	nodeTypesByName: Map<string, INodeTypeDescription>,
): Map<string, Set<NodeConnectionType>> {
	const subNodeOutputs = new Map<string, Set<NodeConnectionType>>();

	for (const node of workflow.nodes) {
		if (node.disabled) continue;

		const nodeType = getNodeTypeForNode(node, nodeTypeMap, nodeTypesByName);
		if (!nodeType) continue;

		if (isSubNode(nodeType, node)) {
			try {
				const nodeInfo: NodeResolvedConnectionTypesInfo = { node, nodeType };
				const outputs = resolveNodeOutputs(nodeInfo);
				if (outputs.size > 0) {
					subNodeOutputs.set(node.name, outputs);
				}
			} catch {
				// Skip nodes where we can't resolve outputs
			}
		}
	}

	return subNodeOutputs;
}

/**
 * Find candidate sub-nodes that can provide a specific input type to a target node.
 * A sub-node is a candidate if it outputs the required type and is not already
 * connected to the specific target node (allows one sub-node to connect to multiple targets).
 */
function findCandidateSubNodes(
	ctx: AutoFixContext,
	targetNodeName: string,
	missingType: NodeConnectionType,
): string[] {
	const candidates: string[] = [];

	for (const [subNodeName, outputs] of ctx.subNodeOutputs) {
		if (outputs.has(missingType)) {
			// Check if this sub-node is already connected to THIS specific target
			const alreadyConnectedToTarget = connectionExistsBetweenNodes(
				ctx.result.updatedConnections,
				subNodeName,
				targetNodeName,
				missingType,
			);

			if (!alreadyConnectedToTarget) {
				candidates.push(subNodeName);
			}
		}
	}

	return candidates;
}

/**
 * Process a single missing input violation
 */
function processMissingInputViolation(ctx: AutoFixContext, violation: ProgrammaticViolation): void {
	const nodeName = violation.metadata?.nodeName;
	const missingType = violation.metadata?.missingType;

	if (!nodeName || !missingType) return;

	const targetNode = ctx.nodesByName.get(nodeName);
	if (!targetNode || targetNode.disabled) return;

	// Only auto-fix AI connections (ai_*)
	if (!missingType.startsWith('ai_')) return;

	const candidates = findCandidateSubNodes(ctx, nodeName, missingType as NodeConnectionType);

	if (candidates.length === 1) {
		const sourceNodeName = candidates[0];
		ctx.result.updatedConnections = createConnection(
			ctx.result.updatedConnections,
			sourceNodeName,
			nodeName,
			missingType as NodeConnectionType,
			0,
			0,
		);
		ctx.connectedSubNodes.add(sourceNodeName);
		ctx.result.fixed.push({
			sourceNodeName,
			targetNodeName: nodeName,
			connectionType: missingType as NodeConnectionType,
			reason: `Auto-connected orphaned sub-node to target requiring ${missingType}`,
		});
	} else if (candidates.length === 0) {
		ctx.result.unfixable.push({
			nodeName,
			missingInputType: missingType as NodeConnectionType,
			reason: `No available sub-node provides ${missingType}`,
			candidateCount: 0,
		});
	} else {
		ctx.result.unfixable.push({
			nodeName,
			missingInputType: missingType as NodeConnectionType,
			reason: `Multiple sub-nodes (${candidates.join(', ')}) can provide ${missingType} - ambiguous`,
			candidateCount: candidates.length,
		});
	}
}

/**
 * Find target nodes that accept a specific output type
 */
function findTargetCandidates(
	ctx: AutoFixContext,
	subNodeName: string,
	outputType: NodeConnectionType,
): string[] {
	const targetCandidates: string[] = [];

	for (const node of ctx.workflow.nodes) {
		if (node.disabled || node.name === subNodeName) continue;

		const nodeType = getNodeTypeForNode(node, ctx.nodeTypeMap, ctx.nodeTypesByName);
		if (!nodeType) continue;

		if (isSubNode(nodeType, node)) continue;

		try {
			const nodeInfo: NodeResolvedConnectionTypesInfo = { node, nodeType };
			const inputs = resolveNodeInputs(nodeInfo);
			const acceptsType = inputs.some((input) => input.type === outputType);

			if (acceptsType) {
				const hasConnection = checkNodeHasInputConnection(
					ctx.result.updatedConnections,
					node.name,
					outputType,
				);

				if (!hasConnection) {
					targetCandidates.push(node.name);
				}
			}
		} catch {
			// Skip nodes where we can't resolve inputs
		}
	}

	return targetCandidates;
}

/**
 * Process a single disconnected sub-node violation
 */
function processDisconnectedSubNodeViolation(
	ctx: AutoFixContext,
	violation: ProgrammaticViolation,
): void {
	const subNodeName = violation.metadata?.nodeName;
	const outputType = violation.metadata?.outputType;

	if (!subNodeName || !outputType) return;

	const subNode = ctx.nodesByName.get(subNodeName);
	if (!subNode || subNode.disabled) return;

	if (ctx.connectedSubNodes.has(subNodeName)) return;

	const nowConnected = findExistingOutgoingConnection(
		ctx.result.updatedConnections,
		subNodeName,
		outputType as NodeConnectionType,
	);
	if (nowConnected) return;

	const targetCandidates = findTargetCandidates(ctx, subNodeName, outputType as NodeConnectionType);

	if (targetCandidates.length === 1) {
		const targetNodeName = targetCandidates[0];
		ctx.result.updatedConnections = createConnection(
			ctx.result.updatedConnections,
			subNodeName,
			targetNodeName,
			outputType as NodeConnectionType,
			0,
			0,
		);
		ctx.connectedSubNodes.add(subNodeName);
		ctx.result.fixed.push({
			sourceNodeName: subNodeName,
			targetNodeName,
			connectionType: outputType as NodeConnectionType,
			reason: 'Auto-connected disconnected sub-node to only available target',
		});
	} else if (targetCandidates.length === 0) {
		ctx.result.unfixable.push({
			nodeName: subNodeName,
			missingInputType: outputType as NodeConnectionType,
			reason: `No target node accepts ${outputType} input`,
			candidateCount: 0,
		});
	} else {
		ctx.result.unfixable.push({
			nodeName: subNodeName,
			missingInputType: outputType as NodeConnectionType,
			reason: `Multiple targets (${targetCandidates.join(', ')}) accept ${outputType} - ambiguous`,
			candidateCount: targetCandidates.length,
		});
	}
}

/**
 * Attempts to automatically fix missing required AI connections.
 *
 * Algorithm:
 * Pass 1 - For each node missing a required AI input:
 *   1. Find candidate sub-nodes that output the required type
 *   2. If exactly 1 candidate exists -> AUTO-FIX
 *   3. If 0 candidates exist -> UNFIXABLE (no provider)
 *   4. If multiple candidates exist -> UNFIXABLE (ambiguous)
 *
 * Pass 2 - For remaining disconnected sub-nodes:
 *   1. Find target nodes that require the sub-node's output type
 *   2. If exactly 1 target exists -> AUTO-FIX
 *   3. If multiple targets exist -> UNFIXABLE (ambiguous)
 */
export function autoFixConnections(
	workflow: SimpleWorkflow,
	nodeTypes: INodeTypeDescription[],
	violations: ProgrammaticViolation[],
): AutoFixResult {
	const { nodeTypeMap, nodeTypesByName } = createNodeTypeMaps(nodeTypes);
	const nodesByName = new Map(workflow.nodes.map((node) => [node.name, node]));
	const subNodeOutputs = buildSubNodeOutputsMap(workflow, nodeTypeMap, nodeTypesByName);

	const ctx: AutoFixContext = {
		result: {
			fixed: [],
			unfixable: [],
			updatedConnections: structuredClone(workflow.connections ?? {}),
		},
		nodeTypeMap,
		nodeTypesByName,
		nodesByName,
		subNodeOutputs,
		connectedSubNodes: new Set<string>(),
		workflow,
	};

	// Pass 1: Fix nodes missing required inputs
	const missingInputViolations = violations.filter((v) => v.name === 'node-missing-required-input');
	for (const violation of missingInputViolations) {
		processMissingInputViolation(ctx, violation);
	}

	// Pass 2: Fix disconnected sub-nodes
	const disconnectedSubNodeViolations = violations.filter(
		(v) => v.name === 'sub-node-not-connected',
	);
	for (const violation of disconnectedSubNodeViolations) {
		processDisconnectedSubNodeViolation(ctx, violation);
	}

	return ctx.result;
}
