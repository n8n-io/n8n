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
	code: 'TERMINAL_BRANCH' | 'DISCONNECTED_NODES' | 'UNREACHABLE_NODES' | 'MISSING_SPEC_STAGE';
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
		.filter((node) => !node.disabled && node.type !== STICKY_NOTE_TYPE)
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
		if (!hasOutgoingMainConnection(json, node.name)) {
			nodeNames.push(node.name);
		}
	}

	return nodeNames;
}

function normalizedSpec(spec: string | undefined): string {
	return spec?.toLowerCase() ?? '';
}

function nodeSearchText(node: ActiveNode, rawNode: WorkflowJSON['nodes'][number]): string {
	return `${node.name} ${node.type} ${JSON.stringify(rawNode.parameters ?? {})}`.toLowerCase();
}

function nodeMatches(
	json: WorkflowJSON,
	predicate: (node: ActiveNode, rawNode: WorkflowJSON['nodes'][number], text: string) => boolean,
): boolean {
	const activeNodes = getActiveNodes(json);
	for (const node of activeNodes) {
		const rawNode = (json.nodes ?? []).find((candidate) => candidate.name === node.name);
		if (!rawNode) continue;
		if (predicate(node, rawNode, nodeSearchText(node, rawNode))) return true;
	}
	return false;
}

function findMissingSpecStages(json: WorkflowJSON, spec: string | undefined): string[] {
	const text = normalizedSpec(spec);
	if (!text) return [];

	const missing: string[] = [];
	const mentionsGmail = /\bgmail\b/.test(text);
	const mentionsEmailRead =
		mentionsGmail && /\b(read|fetch|get|received|inbox|emails?|messages?)\b/.test(text);
	const mentionsEmailSend = /\bsend\b/.test(text) && /\b(email|digest|gmail)\b/.test(text);
	const mentionsAi =
		/\b(openai|ai|llm|extract|summari[sz]e|prioriti[sz]e|classif(?:y|ication))\b/.test(text);

	if (
		mentionsGmail &&
		!nodeMatches(json, (node) => node.type.toLowerCase() === 'n8n-nodes-base.gmail')
	) {
		missing.push('Gmail node required by the build spec');
	}

	if (
		mentionsEmailRead &&
		!nodeMatches(json, (node, _rawNode, nodeText) => {
			return (
				node.type.toLowerCase() === 'n8n-nodes-base.gmail' &&
				/\b(get|getall|list|read|search|message|email)\b/.test(nodeText)
			);
		})
	) {
		missing.push('Gmail read/fetch stage required by the build spec');
	}

	if (
		mentionsEmailSend &&
		!nodeMatches(json, (node, _rawNode, nodeText) => {
			const nodeType = node.type.toLowerCase();
			return (
				nodeType === 'n8n-nodes-base.emailsend' ||
				nodeType.includes('smtp') ||
				nodeType.includes('sendgrid') ||
				nodeType.includes('mailgun') ||
				(nodeType === 'n8n-nodes-base.gmail' && /\b(send|reply|message|email)\b/.test(nodeText))
			);
		})
	) {
		missing.push('email/digest send stage required by the build spec');
	}

	if (
		mentionsAi &&
		!nodeMatches(json, (node) => {
			const nodeType = node.type.toLowerCase();
			return (
				nodeType.includes('openai') ||
				nodeType.includes('lmchat') ||
				nodeType.includes('n8n-nodes-langchain.agent') ||
				nodeType.includes('informationextractor') ||
				nodeType.includes('summarization')
			);
		})
	) {
		missing.push('AI/OpenAI extraction or summarization stage required by the build spec');
	}

	return missing;
}

export function validateWorkflowCompleteness(
	json: WorkflowJSON,
	options: { spec?: string } = {},
): WorkflowCompletenessResult {
	const issues: WorkflowCompletenessIssue[] = [];
	const activeNodes = getActiveNodes(json);
	const terminalBranchNodes = findBranchNodesWithoutOutgoingConnections(json);
	const disconnectedNodes = findDisconnectedNodes(json, activeNodes);
	const unreachableNodes = findUnreachableNodes(json, activeNodes);
	const missingSpecStages = findMissingSpecStages(json, options.spec);

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

	if (missingSpecStages.length > 0) {
		issues.push({
			code: 'MISSING_SPEC_STAGE',
			message: `Workflow is missing stages required by the build spec: ${missingSpecStages.join('; ')}.`,
		});
	}

	return { valid: issues.length === 0, issues };
}

export async function getCurrentBuildTaskSpec(
	context: InstanceAiContext,
): Promise<string | undefined> {
	const buildContext = context.workflowBuildContext;
	if (!buildContext?.plannedTaskService) return undefined;

	try {
		const graph = await buildContext.plannedTaskService.getGraph(buildContext.threadId);
		const task = graph?.tasks.find((candidate) => candidate.id === buildContext.taskId);
		if (!task) return undefined;
		return [task.title, task.spec].filter((part) => part.length > 0).join('\n');
	} catch {
		return undefined;
	}
}

export async function getPersistedWorkflowJson(
	context: InstanceAiContext,
	workflowId: string,
	fallback: WorkflowJSON,
): Promise<WorkflowJSON> {
	if (typeof context.workflowService.getAsWorkflowJSON !== 'function') return fallback;

	return await context.workflowService.getAsWorkflowJSON(workflowId);
}
