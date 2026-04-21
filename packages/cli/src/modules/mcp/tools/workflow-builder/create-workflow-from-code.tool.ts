import { type User, type ProjectRepository, WorkflowEntity } from '@n8n/db';
import { layoutWorkflowJSON } from '@n8n/workflow-sdk';
import z from 'zod';

import { MCP_CREATE_WORKFLOW_FROM_CODE_TOOL, CODE_BUILDER_VALIDATE_TOOL } from './constants';
import { autoPopulateNodeCredentials, stripNullCredentialStubs } from './credentials-auto-assign';
import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { getSdkReferenceHint } from '../workflow-validation.utils';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { NodeTypes } from '@/node-types';
import type { UrlService } from '@/services/url.service';
import type { Telemetry } from '@/telemetry';
import { resolveNodeWebhookIds } from '@/workflow-helpers';
import type { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

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
			"Optional project ID to create the workflow in. Use search_projects to find a project by name. Defaults to the user's personal project.",
		),
	folderId: z
		.string()
		.optional()
		.describe(
			'Optional folder ID to create the workflow in. Requires projectId to be set. Use search_folders to find a folder by name within a project.',
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
	hint: z
		.string()
		.optional()
		.describe(
			'Actionable hint for recovering from the error. When present, follow the suggested action before retrying.',
		),
} satisfies z.ZodRawShape;

/**
 * MCP tool that creates a workflow in n8n from validated SDK code.
 * Parses the code, validates it, and saves the resulting workflow.
 */
export const createCreateWorkflowFromCodeTool = (
	user: User,
	workflowCreationService: WorkflowCreationService,
	workflowFinderService: WorkflowFinderService,
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
		folderId,
	}: {
		code: string;
		name?: string;
		description?: string;
		projectId?: string;
		folderId?: string;
	}) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: MCP_CREATE_WORKFLOW_FROM_CODE_TOOL.toolName,
			parameters: {
				codeLength: code.length,
				hasName: !!name,
				hasProjectId: !!projectId,
				hasFolderId: !!folderId,
			},
		};

		if (folderId && !projectId) {
			const errorMessage = 'projectId is required when folderId is provided';
			telemetryPayload.results = { success: false, error: errorMessage };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			return {
				content: [{ type: 'text', text: JSON.stringify({ error: errorMessage }, null, 2) }],
				structuredContent: { error: errorMessage },
				isError: true,
			};
		}

		let newWorkflow: WorkflowEntity | undefined;

		try {
			const { ParseValidateHandler, stripImportStatements } = await import(
				'@n8n/ai-workflow-builder'
			);

			const handler = new ParseValidateHandler({ generatePinData: false });
			const strippedCode = stripImportStatements(code);
			const result = await handler.parseAndValidate(strippedCode);

			const workflowJson = layoutWorkflowJSON(result.workflow);

			newWorkflow = new WorkflowEntity();
			Object.assign(newWorkflow, {
				name: name ?? workflowJson.name ?? 'Untitled Workflow',
				...(description ? { description } : {}),
				nodes: workflowJson.nodes,
				connections: workflowJson.connections,
				settings: { ...workflowJson.settings, executionOrder: 'v1', availableInMCP: true },
				pinData: workflowJson.pinData,
				meta: { ...workflowJson.meta, aiBuilderAssisted: true, builderVariant: 'mcp' },
			});

			resolveNodeWebhookIds(newWorkflow, nodeTypes);

			stripNullCredentialStubs(newWorkflow.nodes);

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
				parentFolderId: folderId,
				source: 'n8n-mcp',
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

			// Check whether the workflow was actually persisted despite the error.
			// TypeORM sets the entity id during save(), even inside a transaction that
			// may later roll back, so newWorkflow.id alone is not a reliable signal.
			// A DB lookup confirms the row truly exists before we report success.
			if (newWorkflow?.id) {
				let persisted: Awaited<ReturnType<WorkflowFinderService['findWorkflowForUser']>> | null =
					null;
				try {
					persisted = await workflowFinderService.findWorkflowForUser(newWorkflow.id, user, [
						'workflow:read',
					]);
				} catch {
					// Verification lookup failed — fall through and report the original error.
				}

				if (persisted) {
					const baseUrl = urlService.getInstanceBaseUrl();
					const workflowUrl = `${baseUrl}/workflow/${persisted.id}`;

					telemetryPayload.results = {
						success: true,
						data: {
							workflowId: persisted.id,
							nodeCount: persisted.nodes.length,
							postSaveError: errorMessage,
						},
					};
					telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

					const output = {
						workflowId: persisted.id,
						name: persisted.name,
						nodeCount: persisted.nodes.length,
						url: workflowUrl,
						autoAssignedCredentials: [],
						note: `Workflow was created successfully, but a post-save operation failed: ${errorMessage}`,
					};

					return {
						content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
						structuredContent: output,
					};
				}
			}

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
