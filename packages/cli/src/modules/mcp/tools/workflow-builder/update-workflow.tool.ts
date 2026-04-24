import { type User, type SharedWorkflowRepository, WorkflowEntity } from '@n8n/db';
import { layoutWorkflowJSON } from '@n8n/workflow-sdk';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { CODE_BUILDER_VALIDATE_TOOL, MCP_UPDATE_WORKFLOW_TOOL } from './constants';
import { autoPopulateNodeCredentials, stripNullCredentialStubs } from './credentials-auto-assign';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { NodeTypes } from '@/node-types';
import type { UrlService } from '@/services/url.service';
import type { Telemetry } from '@/telemetry';
import { resolveNodeWebhookIds } from '@/workflow-helpers';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowService } from '@/workflows/workflow.service';

import { getMcpWorkflow, getSdkReferenceHint } from '../workflow-validation.utils';

const inputSchema = {
	workflowId: z.string().describe('The ID of the workflow to update'),
	code: z
		.string()
		.describe(
			`Full TypeScript/JavaScript workflow code using the n8n Workflow SDK. Must be validated first with ${CODE_BUILDER_VALIDATE_TOOL.toolName}.`,
		),
	name: z
		.string()
		.max(128)
		.optional()
		.describe('Optional workflow name. If not provided, uses the name from the code.'),
	description: z
		.string()
		.max(255)
		.optional()
		.describe(
			'Short workflow description summarizing what it does (1-2 sentences, max 255 chars).',
		),
} satisfies z.ZodRawShape;

const outputSchema = {
	workflowId: z.string().describe('The ID of the updated workflow'),
	name: z.string().describe('The name of the updated workflow'),
	nodeCount: z.number().describe('The number of nodes in the workflow'),
	url: z.string().describe('The URL to open the workflow in n8n'),
	autoAssignedCredentials: z
		.array(
			z.object({
				nodeName: z.string().describe('The name of the node that had credentials auto-assigned'),
				credentialName: z.string().describe('The name of the credential that was auto-assigned'),
				credentialType: z.string().describe('The credential type that was auto-assigned'),
			}),
		)
		.describe('List of credentials that were automatically assigned to nodes'),
	note: z
		.string()
		.optional()
		.describe(
			'Additional notes about the workflow update, such as any nodes that were skipped during credential auto-assignment.',
		),
	hint: z
		.string()
		.optional()
		.describe(
			'Actionable hint for recovering from the error. When present, follow the suggested action before retrying.',
		),
} satisfies z.ZodRawShape;

/**
 * MCP tool that updates a workflow in n8n from validated SDK code.
 * Parses the code, validates it, and updates the existing workflow.
 * Only workflows that are available in MCP can be updated.
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
		description: `Update an existing workflow in n8n from validated SDK code. Parses the code into a workflow and saves the changes. Always validate with ${CODE_BUILDER_VALIDATE_TOOL.toolName} first.`,
		inputSchema,
		outputSchema,
		annotations: {
			title: MCP_UPDATE_WORKFLOW_TOOL.displayTitle,
			readOnlyHint: false,
			destructiveHint: true,
			idempotentHint: true,
			openWorldHint: false,
		},
	},
	handler: async ({
		workflowId,
		code,
		name,
		description,
	}: {
		workflowId: string;
		code: string;
		name?: string;
		description?: string;
	}) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: MCP_UPDATE_WORKFLOW_TOOL.toolName,
			parameters: { workflowId, codeLength: code.length, hasName: !!name },
		};

		try {
			// Fetch the workflow to check if it's available in MCP
			const existingWorkflow = await getMcpWorkflow(
				workflowId,
				user,
				['workflow:update'],
				workflowFinderService,
			);

			await collaborationService.ensureWorkflowEditable(existingWorkflow.id);

			const { ParseValidateHandler, stripImportStatements } = await import(
				'@n8n/ai-workflow-builder'
			);

			const handler = new ParseValidateHandler({ generatePinData: false });
			const strippedCode = stripImportStatements(code);
			const result = await handler.parseAndValidate(strippedCode);

			const workflowJson = layoutWorkflowJSON(result.workflow);

			const workflowUpdateData = new WorkflowEntity();
			Object.assign(workflowUpdateData, {
				name: name ?? workflowJson.name,
				...(description !== undefined ? { description } : {}),
				nodes: workflowJson.nodes,
				connections: workflowJson.connections,
				pinData: workflowJson.pinData,
				meta: { ...workflowJson.meta, aiBuilderAssisted: true, builderVariant: 'mcp' },
			});

			resolveNodeWebhookIds(workflowUpdateData, nodeTypes);

			stripNullCredentialStubs(workflowUpdateData.nodes);

			// Preserve user-configured credentials from the existing workflow.
			// Match nodes by name + type so that auto-assign skips them.
			const existingCredsByNode = new Map(
				existingWorkflow.nodes.map((n) => [n.name, { type: n.type, credentials: n.credentials }]),
			);
			for (const node of workflowUpdateData.nodes) {
				if (!node.credentials) {
					const existing = existingCredsByNode.get(node.name);
					if (existing?.type === node.type && existing.credentials) {
						node.credentials = { ...existing.credentials };
					}
				}
			}

			// Resolve the project ID from the workflow's owner relationship
			const sharedWorkflow = await sharedWorkflowRepository.findOneOrFail({
				where: { workflowId, role: 'workflow:owner' },
				select: ['projectId'],
			});

			const { assignments: credentialAssignments, skippedHttpNodes } =
				await autoPopulateNodeCredentials(
					workflowUpdateData,
					user,
					nodeTypes,
					credentialsService,
					sharedWorkflow.projectId,
				);

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

			const hint = getSdkReferenceHint(error);
			const output = { error: errorMessage, ...(hint ? { hint } : {}) };

			return {
				content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
				structuredContent: output,
				isError: true,
			};
		}
	},
});
