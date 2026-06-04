import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { isTriggerNodeType } from './workflow-json-utils';
import type { InstanceAiContext } from '../../types';

const STICKY_NOTE_TYPE = 'n8n-nodes-base.stickyNote';
const BRANCH_NODE_TYPES = new Set(['n8n-nodes-base.if', 'n8n-nodes-base.switch']);

interface ActiveNode {
	name: string;
	type: string;
}

interface ConnectionLink {
	node: string;
}

export interface WorkflowCompletenessIssue {
	code: 'TERMINAL_BRANCH' | 'DISCONNECTED_NODES' | 'UNREACHABLE_NODES';
	message: string;
}

export interface WorkflowCompletenessResult {
	valid: boolean;
	issues: WorkflowCompletenessIssue[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isConnectionLink(value: unknown): value is ConnectionLink {
	return isRecord(value) && typeof value.node === 'string' && value.node.length > 0;
}

function getActiveNodes(json: WorkflowJSON): ActiveNode[] {
	return (json.nodes ?? [])
		.filter(
			(node): node is WorkflowJSON['nodes'][number] & ActiveNode =>
				typeof node.name === 'string' &&
				node.name.length > 0 &&
				!node.disabled &&
				node.type !== STICKY_NOTE_TYPE,
		)
		.map((node) => ({ name: node.name, type: node.type }));
}

function forEachConnection(
	json: WorkflowJSON,
	visitor: (source: string, connectionType: string, link: ConnectionLink) => void,
): void {
	for (const [source, outputs] of Object.entries(json.connections ?? {})) {
		if (!isRecord(outputs)) continue;

		for (const [connectionType, connectionGroup] of Object.entries(outputs)) {
			if (!Array.isArray(connectionGroup)) continue;
			for (const outputConnections of connectionGroup) {
				if (!Array.isArray(outputConnections)) continue;
				for (const link of outputConnections) {
					if (isConnectionLink(link)) visitor(source, connectionType, link);
				}
			}
		}
	}
}

function buildForwardAdjacency(json: WorkflowJSON): Map<string, Set<string>> {
	const adjacency = new Map<string, Set<string>>();
	forEachConnection(json, (source, _connectionType, link) => {
		if (!adjacency.has(source)) adjacency.set(source, new Set());
		adjacency.get(source)?.add(link.node);
	});
	return adjacency;
}

function buildReverseAiAdjacency(json: WorkflowJSON): Map<string, Set<string>> {
	const adjacency = new Map<string, Set<string>>();
	forEachConnection(json, (source, connectionType, link) => {
		if (!connectionType.startsWith('ai_')) return;
		if (!adjacency.has(link.node)) adjacency.set(link.node, new Set());
		adjacency.get(link.node)?.add(source);
	});
	return adjacency;
}

function findReachableNodes(
	triggerNames: string[],
	forward: Map<string, Set<string>>,
): Set<string> {
	const reachable = new Set<string>();
	const queue = [...triggerNames];

	for (const nodeName of queue) {
		if (reachable.has(nodeName)) continue;
		reachable.add(nodeName);

		for (const next of forward.get(nodeName) ?? []) {
			if (!reachable.has(next)) queue.push(next);
		}
	}

	return reachable;
}

function includeReachableAiSubNodes(
	reachable: Set<string>,
	reverseAi: Map<string, Set<string>>,
): void {
	const queue = [...reachable];
	for (const nodeName of queue) {
		for (const source of reverseAi.get(nodeName) ?? []) {
			if (!reachable.has(source)) {
				reachable.add(source);
				queue.push(source);
			}
		}
	}
}

function findDisconnectedNodes(json: WorkflowJSON, activeNodes: ActiveNode[]): string[] {
	if (activeNodes.length <= 1) return [];

	const connected = new Set<string>();
	forEachConnection(json, (source, _connectionType, link) => {
		connected.add(source);
		connected.add(link.node);
	});

	return activeNodes.filter((node) => !connected.has(node.name)).map((node) => node.name);
}

function findUnreachableNodes(json: WorkflowJSON, activeNodes: ActiveNode[]): string[] {
	const triggers = activeNodes.filter((node) => isTriggerNodeType(node.type));
	if (triggers.length === 0) return [];

	const reachable = findReachableNodes(
		triggers.map((node) => node.name),
		buildForwardAdjacency(json),
	);
	includeReachableAiSubNodes(reachable, buildReverseAiAdjacency(json));

	return activeNodes.filter((node) => !reachable.has(node.name)).map((node) => node.name);
}

function hasOutgoingMainConnection(json: WorkflowJSON, nodeName: string): boolean {
	const sourceConnections = json.connections?.[nodeName];
	if (!isRecord(sourceConnections)) return false;

	const mainConnections = sourceConnections.main;
	if (!Array.isArray(mainConnections)) return false;

	return mainConnections.some((outputConnections) => {
		return Array.isArray(outputConnections) && outputConnections.length > 0;
	});
}

function findBranchNodesWithoutOutgoingConnections(json: WorkflowJSON): string[] {
	const nodeNames: string[] = [];

	for (const node of json.nodes ?? []) {
		if (node.disabled || !BRANCH_NODE_TYPES.has(node.type)) continue;
		if (typeof node.name !== 'string' || node.name.length === 0) continue;
		if (!hasOutgoingMainConnection(json, node.name)) {
			nodeNames.push(node.name);
		}
	}

	return nodeNames;
}

export function validateWorkflowCompleteness(json: WorkflowJSON): WorkflowCompletenessResult {
	const issues: WorkflowCompletenessIssue[] = [];
	const activeNodes = getActiveNodes(json);
	const terminalBranchNodes = findBranchNodesWithoutOutgoingConnections(json);
	const disconnectedNodes = findDisconnectedNodes(json, activeNodes);
	const unreachableNodes = findUnreachableNodes(json, activeNodes);

	if (terminalBranchNodes.length > 0) {
		issues.push({
			code: 'TERMINAL_BRANCH',
			message: `Workflow has branch nodes with no downstream connections: ${terminalBranchNodes.join(', ')}. Connect each IF/Switch output to the next action, or remove the branch if no routing is needed.`,
		});
	}

	if (disconnectedNodes.length > 0) {
		issues.push({
			code: 'DISCONNECTED_NODES',
			message: `Workflow has disconnected nodes: ${disconnectedNodes.join(', ')}.`,
		});
	}

	if (unreachableNodes.length > 0) {
		issues.push({
			code: 'UNREACHABLE_NODES',
			message: `Workflow has nodes that are not reachable from any trigger: ${unreachableNodes.join(', ')}.`,
		});
	}

	return { valid: issues.length === 0, issues };
}

export async function getPersistedWorkflowJson(
	context: InstanceAiContext,
	workflowId: string,
	fallback: WorkflowJSON,
): Promise<WorkflowJSON> {
	if (typeof context.workflowService.getAsWorkflowJSON !== 'function') return fallback;

	return await context.workflowService.getAsWorkflowJSON(workflowId);
}
