import { type Project, type ProjectRepository, type User, WorkflowEntity } from '@n8n/db';
import z from 'zod';

import { buildInvalidAiToolSourceErrorResponse } from './connection-structure-check';
import { MCP_CREATE_WORKFLOW_FROM_CODE_TOOL, CODE_BUILDER_VALIDATE_TOOL } from './constants';
import { autoPopulateNodeCredentials, stripNullCredentialStubs } from './credentials-auto-assign';
import { validateDataTableReferencesForWorkflow } from './data-table-validation';
import { sanitizeSkillsUsed } from './skills-used';
import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { getSdkReferenceHint } from '../workflow-validation.utils';

import type { CredentialsService } from '@/credentials/credentials.service';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { DataTableUserOperations } from '@/modules/data-table/data-table-proxy.service';
import type { NodeTypes } from '@/node-types';
import type { UrlService } from '@/services/url.service';
import type { Telemetry } from '@/telemetry';
import { resolveNodeWebhookIds } from '@/workflow-helpers';
import type { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

const MAX_WORKFLOW_DESCRIPTION_LENGTH = 255;

function normalizeWorkflowDescription(description?: string) {
	if (!description) return { description: undefined, truncated: false };
	if (description.length <= MAX_WORKFLOW_DESCRIPTION_LENGTH) {
		return { description, truncated: false };
	}

	return {
		description: description.slice(0, MAX_WORKFLOW_DESCRIPTION_LENGTH),
		truncated: true,
	};
}

const inputSchema = {
	code: z
		.string()
		.describe(
			`Full TypeScript/JavaScript workflow code using the n8n Workflow SDK. Must be validated first with ${CODE_BUILDER_VALIDATE_TOOL.toolName}.`,
		),
	skillsUsed: z
		.array(z.string())
		.optional()
		.describe(
			'Names of n8n skills (lowercase kebab-case identifiers) used by the MCP client to produce this workflow create call. Server-side normalization will trim, lowercase, dedupe, and drop entries that are not valid skill identifiers.',
		),
	name: z
		.string()
		.max(128)
		.optional()
		.describe('Optional workflow name. If not provided, uses the name from the code.'),
	description: z
		.string()
		.optional()
		.describe('Workflow description. Longer text is shortened to 255 chars before saving.'),
	projectId: z
		.string()
		.optional()
		.describe(
			"Project ID to create the workflow in. If the user named a project (e.g. 'in my Marketing project'), you MUST call search_projects first to resolve the name to an ID and pass it here — do not guess. If search_projects returns multiple partial matches with no exact match, ask the user to clarify before creating the workflow. Only omit this field when the user did not mention a project at all; in that case it defaults to the user's personal project.",
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
				credentialType: z.string().describe('The credential type that was auto-assigned'),
			}),
		)
		.describe('List of credentials that were automatically assigned to nodes'),
	targetProject: z
		.object({
			id: z.string().describe('The ID of the project the workflow was created in'),
			name: z.string().describe('The display name of the project the workflow was created in'),
			type: z
				.enum(['personal', 'team'])
				.describe('Whether the workflow landed in a personal or team project'),
		})
		.describe('The project the workflow was actually created in.'),
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
	dataTableOps: DataTableUserOperations,
): ToolDefinition<typeof inputSchema> => ({
	name: MCP_CREATE_WORKFLOW_FROM_CODE_TOOL.toolName,
	config: {
		description: `Create a workflow in n8n from validated SDK code. This tool expects code that already follows the n8n Workflow SDK patterns and has passed ${CODE_BUILDER_VALIDATE_TOOL.toolName}. If code fails to parse, call get_sdk_reference, rewrite the code using the reference, validate again, then retry creation. If the user named a target project, resolve it via search_projects before calling this tool; when projectId is omitted, the workflow is created in the user's personal project. If you used n8n skills while preparing this workflow, pass their identifiers in skillsUsed. After creation, always tell the user which project the workflow landed in (see the targetProject field in the response).`,
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
		skillsUsed,
		name,
		description,
		projectId,
		folderId,
	}: {
		code: string;
		skillsUsed?: string[];
		name?: string;
		description?: string;
		projectId?: string;
		folderId?: string;
	}) => {
		const sanitizedSkillsUsed = sanitizeSkillsUsed(skillsUsed);
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: MCP_CREATE_WORKFLOW_FROM_CODE_TOOL.toolName,
			parameters: {
				codeLength: code.length,
				...(sanitizedSkillsUsed !== undefined ? { skillsUsed: sanitizedSkillsUsed } : {}),
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
		let landingProject: Project | null = null;

		try {
			const { ParseValidateHandler, stripImportStatements } = await import(
				'@n8n/ai-workflow-builder'
			);

			const handler = new ParseValidateHandler({ generatePinData: false });
			const strippedCode = stripImportStatements(code);
			const result = await handler.parseAndValidate(strippedCode);

			const workflowJson = result.workflow;
			const { description: workflowDescription, truncated: descriptionTruncated } =
				normalizeWorkflowDescription(description);

			const invalidToolSourceResponse = buildInvalidAiToolSourceErrorResponse(
				workflowJson,
				nodeTypes,
				(errorMessage) => ({ error: errorMessage }),
				telemetryPayload,
				telemetry,
			);
			if (invalidToolSourceResponse) return invalidToolSourceResponse;

			newWorkflow = new WorkflowEntity();
			Object.assign(newWorkflow, {
				name: name ?? workflowJson.name ?? 'Untitled Workflow',
				...(workflowDescription ? { description: workflowDescription } : {}),
				nodes: workflowJson.nodes,
				connections: workflowJson.connections,
				settings: { ...workflowJson.settings, executionOrder: 'v1', availableInMCP: true },
				pinData: workflowJson.pinData,
				meta: { ...workflowJson.meta, aiBuilderAssisted: true, builderVariant: 'mcp' },
			});

			resolveNodeWebhookIds(newWorkflow, nodeTypes);

			stripNullCredentialStubs(newWorkflow.nodes);

			landingProject = projectId
				? await projectRepository.findOneBy({ id: projectId })
				: await projectRepository.getPersonalProjectForUserOrFail(user.id);
			if (!landingProject) {
				throw new NotFoundError(
					`Project with id "${projectId}" was not found. Use search_projects to look up a valid project id.`,
				);
			}
			const effectiveProjectId = landingProject.id;

			const dataTableCheck = await validateDataTableReferencesForWorkflow(
				newWorkflow.nodes,
				effectiveProjectId,
				dataTableOps,
			);
			if (!dataTableCheck.ok) {
				throw new Error(dataTableCheck.error);
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
				projectId: effectiveProjectId,
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

			const notes = [
				descriptionTruncated
					? `Workflow description was shortened to ${MAX_WORKFLOW_DESCRIPTION_LENGTH} characters.`
					: undefined,
				skippedHttpNodes.length
					? `HTTP Request nodes (${skippedHttpNodes.join(', ')}) were skipped during credential auto-assignment. Their credentials must be configured manually.`
					: undefined,
			].filter((note): note is string => note !== undefined);

			const output = {
				workflowId: savedWorkflow.id,
				name: savedWorkflow.name,
				nodeCount: savedWorkflow.nodes.length,
				url: workflowUrl,
				autoAssignedCredentials: credentialAssignments,
				targetProject: {
					id: landingProject.id,
					name: landingProject.name,
					type: landingProject.type,
				},
				note: notes.length ? notes.join(' ') : undefined,
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

				if (persisted && landingProject) {
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
						targetProject: {
							id: landingProject.id,
							name: landingProject.name,
							type: landingProject.type,
						},
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

			const hint = getSdkReferenceHint(error, {
				afterReference: `Rewrite the code, call ${CODE_BUILDER_VALIDATE_TOOL.toolName} until it returns valid=true, then call ${MCP_CREATE_WORKFLOW_FROM_CODE_TOOL.toolName} again.`,
			});
			const output = { error: errorMessage, ...(hint ? { hint } : {}) };

			return {
				content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
				structuredContent: output,
				isError: true,
			};
		}
	},
});
