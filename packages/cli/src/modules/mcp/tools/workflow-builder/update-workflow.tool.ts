import { type User, type SharedWorkflowRepository, WorkflowEntity } from '@n8n/db';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { MCP_UPDATE_WORKFLOW_TOOL } from './constants';
import { validateCredentialReferences } from './credential-validation';
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

const MAX_OPERATIONS_PER_CALL = 100;

const inputSchema = {
	workflowId: z.string().describe('The ID of the workflow to update.'),
	operations: z
		.array(partialUpdateOperationSchema)
		.min(1)
		.max(MAX_OPERATIONS_PER_CALL)
		.describe(
			`Ordered list of operations to apply (max ${MAX_OPERATIONS_PER_CALL}). Operations are applied atomically: if any operation fails (e.g. node not found, duplicate name), the whole batch is rejected and no changes are saved.`,
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
	validationWarnings: z
		.array(
			z.object({
				code: z.string(),
				message: z.string(),
				nodeName: z.string().optional(),
			}),
		)
		.describe(
			'Graph and JSON validation warnings on the resulting workflow. Use these to self-correct on the next call.',
		),
	note: z.string().optional(),
} satisfies z.ZodRawShape;

/**
 * MCP tool that updates a workflow by applying a small list of named operations
 * (addNode, removeNode, updateNodeParameters, addConnection, …) directly to the
 * stored JSON. The agent emits a tiny diff per call instead of re-sending the
 * full SDK code, which keeps output-token cost roughly constant per edit.
 *
 * Graph + JSON validation runs on the resulting workflow before save, so the
 * end-state safety net matches the create-from-code path; only the
 * TS-code → JSON parse step is skipped.
 */
export const createUpdateWorkflowTool = (
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
	name: MCP_UPDATE_WORKFLOW_TOOL.toolName,
	config: {
		description:
			'Apply a small list of operations to an existing workflow (see the operations input schema for the supported op types). The whole batch is atomic: if any op fails the workflow is left unchanged.',
		inputSchema,
		outputSchema,
		annotations: {
			title: MCP_UPDATE_WORKFLOW_TOOL.displayTitle,
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
			tool_name: MCP_UPDATE_WORKFLOW_TOOL.toolName,
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

			const credentialCheck = await validateCredentialReferences(
				operations,
				existingWorkflow,
				user,
				credentialsService,
				nodeTypes,
			);
			if (!credentialCheck.ok) {
				throw new Error(credentialCheck.error);
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
				const addedNodeSet = new Set(result.addedNodeNames);
				const addedNodes = workflowUpdateData.nodes.filter((n) => addedNodeSet.has(n.name));
				const sharedWorkflow = await sharedWorkflowRepository.findOneOrFail({
					where: { workflowId, role: 'workflow:owner' },
					select: ['projectId'],
				});

				const autoAssign = await autoPopulateNodeCredentials(
					{ ...workflowUpdateData, nodes: addedNodes },
					user,
					nodeTypes,
					credentialsService,
					sharedWorkflow.projectId,
				);
				credentialAssignments = autoAssign.assignments;
				skippedHttpNodes = autoAssign.skippedHttpNodes;
			}

			const { ParseValidateHandler } = await import('@n8n/ai-workflow-builder');
			const validator = new ParseValidateHandler({ generatePinData: false });
			const validationWarnings = validator.validateJSON({
				name: workflowUpdateData.name,
				nodes: workflowUpdateData.nodes,
				connections: workflowUpdateData.connections,
			} as unknown as WorkflowJSON);

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
				validationWarnings,
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
