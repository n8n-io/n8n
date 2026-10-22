import type { ITag } from '@n8n/rest-api-client/api/tags';
import { deepCopy } from 'n8n-workflow';
import type { IConnections, INode, IWorkflowGroup, IWorkflowSettings } from 'n8n-workflow';
import { markRaw } from 'vue';

import type { IWorkflowDb } from '@/Interface';

/** The workflow content that the diff viewer needs. */
export type DiffWorkflowInput = {
	id: string;
	name: string;
	/** Unique per side. The diff keeps one workflow document for each id and version. */
	versionId: string;
	nodes: INode[];
	connections: IConnections;
	nodeGroups?: IWorkflowGroup[];
	settings?: IWorkflowSettings;
	tags?: ITag[];
	isArchived?: boolean;
	createdAt?: string;
};

/**
 * Builds a detached, non-reactive workflow for the diff viewer. A reactive source makes the
 * viewer hydrate and dispose its workflow documents in a loop.
 */
export function toDiffWorkflow(input: DiffWorkflowInput): IWorkflowDb {
	const createdAt = input.createdAt ?? '';
	return markRaw(
		deepCopy({
			id: input.id,
			name: input.name,
			active: false,
			isArchived: input.isArchived ?? false,
			createdAt,
			updatedAt: createdAt,
			versionId: input.versionId,
			activeVersionId: null,
			nodes: input.nodes,
			connections: input.connections,
			nodeGroups: input.nodeGroups,
			// A workflow without an execution order runs with the legacy `v0` order.
			settings: {
				...(input.settings ?? {}),
				executionOrder: input.settings?.executionOrder ?? 'v0',
			},
			tags: input.tags,
		}),
	);
}
