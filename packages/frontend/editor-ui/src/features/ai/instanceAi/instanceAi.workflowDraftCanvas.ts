import { isRecord } from '@n8n/utils/is-record';
import {
	isNodeConnectionType,
	type IConnection,
	type IConnections,
	type INodeConnections,
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

function toNode(node: DraftNode, filePath: string): INodeUi {
	return {
		// A stable fallback id keeps the canvas from remounting nodes between revisions.
		id: node.id ?? `${filePath}:${node.name}`,
		name: node.name,
		type: node.type,
		typeVersion: node.typeVersion,
		position: node.position,
		parameters: isNodeParameters(node.parameters) ? node.parameters : {},
		...(node.disabled !== undefined ? { disabled: node.disabled } : {}),
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
	return {
		id: documentWorkflowId,
		name: draft.workflow.name,
		active: false,
		isArchived: false,
		createdAt: 0,
		updatedAt: 0,
		versionId: `draft-${draft.revision}`,
		activeVersionId: null,
		nodes: draft.workflow.nodes.map((node) => toNode(node, draft.filePath)),
		connections: toConnections(draft.workflow.connections),
	};
}
