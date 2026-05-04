import { type User, type SharedWorkflowRepository, WorkflowEntity } from '@n8n/db';
import type { IWorkflowBase } from 'n8n-workflow';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { MCP_UPDATE_PARTIAL_WORKFLOW_TOOL } from './constants';
import { autoPopulateNodeCredentials } from './credentials-auto-assign';
import {
	applyOperations,
	partialUpdateOperationSchema,
	toWorkflowSlice,
	type PartialUpdateOperation,
} from './workflow-operations';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { NodeTypes } from '@/node-types';
import type { UrlService } from '@/services/url.service';
import type { Telemetry } from '@/telemetry';
import { resolveNodeWebhookIds } from '@/workflow-helpers';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowService } from '@/workflows/workflow.service';

import { getMcpWorkflow } from '../workflow-validation.utils';

const inputSchema = {
	workflowId: z.string().describe('The ID of the workflow to update.'),
	operations: z
		.array(partialUpdateOperationSchema)
		.min(1)
		.describe(
			'Ordered list of operations to apply. Operations are applied atomically: if any operation fails (e.g. node not found, duplicate name), the whole batch is rejected and no changes are saved.',
		),
} satisfies z.ZodRawShape;

const outputSchema = {
	workflowId: z.string(),
	name: z.string(),
	nodeCount: z.number(),
	url: z.string(),
	appliedOperations: z.number().describe('Number of operations applied.'),
	autoAssignedCredentials: z
		.array(
			z.object({
				nodeName: z.string(),
				credentialName: z.string(),
				credentialType: z.string(),
			}),
		)
		.describe('Credentials auto-assigned to nodes that were added in this update.'),
	note: z.string().optional(),
} satisfies z.ZodRawShape;

/**
 * MCP tool that updates a workflow by applying a small list of named operations
 * (addNode, removeNode, updateNodeParameters, addConnection, …) directly to the
 * stored JSON. Avoids the full code → JSON parse pass of `update_workflow`,
 * keeping per-edit payloads small for iterative agent use.
 */
export const createUpdatePartialWorkflowTool = (
	user: User,
	workflowFinderService: WorkflowFinderService,
	workflowService: WorkflowService,
	urlService: UrlService,
	telemetry: Telemetry,
	nodeTypes: NodeTypes,
	credentialsService: CredentialsService,
	sharedWorkflowRepository: SharedWorkflowRepository,
	collaborationService: CollaborationService,
): ToolDefinition<typeof inputSchema> => ({
	name: MCP_UPDATE_PARTIAL_WORKFLOW_TOOL.toolName,
	config: {
		description:
			'Apply a small list of operations (addNode, removeNode, updateNodeParameters, renameNode, addConnection, removeConnection, setNodeCredential, setNodePosition, setNodeDisabled, setWorkflowMetadata) to an existing workflow. Prefer this over update_workflow for iterative edits — it avoids re-sending the full workflow code. The whole batch is atomic: if any op fails the workflow is left unchanged.',
		inputSchema,
		outputSchema,
		annotations: {
			title: MCP_UPDATE_PARTIAL_WORKFLOW_TOOL.displayTitle,
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: false,
			openWorldHint: false,
		},
	},
	handler: async ({
		workflowId,
		operations,
	}: {
		workflowId: string;
		operations: PartialUpdateOperation[];
	}) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: MCP_UPDATE_PARTIAL_WORKFLOW_TOOL.toolName,
			parameters: {
				workflowId,
				opCount: operations.length,
				opTypes: operations.map((op) => op.type),
			},
		};

		try {
			const existingWorkflow = await getMcpWorkflow(
				workflowId,
				user,
				['workflow:update'],
				workflowFinderService,
			);

			await collaborationService.ensureWorkflowEditable(existingWorkflow.id);

			const result = applyOperations(toWorkflowSlice(existingWorkflow), operations);

			if (!result.success) {
				throw new Error(result.error);
			}

			const workflowUpdateData = new WorkflowEntity();
			Object.assign(workflowUpdateData, {
				name: result.workflow.name,
				...(result.workflow.description !== undefined
					? { description: result.workflow.description }
					: {}),
				nodes: result.workflow.nodes,
				connections: result.workflow.connections,
				meta: {
					...(existingWorkflow.meta ?? {}),
					aiBuilderAssisted: true,
					builderVariant: 'mcp',
				},
			});

			resolveNodeWebhookIds(workflowUpdateData, nodeTypes);

			let credentialAssignments: Array<{
				nodeName: string;
				credentialName: string;
				credentialType: string;
			}> = [];
			let skippedHttpNodes: string[] = [];

			if (result.addedNodeNames.length > 0) {
				const addedNodes = workflowUpdateData.nodes.filter((n) =>
					result.addedNodeNames.includes(n.name),
				);
				const sharedWorkflow = await sharedWorkflowRepository.findOneOrFail({
					where: { workflowId, role: 'workflow:owner' },
					select: ['projectId'],
				});

				const slimWorkflow: IWorkflowBase = {
					...workflowUpdateData,
					nodes: addedNodes,
				};
				const autoAssign = await autoPopulateNodeCredentials(
					slimWorkflow,
					user,
					nodeTypes,
					credentialsService,
					sharedWorkflow.projectId,
				);
				credentialAssignments = autoAssign.assignments;
				skippedHttpNodes = autoAssign.skippedHttpNodes;
			}

			const updatedWorkflow = await workflowService.update(user, workflowUpdateData, workflowId, {
				aiBuilderAssisted: true,
				source: 'n8n-mcp',
			});

			void collaborationService.broadcastWorkflowUpdate(workflowId, user.id).catch(() => {});

			const baseUrl = urlService.getInstanceBaseUrl();
			const workflowUrl = `${baseUrl}/workflow/${updatedWorkflow.id}`;

			telemetryPayload.results = {
				success: true,
				data: {
					workflowId: updatedWorkflow.id,
					nodeCount: updatedWorkflow.nodes.length,
				},
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const output = {
				workflowId: updatedWorkflow.id,
				name: updatedWorkflow.name,
				nodeCount: updatedWorkflow.nodes.length,
				url: workflowUrl,
				appliedOperations: operations.length,
				autoAssignedCredentials: credentialAssignments,
				note: skippedHttpNodes.length
					? `HTTP Request nodes (${skippedHttpNodes.join(', ')}) were skipped during credential auto-assignment. Their credentials must be configured manually.`
					: undefined,
			};

			return {
				content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
				structuredContent: output,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);

			telemetryPayload.results = {
				success: false,
				error: errorMessage,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const output = { error: errorMessage };

			return {
				content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
				structuredContent: output,
				isError: true,
			};
		}
	},
});
