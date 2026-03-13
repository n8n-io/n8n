import { type User, type ProjectRepository, WorkflowEntity } from '@n8n/db';
import { resolveNodeWebhookId } from 'n8n-workflow';
import z from 'zod';

import { MCP_CREATE_WORKFLOW_FROM_CODE_TOOL, CODE_BUILDER_VALIDATE_TOOL } from './constants';
import { autoPopulateNodeCredentials } from './credentials-auto-assign';
import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { NodeTypes } from '@/node-types';
import type { UrlService } from '@/services/url.service';
import type { Telemetry } from '@/telemetry';
import type { WorkflowCreationService } from '@/workflows/workflow-creation.service';

const inputSchema = {
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
	projectId: z
		.string()
		.optional()
		.describe(
			"Optional project ID to create the workflow in. Defaults to the user's personal project.",
		),
} satisfies z.ZodRawShape;

const outputSchema = {
	workflowId: z.string().describe('The ID of the created workflow'),
	name: z.string().describe('The name of the created workflow'),
	nodeCount: z.number().describe('The number of nodes in the workflow'),
	url: z.string().describe('The URL to open the workflow in n8n'),
	autoAssignedCredentials: z
		.array(
			z.object({
				nodeName: z.string().describe('The name of the node that had credentials auto-assigned'),
				credentialName: z.string().describe('The name of the credential that was auto-assigned'),
			}),
		)
		.describe('List of credentials that were automatically assigned to nodes'),
	note: z
		.string()
		.optional()
		.describe(
			'Additional notes about the workflow creation, such as any nodes that were skipped during credential auto-assignment.',
		),
} satisfies z.ZodRawShape;

/**
 * MCP tool that creates a workflow in n8n from validated SDK code.
 * Parses the code, validates it, and saves the resulting workflow.
 */
export const createCreateWorkflowFromCodeTool = (
	user: User,
	workflowCreationService: WorkflowCreationService,
	urlService: UrlService,
	telemetry: Telemetry,
	nodeTypes: NodeTypes,
	credentialsService: CredentialsService,
	projectRepository: ProjectRepository,
): ToolDefinition<typeof inputSchema> => ({
	name: MCP_CREATE_WORKFLOW_FROM_CODE_TOOL.toolName,
	config: {
		description: `Create a workflow in n8n from validated SDK code. Parses the code into a workflow and saves it. Always validate with ${CODE_BUILDER_VALIDATE_TOOL.toolName} first.`,
		inputSchema,
		outputSchema,
		annotations: {
			title: MCP_CREATE_WORKFLOW_FROM_CODE_TOOL.displayTitle,
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		},
	},
	handler: async ({
		code,
		name,
		description,
		projectId,
	}: {
		code: string;
		name?: string;
		description?: string;
		projectId?: string;
	}) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: MCP_CREATE_WORKFLOW_FROM_CODE_TOOL.toolName,
			parameters: { codeLength: code.length, hasName: !!name, hasProjectId: !!projectId },
		};

		try {
			const { ParseValidateHandler, stripImportStatements } = await import(
				'@n8n/ai-workflow-builder'
			);

			const handler = new ParseValidateHandler({ generatePinData: false });
			const strippedCode = stripImportStatements(code);
			const result = await handler.parseAndValidate(strippedCode);
			const workflowJson = result.workflow;

			const newWorkflow = new WorkflowEntity();
			Object.assign(newWorkflow, {
				name: name ?? workflowJson.name ?? 'Untitled Workflow',
				...(description ? { description } : {}),
				nodes: workflowJson.nodes,
				connections: workflowJson.connections,
				settings: { ...workflowJson.settings, executionOrder: 'v1', availableInMCP: true },
				pinData: workflowJson.pinData,
				meta: { ...workflowJson.meta, aiBuilderAssisted: true },
			});

			for (const node of newWorkflow.nodes) {
				try {
					const desc = nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
					resolveNodeWebhookId(node, desc.description);
				} catch {
					// Node type not found, skip
				}
			}

			// Resolve the effective project ID — default to the user's personal project
			let effectiveProjectId = projectId;
			if (!effectiveProjectId) {
				const personalProject = await projectRepository.getPersonalProjectForUserOrFail(user.id);
				effectiveProjectId = personalProject.id;
			}

			const { assignments: credentialAssignments, skippedHttpNodes } =
				await autoPopulateNodeCredentials(
					newWorkflow,
					user,
					nodeTypes,
					credentialsService,
					effectiveProjectId,
				);

			const savedWorkflow = await workflowCreationService.createWorkflow(user, newWorkflow, {
				projectId,
			});

			const baseUrl = urlService.getInstanceBaseUrl();
			const workflowUrl = `${baseUrl}/workflow/${savedWorkflow.id}`;

			telemetryPayload.results = {
				success: true,
				data: {
					workflowId: savedWorkflow.id,
					nodeCount: savedWorkflow.nodes.length,
				},
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			const output = {
				workflowId: savedWorkflow.id,
				name: savedWorkflow.name,
				nodeCount: savedWorkflow.nodes.length,
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

			const output = { error: errorMessage };

			return {
				content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
				structuredContent: output,
				isError: true,
			};
		}
	},
});
