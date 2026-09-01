import type { Logger } from '@n8n/backend-common';
import {
	type Folder,
	type Project,
	type ProjectRepository,
	type User,
	WorkflowEntity,
} from '@n8n/db';
import z from 'zod';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { DataTableUserOperations } from '@/modules/data-table/data-table-proxy.service';
import type { NodeTypes } from '@/node-types';
import type { AiGatewayService } from '@/services/ai-gateway.service';
import type { UrlService } from '@/services/url.service';
import type { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { buildInvalidAiToolSourceErrorResponse } from './connection-structure-check';
import { MCP_CREATE_WORKFLOW_FROM_CODE_TOOL, CODE_BUILDER_VALIDATE_TOOL } from './constants';
import { validateWorkflowCredentialReferences } from './credential-validation';
import {
	autoPopulateNodeCredentials,
	stripNullCredentialStubs,
	trackAutoassignOutcomes,
} from './credentials-auto-assign';
import { validateDataTableReferencesForWorkflow } from './data-table-validation';
import { getErrorCode } from './error-code.utils';
import { sanitizeSkillsUsed, SKILLS_USED_PARAM_DESCRIPTION } from './skills-used';
import {
	buildCreateVersionMetadata,
	resolveVersionMetadata,
	versionDescriptionInputSchema,
	versionNameInputSchema,
} from './version-metadata';
import type { McpPostSaveMetricsService } from '../../mcp-post-save-metrics.service';
import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';
import { getSdkReferenceHint } from '../workflow-validation.utils';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import type { Telemetry } from '@/telemetry';
import {
	dropInvalidWorkflowGroups,
	makeGetNodeTypeForGrouping,
	resolveNodeWebhookIds,
} from '@/workflow-helpers';

const MAX_WORKFLOW_DESCRIPTION_LENGTH = 255;

export type CreateWorkflowFromCodeToolOptions = {
	/**
	 * `102_mcp_canvas_groups` rollout flag: when true, node groups authored in the
	 * SDK code (`.group(...)`) are persisted on the created workflow. Off by
	 * default — groups are then dropped at the entity assembly, exactly like
	 * before groups were supported. With the flag on, an invalid group does not
	 * fail the creation: it is dropped and reported in `skippedGroups` instead,
	 * while the rest of the workflow is still created. This tool pre-validates
	 * with the same rules `WorkflowCreationService.createWorkflow` enforces, so
	 * that shared service's own (fatal) group check never actually triggers here.
	 */
	canvasGroupsEnabled?: boolean;
};

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
	skillsUsed: z.array(z.string()).optional().describe(SKILLS_USED_PARAM_DESCRIPTION),
	name: z
		.string()
		.max(128)
		.optional()
		.describe('Optional workflow name. If not provided, uses the name from the code.'),
	description: z
		.string()
		.optional()
		.describe('Workflow description. Longer text is shortened to 255 chars before saving.'),
	versionName: versionNameInputSchema.describe(
		'Short summary of this initial version, shown in the workflow\'s version history (e.g. "Initial Slack notification workflow"). Always provide it.',
	),
	versionDescription: versionDescriptionInputSchema.describe(
		'Longer description of what this version does, shown in the version history alongside the version name.',
	),
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
			'Optional folder ID to create the workflow in. Requires projectId to be set. Use search_folders to find a folder by name within a project; when multiple folders match the name, ask the user which one they meant before creating.',
		),
} satisfies z.ZodRawShape;

// The MCP SDK publishes this schema with `additionalProperties: false` and
// validates `structuredContent` against it on every response. Success returns
// the full payload below; the error path returns only `{ error }` (optionally
// with `hint`). To keep both shapes valid under strict clients, the success
// fields are optional and `error` is a declared, optional property — otherwise
// a thrown handler error surfaces as an opaque `-32602` schema mismatch
// instead of the real message.
const outputSchema = {
	workflowId: z.string().optional().describe('The ID of the created workflow'),
	name: z.string().optional().describe('The name of the created workflow'),
	nodeCount: z.number().optional().describe('The number of nodes in the workflow'),
	url: z.string().optional().describe('The URL to open the workflow in n8n'),
	autoAssignedCredentials: z
		.array(
			z.object({
				nodeName: z.string().describe('The name of the node that had credentials auto-assigned'),
				credentialName: z.string().describe('The name of the credential that was auto-assigned'),
				credentialType: z.string().describe('The credential type that was auto-assigned'),
				source: z
					.enum(['user', 'aiGateway'])
					.optional()
					.describe(
						'Where the credential came from: "user" for an existing user credential, "aiGateway" for a credential managed via Gateway credits.',
					),
			}),
		)
		.optional()
		.describe('List of credentials that were automatically assigned to nodes'),
	targetProject: z
		.object({
			id: z.string().describe('The ID of the project the workflow was created in'),
			name: z.string().describe('The display name of the project the workflow was created in'),
			type: z
				.enum(['personal', 'team'])
				.describe('Whether the workflow landed in a personal or team project'),
		})
		.optional()
		.describe('The project the workflow was actually created in.'),
	targetFolder: z
		.object({
			id: z.string().describe('The ID of the folder the workflow was created in'),
			name: z.string().describe('The name of the folder the workflow was created in'),
		})
		.optional()
		.describe(
			'The folder the workflow was created in. Absent when the workflow was created at the project root.',
		),
	note: z
		.string()
		.optional()
		.describe(
			'Additional notes about the workflow creation, such as any nodes that were skipped during credential auto-assignment.',
		),
	skippedGroups: z
		.array(
			z.object({
				groupName: z.string(),
				reason: z.string(),
			}),
		)
		.optional()
		.describe('Node groups that were invalid and skipped instead of failing the whole creation.'),
	hint: z
		.string()
		.optional()
		.describe(
			'Actionable hint for recovering from the error. When present, follow the suggested action before retrying.',
		),
	warnings: z
		.array(
			z.object({
				code: z.string().describe('The warning code identifying the type of warning'),
				message: z.string().describe('The warning message'),
				nodeName: z.string().optional().describe('The node that triggered the warning'),
				parameterPath: z
					.string()
					.optional()
					.describe('The parameter path that triggered the warning'),
			}),
		)
		.optional()
		.describe(
			'Validation warnings emitted while parsing the submitted code. Surface these to the user so they can correct the workflow.',
		),
	error: z
		.string()
		.optional()
		.describe('Error message explaining why the creation failed. Present only on failure.'),
	errorCode: z
		.string()
		.optional()
		.describe('Machine-readable error code. Present only on failure.'),
} satisfies z.ZodRawShape;

type RecoverPersistedCreateArgs = {
	newWorkflow: WorkflowEntity | undefined;
	landingProject: Project | null;
	user: User;
	workflowFinderService: WorkflowFinderService;
	urlService: UrlService;
	telemetry: Telemetry;
	telemetryPayload: UserCalledMCPToolEventPayload;
	error: unknown;
	logger: Logger;
	postSaveMetrics: McpPostSaveMetricsService;
};

async function recoverPersistedCreate({
	newWorkflow,
	landingProject,
	user,
	workflowFinderService,
	urlService,
	telemetry,
	telemetryPayload,
	error,
	logger,
	postSaveMetrics,
}: RecoverPersistedCreateArgs) {
	const errorMessage = error instanceof Error ? error.message : String(error);

	// TypeORM sets the entity id during save(), even inside a transaction that
	// may later roll back. A DB lookup confirms that the row exists.
	if (!newWorkflow?.id) return undefined;

	let persisted: Awaited<ReturnType<WorkflowFinderService['findWorkflowForUser']>> | null = null;
	try {
		persisted = await workflowFinderService.findWorkflowForUser(
			newWorkflow.id,
			user,
			['workflow:read'],
			// landingFolder is only assigned after createWorkflow returns, so a
			// post-save failure inside it leaves the variable unset. Load the
			// relation here so targetFolder still reflects where the row landed.
			{ includeParentFolder: true },
		);
	} catch (lookupError) {
		logger.warn('Post-create verification lookup failed', {
			workflowId: newWorkflow.id,
			error: lookupError,
		});
		// Verification lookup failed. Fall through and report the original error.
	}

	if (!persisted || !landingProject) return undefined;

	const baseUrl = urlService.getInstanceBaseUrl();
	const workflowUrl = `${baseUrl}/workflow/${persisted.id}`;

	postSaveMetrics.incrementPostSaveFailure('create', error);

	try {
		telemetryPayload.results = {
			success: true,
			data: {
				workflowId: persisted.id,
				nodeCount: persisted.nodes.length,
				postSaveError: errorMessage,
			},
		};
		telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
	} catch (telemetryError) {
		logger.error('Post-save telemetry failed for create_workflow_from_code (recovery path)', {
			workflowId: persisted.id,
			error: telemetryError,
		});
		postSaveMetrics.incrementPostSaveFailure('create', telemetryError);
	}

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
		targetFolder: persisted.parentFolder
			? { id: persisted.parentFolder.id, name: persisted.parentFolder.name }
			: undefined,
		note: `Workflow was created successfully, but a post-save operation failed: ${errorMessage}`,
	};

	return {
		content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
		structuredContent: output,
	};
}

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
	aiGatewayService: AiGatewayService,
	options: CreateWorkflowFromCodeToolOptions = {},
	logger: Logger,
	postSaveMetrics: McpPostSaveMetricsService,
): ToolDefinition<typeof inputSchema> => ({
	name: MCP_CREATE_WORKFLOW_FROM_CODE_TOOL.toolName,
	config: {
		description: `Create a workflow in n8n from validated SDK code. This tool expects code that already follows the n8n Workflow SDK patterns and has passed ${CODE_BUILDER_VALIDATE_TOOL.toolName}. If code fails to parse, call get_workflow_sdk_reference, rewrite the code using the reference, validate again, then retry creation. If the user named a target project, resolve it via search_projects before calling this tool; when projectId is omitted, the workflow is created in the user's personal project. If the user named a target folder, resolve it via search_folders. If you used n8n skills while preparing this workflow, pass their identifiers in skillsUsed. After creation, always tell the user which project — and folder, if any — the workflow landed in (see the targetProject and targetFolder fields in the response).`,
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
		versionName,
		versionDescription,
		projectId,
		folderId,
	}: {
		code: string;
		skillsUsed?: string[];
		name?: string;
		description?: string;
		versionName?: string;
		versionDescription?: string;
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
				hasVersionName: !!versionName,
				hasVersionDescription: !!versionDescription,
			},
		};

		if (folderId && !projectId) {
			const errorMessage = 'projectId is required when folderId is provided';
			telemetryPayload.results = { success: false, error: errorMessage };
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			const output = { error: errorMessage, errorCode: 'MISSING_PROJECT_ID' };
			return {
				content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
				structuredContent: output,
				isError: true,
			};
		}

		let newWorkflow: WorkflowEntity | undefined;
		let landingProject: Project | null = null;
		let landingFolder: Folder | null = null;

		try {
			const { ParseValidateHandler, stripImportStatements } = await import(
				'@n8n/ai-workflow-builder'
			);

			const handler = new ParseValidateHandler({
				generatePinData: false,
				nodeTypesProvider: nodeTypes,
			});
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
				// Flag off: groups keep being dropped here, exactly like before.
				...(options.canvasGroupsEnabled ? { nodeGroups: workflowJson.nodeGroups ?? [] } : {}),
				settings: { ...workflowJson.settings, executionOrder: 'v1', availableInMCP: true },
				pinData: workflowJson.pinData,
				meta: { ...workflowJson.meta, aiBuilderAssisted: true, builderVariant: 'mcp' },
			});

			resolveNodeWebhookIds(newWorkflow, nodeTypes);

			stripNullCredentialStubs(newWorkflow.nodes);

			// Structural group rules (no triggers, single connected subgraph, no
			// non-main connection crossing the group boundary) aren't checked by the
			// parser above. Validate them here, before the shared persistence layer's
			// own (fatal) check, so an invalid group is dropped and reported instead
			// of aborting the whole creation.
			const skippedGroups = options.canvasGroupsEnabled
				? dropInvalidWorkflowGroups(newWorkflow, makeGetNodeTypeForGrouping(nodeTypes)).map(
						(violation) => ({ groupName: violation.groupName, reason: violation.message }),
					)
				: [];

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

			const {
				assignments: credentialAssignments,
				skippedHttpNodes,
				outcomes: autoAssignOutcomes,
			} = await autoPopulateNodeCredentials(
				newWorkflow,
				user,
				nodeTypes,
				credentialsService,
				effectiveProjectId,
				aiGatewayService,
			);

			// Explicit credential ids in the generated code bypass auto-assignment,
			// so verify they're reachable from the target project. This matches the
			// runtime permission gate and prevents persisting a cross-project id that
			// would only fail at execution time.
			const credentialCheck = await validateWorkflowCredentialReferences(
				newWorkflow.nodes,
				user,
				credentialsService,
				nodeTypes,
				effectiveProjectId,
			);
			if (!credentialCheck.ok) {
				throw new Error(credentialCheck.error);
			}

			const versionMetadata = resolveVersionMetadata(
				{ versionName, versionDescription },
				buildCreateVersionMetadata(newWorkflow.nodes),
			);

			const savedWorkflow = await workflowCreationService.createWorkflow(user, newWorkflow, {
				projectId: effectiveProjectId,
				parentFolderId: folderId,
				source: 'n8n-mcp',
				versionName: versionMetadata.name,
				versionDescription: versionMetadata.description,
			});
			// The saved workflow carries the project-validated parent folder, echoed
			// back as targetFolder.
			landingFolder = savedWorkflow.parentFolder ?? null;

			const baseUrl = urlService.getInstanceBaseUrl();
			const workflowUrl = `${baseUrl}/workflow/${savedWorkflow.id}`;

			const notes = [
				descriptionTruncated
					? `Workflow description was shortened to ${MAX_WORKFLOW_DESCRIPTION_LENGTH} characters.`
					: undefined,
				skippedHttpNodes.length
					? `HTTP Request nodes (${skippedHttpNodes.join(', ')}) were skipped during credential auto-assignment. Their credentials must be configured manually.`
					: undefined,
			].filter((note): note is string => note !== undefined);

			const baseOutput = {
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
				targetFolder: landingFolder
					? { id: landingFolder.id, name: landingFolder.name }
					: undefined,
				note: notes.length ? notes.join(' ') : undefined,
				skippedGroups: skippedGroups.length > 0 ? skippedGroups : undefined,
			};
			const output =
				result.warnings.length > 0 ? { ...baseOutput, warnings: result.warnings } : baseOutput;

			// The response is fully built above. Side effects below (telemetry,
			// credential auto-assign tracking) must not turn a successful persist
			// into a client-visible error — they are observability-only.
			try {
				const nodeTypesByName = new Map(savedWorkflow.nodes.map((n) => [n.name, n.type]));
				trackAutoassignOutcomes(
					telemetry,
					user.id,
					'create_workflow_from_code',
					autoAssignOutcomes,
					nodeTypesByName,
					savedWorkflow.id,
				);

				telemetryPayload.results = {
					success: true,
					data: {
						workflowId: savedWorkflow.id,
						nodeCount: savedWorkflow.nodes.length,
						// Rollout monitoring for `102_mcp_canvas_groups`; absent when the
						// flag is off so the payload stays identical across cohorts.
						...(options.canvasGroupsEnabled
							? { groupCount: workflowJson.nodeGroups?.length ?? 0 }
							: {}),
					},
				};
				telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			} catch (sideEffectError) {
				logger.error('Post-save side effect failed for create_workflow_from_code', {
					workflowId: savedWorkflow.id,
					error: sideEffectError,
				});
				postSaveMetrics.incrementPostSaveFailure('create', sideEffectError);
			}

			return {
				content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
				structuredContent: output,
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			const errorCode = getErrorCode(error);

			const recoveredCreate = await recoverPersistedCreate({
				newWorkflow,
				landingProject,
				user,
				workflowFinderService,
				urlService,
				telemetry,
				telemetryPayload,
				error,
				logger,
				postSaveMetrics,
			});
			if (recoveredCreate) return recoveredCreate;

			try {
				telemetryPayload.results = {
					success: false,
					error: errorMessage,
				};
				telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			} catch (telemetryError) {
				logger.error('Telemetry failed for create_workflow_from_code (error path)', {
					error: telemetryError,
				});
			}

			const hint = getSdkReferenceHint(error, {
				afterReference: `Rewrite the code, call ${CODE_BUILDER_VALIDATE_TOOL.toolName} until it returns valid=true, then call ${MCP_CREATE_WORKFLOW_FROM_CODE_TOOL.toolName} again.`,
			});
			const output = {
				error: errorMessage,
				errorCode,
				...(hint ? { hint } : {}),
			};

			return {
				content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
				structuredContent: output,
				isError: true,
			};
		}
	},
});
