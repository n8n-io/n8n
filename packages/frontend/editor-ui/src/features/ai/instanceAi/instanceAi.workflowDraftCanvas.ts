import { isRecord } from '@n8n/utils/is-record';
import {
	isNodeConnectionType,
	type IConnection,
	type IConnections,
	type INodeConnections,
	type INodeIssues,
	type INodeParameters,
} from 'n8n-workflow';

import type { INodeUi, IWorkflowDb } from '@/Interface';
import type { WorkflowDraft } from './instanceAi.workflowDrafts';

type DraftNode = WorkflowDraft['workflow']['nodes'][number];
type DraftConnections = WorkflowDraft['workflow']['connections'];
type DraftConnection = NonNullable<NonNullable<DraftConnections[string][string][number]>[number]>;

// Parameters only feed the read-only canvas (subtitles, sticky content), so any
// object is good enough here.
function isNodeParameters(value: unknown): value is INodeParameters {
	return isRecord(value);
}

type DraftIssue = NonNullable<WorkflowDraft['issues']>[number];

/** Node issues by node name, keyed by issue code, so the canvas marks the nodes. */
function toIssuesByNodeName(issues: DraftIssue[] = []): Map<string, INodeIssues> {
	const byNode = new Map<string, Record<string, string[]>>();
	for (const { nodeName, code, message } of issues) {
		if (!nodeName) continue;
		const parameters = byNode.get(nodeName) ?? {};
		// An issue code can match an inherited property, for example `constructor`.
		const messages = Object.hasOwn(parameters, code) ? parameters[code] : [];
		parameters[code] = [...messages, message];
		byNode.set(nodeName, parameters);
	}
	return new Map([...byNode].map(([name, parameters]) => [name, { parameters }]));
}

/**
 * The canvas id of a draft node. A compile gives new random ids to nodes that the
 * source does not name an id for, so the name keeps the id the same between
 * revisions and the canvas does not mount the node again.
 */
function canvasNodeId(filePath: string, node: DraftNode): string {
	return `${filePath}:${node.name}`;
}

function toNode(node: DraftNode, filePath: string, issues?: INodeIssues): INodeUi {
	return {
		id: canvasNodeId(filePath, node),
		name: node.name,
		type: node.type,
		typeVersion: node.typeVersion,
		position: node.position,
		parameters: isNodeParameters(node.parameters) ? node.parameters : {},
		...(node.disabled !== undefined ? { disabled: node.disabled } : {}),
		...(issues ? { issues } : {}),
	};
}

function toConnection({ node, type, index }: DraftConnection): IConnection | undefined {
	return isNodeConnectionType(type) ? { node, type, index } : undefined;
}

function toNodeConnections(byType: DraftConnections[string]): INodeConnections {
	const result: INodeConnections = {};
	for (const [type, outputs] of Object.entries(byType)) {
		if (!isNodeConnectionType(type)) continue;
		result[type] = outputs.map(
			(output) => output?.flatMap((connection) => toConnection(connection) ?? []) ?? null,
		);
	}
	return result;
}

function toConnections(connections: DraftConnections): IConnections {
	return Object.fromEntries(
		Object.entries(connections).map(([source, byType]) => [source, toNodeConnections(byType)]),
	);
}

/** The draft as a workflow document the canvas can render, under its own document id. */
export function toDraftWorkflowDb(draft: WorkflowDraft, documentWorkflowId: string): IWorkflowDb {
	const issuesByNodeName = toIssuesByNodeName(draft.issues);
	return {
		id: documentWorkflowId,
		name: draft.workflow.name,
		active: false,
		isArchived: false,
		createdAt: 0,
		updatedAt: 0,
		versionId: `draft-${draft.revision}`,
		activeVersionId: null,
		nodes: draft.workflow.nodes.map((node) =>
			toNode(node, draft.filePath, issuesByNodeName.get(node.name)),
		),
		connections: toConnections(draft.workflow.connections),
		...(draft.workflow.nodeGroups ? { nodeGroups: toCanvasGroups(draft) } : {}),
	};
}

function toCanvasGroups(draft: WorkflowDraft) {
	const canvasIds = new Map(
		draft.workflow.nodes.flatMap((node) =>
			node.id ? [[node.id, canvasNodeId(draft.filePath, node)]] : [],
		),
	);
	return draft.workflow.nodeGroups?.map((group) => ({
		...group,
		nodeIds: group.nodeIds.flatMap((id) => canvasIds.get(id) ?? []),
	}));
}

/** A stable key for a draft node. A compile can give new ids, so the key is the name. */
export function draftNodeKey(node: DraftNode): string {
	return node.name;
}

function keepConnections(connections: DraftConnections, names: Set<string>): DraftConnections {
	const kept: DraftConnections = {};
	for (const [source, byType] of Object.entries(connections)) {
		if (!names.has(source)) continue;
		kept[source] = Object.fromEntries(
			Object.entries(byType).map(([type, outputs]) => [
				type,
				outputs.map((output) => output?.filter((connection) => names.has(connection.node)) ?? null),
			]),
		);
	}
	return kept;
}

/** The draft with only the given nodes, and the connections and groups between them. */
export function withDraftNodes(draft: WorkflowDraft, nodes: DraftNode[]): WorkflowDraft {
	const names = new Set(nodes.map((node) => node.name));
	const ids = new Set(nodes.flatMap((node) => (node.id ? [node.id] : [])));
	const { nodeGroups, ...workflow } = draft.workflow;
	const groups = nodeGroups
		?.map((group) => ({ ...group, nodeIds: group.nodeIds.filter((id) => ids.has(id)) }))
		.filter((group) => group.nodeIds.length > 0);
	return {
		...draft,
		workflow: {
			...workflow,
			nodes,
			connections: keepConnections(workflow.connections, names),
			...(groups ? { nodeGroups: groups } : {}),
		},
	};
}
