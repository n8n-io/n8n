import type { ValidationWarning } from '@n8n/ai-workflow-builder';
import type { UrlService, TelemetryProxy } from '@n8n/backend-services';
import type { Logger } from '@n8n/backend-common';
import type { DataTableUserOperations } from '@n8n/backend-module-data-table';
import { type OperationContext, type ProjectRepository, type User, WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	compileWorkflowSource,
	prepareWorkflowForSave,
	readWorkspaceFile,
	writeWorkspaceFile,
} from '@n8n/instance-ai';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { INodeTypes } from 'n8n-workflow';
import { z } from 'zod';

import type { CollaborationService } from '@/collaboration/collaboration.service';
import type { CredentialsService } from '@/credentials/credentials.service';
import type { AiGatewayService } from '@/services/ai-gateway.service';
import {
	dropInvalidWorkflowGroups,
	makeGetNodeTypeForGrouping,
	resolveNodeWebhookIds,
} from '@/workflow-helpers';
import type { WorkflowCreationService } from '@/workflows/workflow-creation.service';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowService } from '@/workflows/workflow.service';

import { workspaceKeySchema } from './workspace-tools';
import { McpConfirmationService } from '../../mcp-confirmation.service';
import type { McpPostSaveMetricsService } from '../../mcp-post-save-metrics.service';
import type { McpWorkspaceService } from '../../mcp-workspace.service';
import type { ToolDefinition, ToolHandlerResult } from '../../mcp.types';
import {
	createCreateWorkflowFromCodeTool,
	type CreateWorkflowFromCodeToolOptions,
} from '../workflow-builder/create-workflow-from-code.tool';
import { stripNullCredentialStubs } from '../workflow-builder/credentials-auto-assign';
import { getMcpWorkflow } from '../workflow-validation.utils';

export const BUILD_WORKFLOW_TOOL_NAME = 'build_workflow';

const inputSchema = {
	workspaceKey: workspaceKeySchema,
	filePath: z
		.string()
		.optional()
		.describe(
			'The workflow source to build, relative to the workspace root, e.g. src/workflows/main.workflow.ts. Required unless `files` is given.',
		),
	files: z
		.record(z.string())
		.optional()
		.describe(
			'Sources to write into the workspace before the build, keyed by path. Use this to build without separate write calls; `entry` names the file to build (default: the first).',
		),
	entry: z.string().optional().describe('With `files`: the path of the file to build.'),
	workflowId: z
		.string()
		.optional()
		.describe(
			'Replace this existing workflow with the built one. Omit to create a new workflow. Node ids, positions and setup values of unchanged nodes are kept.',
		),
	name: z.string().max(128).optional().describe('Name for a new workflow.'),
	description: z.string().optional().describe('Description for a new workflow (max 255 chars).'),
	projectId: z
		.string()
		.optional()
		.describe('Project for a new workflow. Default: your personal project.'),
	folderId: z.string().optional().describe('Folder for a new workflow (needs projectId).'),
	versionName: z.string().max(128).optional(),
	versionDescription: z.string().max(255).optional(),
} satisfies z.ZodRawShape;

export interface BuildWorkflowToolDeps {
	workspaceService: McpWorkspaceService;
	workflowCreationService: WorkflowCreationService;
	workflowFinderService: WorkflowFinderService;
	workflowService: WorkflowService;
	collaborationService: CollaborationService;
	urlService: UrlService;
	telemetry: TelemetryProxy;
	nodeTypes: INodeTypes;
	credentialsService: CredentialsService;
	projectRepository: ProjectRepository;
	dataTableOps: DataTableUserOperations;
	aiGatewayService: AiGatewayService;
	createOptions: CreateWorkflowFromCodeToolOptions;
	logger: Logger;
	postSaveMetrics: McpPostSaveMetricsService;
}

function errorResult(output: Record<string, unknown>) {
	return {
		content: [{ type: 'text' as const, text: JSON.stringify(output, null, 2) }],
		structuredContent: output,
		isError: true,
	};
}

/**
 * The Assistant's native build path, over MCP: compile a workflow source in the
 * caller's sandbox with the real TypeScript toolchain (tsx, the pinned SDK,
 * multi-file sources, declared pin-data fixtures, lint), validate the result on
 * the host, then save it through the same path as `create_workflow_from_code`.
 * With `workflowId`, the built workflow replaces the saved one, after the user
 * confirms the edit.
 */
export function createBuildWorkflowTool(
	user: User,
	deps: BuildWorkflowToolDeps,
	ctx: OperationContext = {},
): ToolDefinition<typeof inputSchema, ToolHandlerResult> {
	return {
		name: BUILD_WORKFLOW_TOOL_NAME,
		config: {
			description:
				'Build a workflow from a TypeScript source in your workspace: compiles it in the sandbox with the real n8n workflow SDK (imports, several files and declared pin data work), validates it, and saves it. Omit workflowId to create a new workflow; pass it to replace an existing one with the built source (get its source first with get_workflow_as_code). Pass `files` to write sources and build in one call.',
			inputSchema,
			annotations: {
				title: 'Build Workflow',
				readOnlyHint: false,
				destructiveHint: true,
				idempotentHint: false,
				openWorldHint: false,
			},
		},
		handler: async (args, extra) => {
			const { workspace, context, workspaceKey } = await deps.workspaceService.open(
				user,
				args.workspaceKey,
			);

			let filePath = args.filePath;
			if (args.files) {
				for (const [path, content] of Object.entries(args.files)) {
					await writeWorkspaceFile(workspace, path, content);
				}
				filePath ??= args.entry ?? Object.keys(args.files)[0];
			}
			if (!filePath) {
				return errorResult({ error: 'Pass filePath, or files with an entry to build.' });
			}

			const source = await readWorkspaceFile(workspace, filePath);
			if (source === null) {
				return errorResult({ error: `No file at ${filePath} in workspace "${workspaceKey}".` });
			}

			const compiled = await compileWorkflowSource(context, filePath, source);
			if (!compiled.success) {
				return errorResult({
					error: compiled.summary,
					errors: compiled.errors,
					reason: compiled.reason,
					filePath,
					hint: compiled.editable
						? 'Fix the source with workspace_str_replace_file and build again.'
						: undefined,
				});
			}

			const warnings: ValidationWarning[] = compiled.warnings;

			if (args.workflowId) {
				return await replaceWorkflow(
					user,
					deps,
					args.workflowId,
					compiled.workflow,
					warnings,
					context,
					{ versionName: args.versionName, versionDescription: args.versionDescription },
					extra,
					ctx,
				);
			}

			const createTool = createCreateWorkflowFromCodeTool(
				user,
				deps.workflowCreationService,
				deps.workflowFinderService,
				deps.urlService,
				deps.telemetry,
				deps.nodeTypes,
				deps.credentialsService,
				deps.projectRepository,
				deps.dataTableOps,
				deps.aiGatewayService,
				{ ...deps.createOptions, compiledWorkflow: { workflow: compiled.workflow, warnings } },
				deps.logger,
				deps.postSaveMetrics,
				ctx,
			);
			return await createTool.handler({
				code: source,
				name: args.name,
				description: args.description,
				projectId: args.projectId,
				folderId: args.folderId,
				versionName: args.versionName,
				versionDescription: args.versionDescription,
			});
		},
	};
}

/** Replaces a saved workflow with a built one: the Assistant's whole-workflow edit, confirmed. */
async function replaceWorkflow(
	user: User,
	deps: BuildWorkflowToolDeps,
	workflowId: string,
	json: WorkflowJSON,
	warnings: ValidationWarning[],
	context: Parameters<typeof prepareWorkflowForSave>[2],
	version: { versionName?: string; versionDescription?: string },
	extra: unknown,
	ctx: OperationContext,
): Promise<ToolHandlerResult> {
	const existing = await getMcpWorkflow(
		workflowId,
		user,
		['workflow:update'],
		deps.workflowFinderService,
	);
	await deps.collaborationService.ensureWorkflowEditable(existing.id);

	// Keep node ids, positions and setup values of the nodes the source kept.
	await prepareWorkflowForSave(json, workflowId, context);

	const changedNodes = json.nodes.length;
	const confirmed = await Container.get(McpConfirmationService).confirm(extra, user, {
		tool: BUILD_WORKFLOW_TOOL_NAME,
		args: { workflowId, nodeNames: json.nodes.map((node) => node.name) },
		message: `Replace ${existing.name} with the built workflow (${changedNodes} nodes)`,
		approval: {
			approvalDetails: {
				action: 'edit-workflow',
				summary:
					version.versionDescription ??
					version.versionName ??
					`Rebuild from source (${changedNodes} nodes)`,
			},
			resourceName: existing.name,
			severity: 'warning',
		},
	});
	if (confirmed.kind === 'ask') return confirmed.result;
	if (confirmed.kind !== 'proceed') {
		return errorResult({
			error:
				confirmed.kind === 'declined'
					? 'The user declined the change. Do not apply it again unless they ask.'
					: 'The confirmation does not match this request. Ask again.',
		});
	}

	const entity = new WorkflowEntity();
	Object.assign(entity, {
		nodes: json.nodes,
		connections: json.connections,
		nodeGroups: json.nodeGroups ?? [],
		settings: { ...(existing.settings ?? {}), ...(json.settings ?? {}) },
		...(json.pinData ? { pinData: json.pinData } : {}),
		meta: { ...(existing.meta ?? {}), aiBuilderAssisted: true, builderVariant: 'mcp' },
	});
	resolveNodeWebhookIds(entity, deps.nodeTypes);
	stripNullCredentialStubs(entity.nodes);
	const skippedGroups = dropInvalidWorkflowGroups(
		entity,
		makeGetNodeTypeForGrouping(deps.nodeTypes),
	).map((violation) => ({ groupName: violation.groupName, reason: violation.message }));

	const updated = await deps.workflowService.update(
		user,
		entity,
		workflowId,
		{
			aiBuilderAssisted: true,
			source: 'n8n-mcp',
			versionName: version.versionName,
			versionDescription: version.versionDescription,
		},
		ctx,
	);
	void deps.collaborationService.broadcastWorkflowUpdate(workflowId, user.id).catch(() => {});

	const output = {
		workflowId: updated.id,
		name: updated.name,
		nodeCount: updated.nodes.length,
		url: `${deps.urlService.getInstanceBaseUrl()}/workflow/${updated.id}`,
		replaced: true,
		...(warnings.length > 0 ? { warnings } : {}),
		...(skippedGroups.length > 0 ? { skippedGroups } : {}),
	};
	return {
		content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
		structuredContent: output,
	};
}
