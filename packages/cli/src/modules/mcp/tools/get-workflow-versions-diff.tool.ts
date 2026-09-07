import type { User } from '@n8n/db';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { diff } from 'json-diff';
import omit from 'lodash/omit';
import type { IConnections, INode, INodeConnectionsDiff } from 'n8n-workflow';
import { compareConnections, compareWorkflowsNodes, NodeDiffStatus } from 'n8n-workflow';
import z from 'zod';

import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { WorkflowAccessError } from '../mcp.errors';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { nodeSchema, sanitizeNodeCredentials } from './schemas';
import { getMcpWorkflowVersion } from './workflow-history.utils';
import { getMcpWorkflow } from './workflow-validation.utils';

const inputSchema = {
	workflowId: z.string().describe('The ID of the workflow the versions belong to'),
	fromVersionId: z
		.string()
		.describe('The base (older) version ID, as returned by get_workflow_history'),
	toVersionId: z
		.string()
		.describe('The target (newer) version ID, as returned by get_workflow_history'),
} satisfies z.ZodRawShape;

const nodeChangeSummarySchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.string(),
});

const modifiedNodeSchema = nodeChangeSummarySchema.extend({
	changes: z
		.record(z.string(), z.unknown())
		.describe(
			'Field-level delta in json-diff format: changed values appear as { __old, __new }, added keys as "<key>__added", removed keys as "<key>__deleted", array changes as [op, value] tuples.',
		),
});

const connectionChangeSchema = z.object({
	from: z
		.string()
		.describe(
			'Source node name, using its target-version name, or its base-version name if the node no longer exists there',
		),
	to: z
		.string()
		.describe(
			'Target node name, using its target-version name, or its base-version name if the node no longer exists there',
		),
	type: z.string().describe("Connection type (e.g. 'main', 'ai_tool')"),
	fromOutput: z
		.number()
		.describe('Index of the source node output (e.g. 0 = true branch, 1 = false branch on an If)'),
	toInput: z.number().describe('Index of the target node input (e.g. 1 = second input of a Merge)'),
});

const outputSchema = {
	success: z.boolean(),
	workflowId: z.string(),
	fromVersionId: z.string(),
	toVersionId: z.string(),
	nodesAdded: z
		.array(nodeSchema)
		.describe(
			'Full content of nodes present in the target version but not in the base version (credentials reduced to { id, name }), so the diff is self-contained',
		),
	nodesRemoved: z
		.array(nodeChangeSummarySchema)
		.describe(
			'Nodes present in the base version but not in the target version. Fetch the base version with get_workflow_version if you need their content.',
		),
	nodesModified: z
		.array(modifiedNodeSchema)
		.describe(
			'Nodes present in both versions whose content changed (position-only moves are not reported). Listed by their name in the target version.',
		),
	connectionsAdded: z
		.array(connectionChangeSchema)
		.describe(
			'Connections present in the target version but not the base version. Renaming a node does not by itself produce connection changes; endpoints are matched by node id.',
		),
	connectionsRemoved: z
		.array(connectionChangeSchema)
		.describe('Connections present in the base version but not the target version.'),
	error: z.string().optional(),
} satisfies z.ZodRawShape;

type GetWorkflowVersionsDiffParams = {
	workflowId: string;
	fromVersionId: string;
	toVersionId: string;
};
type NodeChangeSummary = z.infer<typeof nodeChangeSummarySchema>;
type ModifiedNode = z.infer<typeof modifiedNodeSchema>;
type ConnectionChange = z.infer<typeof connectionChangeSchema>;
type GetWorkflowVersionsDiffResult = {
	workflowId: string;
	fromVersionId: string;
	toVersionId: string;
	nodesAdded: Array<Record<string, unknown>>;
	nodesRemoved: NodeChangeSummary[];
	nodesModified: ModifiedNode[];
	connectionsAdded: ConnectionChange[];
	connectionsRemoved: ConnectionChange[];
};
type GetWorkflowVersionsDiffOutput = GetWorkflowVersionsDiffResult & {
	success: boolean;
	error?: string;
};

// The delta diffs everything but `position`, mirroring `compareNodes` (which
// compares all persisted node fields except position), so `changes` explains
// why a node is listed as modified.
const IGNORED_NODE_PROPS = ['position'] as const;

// json-diff types its return as `any`; pin the delta shape at the boundary
// (undefined when both sides are equal).
const structuredDiff: (a: unknown, b: unknown) => Record<string, unknown> | undefined = diff;

function diffNodeContents(fromNode: INode, toNode: INode): Record<string, unknown> | undefined {
	// Credentials are reduced to `{ id, name }` per slot before diffing,
	// mirroring the get_workflow_version read path.
	return structuredDiff(
		omit(sanitizeNodeCredentials(fromNode), IGNORED_NODE_PROPS),
		omit(sanitizeNodeCredentials(toNode), IGNORED_NODE_PROPS),
	);
}

function toNodeChangeSummary(node: INode): NodeChangeSummary {
	return { id: node.id, name: node.name, type: node.type };
}

/**
 * Rewrites a version's connections so the source key and each connection's
 * target hold node ids instead of names. Names are the persisted connection
 * identity, so without this a rename reads as every edge on that node being
 * removed and re-added. A name matching no node (a stale entry) is kept as-is.
 */
function toIdKeyedConnections(connections: IConnections, nodes: INode[]): IConnections {
	const idByName = new Map(nodes.map((node) => [node.name, node.id]));
	const keyed: IConnections = {};
	for (const [sourceName, byType] of Object.entries(connections)) {
		keyed[idByName.get(sourceName) ?? sourceName] = Object.fromEntries(
			Object.entries(byType).map(([type, outputs]) => [
				type,
				outputs.map(
					(connections) =>
						connections?.map((connection) => ({
							...connection,
							node: idByName.get(connection.node) ?? connection.node,
						})) ?? null,
				),
			]),
		);
	}
	return keyed;
}

function flattenConnectionsDiff(
	connectionsDiff: Record<string, INodeConnectionsDiff>,
	nameById: Map<string, string>,
): ConnectionChange[] {
	const changes: ConnectionChange[] = [];
	for (const [from, byType] of Object.entries(connectionsDiff)) {
		for (const [type, entries] of Object.entries(byType)) {
			for (const entry of entries) {
				if (!entry.value) continue;
				const { node, index } = entry.value.connection;
				changes.push({
					from: nameById.get(from) ?? from,
					to: nameById.get(node) ?? node,
					type,
					fromOutput: entry.sourceIndex,
					toInput: index,
				});
			}
		}
	}
	return changes;
}

/**
 * Creates the MCP tool definition for comparing two workflow versions. Reuses
 * the same diff primitives as the editor's diff view and MCP version metadata
 * (compareWorkflowsNodes/compareConnections), plus a json-diff field-level
 * delta for modified nodes so clients don't have to fetch both versions.
 */
export const createGetWorkflowVersionsDiffTool = (
	user: User,
	workflowFinderService: WorkflowFinderService,
	workflowHistoryService: WorkflowHistoryService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'get_workflow_versions_diff',
	config: {
		description:
			'Compare two saved versions of a workflow and return what changed between them: nodes added (with their full content), removed, or modified (with a field-level delta per modified node) and connections added or removed. Pass the older version as fromVersionId and the newer one as toVersionId, using version IDs from get_workflow_history.',
		inputSchema,
		outputSchema,
		annotations: {
			title: 'Get Workflow Versions Diff',
			readOnlyHint: true,
			destructiveHint: false,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({ workflowId, fromVersionId, toVersionId }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'get_workflow_versions_diff',
			parameters: { workflowId },
		};

		try {
			const payload = await getWorkflowVersionsDiff(
				user,
				workflowFinderService,
				workflowHistoryService,
				{ workflowId, fromVersionId, toVersionId },
			);

			const output: GetWorkflowVersionsDiffOutput = { success: true, ...payload };

			telemetryPayload.results = {
				success: true,
				data: { workflow_id: workflowId },
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
			};
		} catch (er) {
			const error = ensureError(er);
			const isAccessError = error instanceof WorkflowAccessError;

			const output: GetWorkflowVersionsDiffOutput = {
				success: false,
				workflowId,
				fromVersionId,
				toVersionId,
				nodesAdded: [],
				nodesRemoved: [],
				nodesModified: [],
				connectionsAdded: [],
				connectionsRemoved: [],
				error: error.message,
			};

			telemetryPayload.results = {
				success: false,
				error: error.message,
				error_reason: isAccessError ? error.reason : undefined,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text', text: JSON.stringify(output) }],
				structuredContent: output,
				isError: true,
			};
		}
	},
});

export async function getWorkflowVersionsDiff(
	user: User,
	workflowFinderService: WorkflowFinderService,
	workflowHistoryService: WorkflowHistoryService,
	{ workflowId, fromVersionId, toVersionId }: GetWorkflowVersionsDiffParams,
): Promise<GetWorkflowVersionsDiffResult> {
	// Enforce the MCP access gate (scope + not-archived + availableInMCP) before reading versions.
	await getMcpWorkflow(workflowId, user, ['workflow:read'], workflowFinderService);

	const [fromVersion, toVersion] = await Promise.all([
		getMcpWorkflowVersion(workflowHistoryService, user, workflowId, fromVersionId),
		getMcpWorkflowVersion(workflowHistoryService, user, workflowId, toVersionId),
	]);

	const fromNodes = fromVersion.nodes ?? [];
	const toNodes = toVersion.nodes ?? [];
	const nodeDiff = compareWorkflowsNodes(fromNodes, toNodes);
	// The diff stores the pre-change node for modified entries; report the
	// post-change node so a renamed node is listed by a name that still exists.
	const toNodesById = new Map(toNodes.map((node) => [node.id, node]));

	const nodesAdded: Array<Record<string, unknown>> = [];
	const nodesRemoved: NodeChangeSummary[] = [];
	const nodesModified: ModifiedNode[] = [];
	for (const { status, node } of nodeDiff.values()) {
		// Added nodes carry their full content so the diff is self-contained;
		// removed nodes stay a summary (their content lives in the base version).
		if (status === NodeDiffStatus.Added) nodesAdded.push(sanitizeNodeCredentials(node));
		else if (status === NodeDiffStatus.Deleted) nodesRemoved.push(toNodeChangeSummary(node));
		else if (status === NodeDiffStatus.Modified) {
			// Modified implies the id is present in the target version; the guard
			// only narrows the type.
			const toNode = toNodesById.get(node.id);
			if (!toNode) continue;
			nodesModified.push({
				...toNodeChangeSummary(toNode),
				changes: diffNodeContents(node, toNode) ?? {},
			});
		}
	}

	// Compare by node id so a rename doesn't read as edge churn, then report
	// names again. Target names win so a renamed node is listed by a name that
	// still exists; base names cover endpoints only present in the base version.
	const nameById = new Map([...fromNodes, ...toNodes].map((node) => [node.id, node.name]));
	const connectionsDiff = compareConnections(
		toIdKeyedConnections(fromVersion.connections ?? {}, fromNodes),
		toIdKeyedConnections(toVersion.connections ?? {}, toNodes),
	);

	return {
		workflowId,
		fromVersionId: fromVersion.versionId,
		toVersionId: toVersion.versionId,
		nodesAdded,
		nodesRemoved,
		nodesModified,
		connectionsAdded: flattenConnectionsDiff(connectionsDiff.added, nameById),
		connectionsRemoved: flattenConnectionsDiff(connectionsDiff.removed, nameById),
	};
}
