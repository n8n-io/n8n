import type { User } from '@n8n/db';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { diff } from 'json-diff';
import pick from 'lodash/pick';
import type { INode, INodeConnectionsDiff } from 'n8n-workflow';
import { compareConnections, compareWorkflowsNodes, NodeDiffStatus } from 'n8n-workflow';
import z from 'zod';

import type { Telemetry } from '@/telemetry';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { WorkflowAccessError } from '../mcp.errors';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { sanitizeNodeCredentials } from './schemas';
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
	from: z.string().describe('Source node name'),
	to: z.string().describe('Target node name'),
	type: z.string().describe("Connection type (e.g. 'main', 'ai_tool')"),
});

const outputSchema = {
	success: z.boolean(),
	workflowId: z.string(),
	fromVersionId: z.string(),
	toVersionId: z.string(),
	nodesAdded: z
		.array(nodeChangeSummarySchema)
		.describe('Nodes present in the target version but not in the base version'),
	nodesRemoved: z
		.array(nodeChangeSummarySchema)
		.describe('Nodes present in the base version but not in the target version'),
	nodesModified: z
		.array(modifiedNodeSchema)
		.describe(
			'Nodes present in both versions whose content changed (position-only moves are not reported). Listed by their name in the target version.',
		),
	connectionsAdded: z.array(connectionChangeSchema),
	connectionsRemoved: z.array(connectionChangeSchema),
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
	nodesAdded: NodeChangeSummary[];
	nodesRemoved: NodeChangeSummary[];
	nodesModified: ModifiedNode[];
	connectionsAdded: ConnectionChange[];
	connectionsRemoved: ConnectionChange[];
};
type GetWorkflowVersionsDiffOutput = GetWorkflowVersionsDiffResult & {
	success: boolean;
	error?: string;
};

// The property set compareWorkflowsNodes marks a node "modified" by, so the
// delta explains exactly why the node is listed.
const DIFFED_NODE_PROPS = ['name', 'type', 'typeVersion', 'webhookId', 'credentials', 'parameters'];

// json-diff types its return as `any`; pin the delta shape at the boundary
// (undefined when both sides are equal).
const structuredDiff: (a: unknown, b: unknown) => Record<string, unknown> | undefined = diff;

function diffNodeContents(fromNode: INode, toNode: INode): Record<string, unknown> {
	// Credentials are reduced to `{ id, name }` per slot before diffing,
	// mirroring the get_workflow_version read path.
	return (
		structuredDiff(
			pick(sanitizeNodeCredentials(fromNode), DIFFED_NODE_PROPS),
			pick(sanitizeNodeCredentials(toNode), DIFFED_NODE_PROPS),
		) ?? {}
	);
}

function toNodeChangeSummary(node: INode): NodeChangeSummary {
	return { id: node.id, name: node.name, type: node.type };
}

function flattenConnectionsDiff(
	connectionsDiff: Record<string, INodeConnectionsDiff>,
): ConnectionChange[] {
	const changes: ConnectionChange[] = [];
	for (const [from, byType] of Object.entries(connectionsDiff)) {
		for (const [type, entries] of Object.entries(byType)) {
			for (const entry of entries) {
				if (!entry.value) continue;
				changes.push({ from, to: entry.value.connection.node, type });
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
			'Compare two saved versions of a workflow and return what changed between them: nodes added, removed, or modified (with a field-level delta per modified node) and connections added or removed. Pass the older version as fromVersionId and the newer one as toVersionId, using version IDs from get_workflow_history.',
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
			parameters: { workflowId, fromVersionId, toVersionId },
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
				data: {
					workflow_id: workflowId,
					from_version_id: fromVersionId,
					to_version_id: toVersionId,
					nodes_added: payload.nodesAdded.length,
					nodes_removed: payload.nodesRemoved.length,
					nodes_modified: payload.nodesModified.length,
					connections_added: payload.connectionsAdded.length,
					connections_removed: payload.connectionsRemoved.length,
				},
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

	const nodesAdded: NodeChangeSummary[] = [];
	const nodesRemoved: NodeChangeSummary[] = [];
	const nodesModified: ModifiedNode[] = [];
	for (const { status, node } of nodeDiff.values()) {
		if (status === NodeDiffStatus.Added) nodesAdded.push(toNodeChangeSummary(node));
		else if (status === NodeDiffStatus.Deleted) nodesRemoved.push(toNodeChangeSummary(node));
		else if (status === NodeDiffStatus.Modified) {
			const toNode = toNodesById.get(node.id);
			if (!toNode) continue;
			nodesModified.push({
				...toNodeChangeSummary(toNode),
				changes: diffNodeContents(node, toNode),
			});
		}
	}

	const connectionsDiff = compareConnections(
		fromVersion.connections ?? {},
		toVersion.connections ?? {},
	);

	return {
		workflowId,
		fromVersionId: fromVersion.versionId,
		toVersionId: toVersion.versionId,
		nodesAdded,
		nodesRemoved,
		nodesModified,
		connectionsAdded: flattenConnectionsDiff(connectionsDiff.added),
		connectionsRemoved: flattenConnectionsDiff(connectionsDiff.removed),
	};
}
