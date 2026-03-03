import {
	type SharedWorkflow,
	SharedWorkflowRepository,
	WorkflowEntity,
	ProjectRepository,
} from '@n8n/db';
import type { User } from '@n8n/db';
import { v4 as uuid } from 'uuid';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../../mcp.types';

import { validateEntity } from '@/generic-helpers';
import { ProjectService } from '@/services/project.service.ee';
import { UrlService } from '@/services/url.service';
import type { Telemetry } from '@/telemetry';
import * as WorkflowHelpers from '@/workflow-helpers';
import { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

const inputSchema = {
	code: z
		.string()
		.describe(
			'Full TypeScript/JavaScript workflow code using the n8n Workflow SDK. Must be validated first with n8n_validate_workflow_code.',
		),
	name: z
		.string()
		.max(128)
		.optional()
		.describe('Optional workflow name. If not provided, uses the name from the code.'),
	projectId: z
		.string()
		.optional()
		.describe(
			"Optional project ID to create the workflow in. Defaults to the user's personal project.",
		),
} satisfies z.ZodRawShape;

/**
 * MCP tool that creates a workflow in n8n from validated SDK code.
 * Parses the code, validates it, and saves the resulting workflow.
 */
export const createCreateWorkflowFromCodeTool = (
	user: User,
	projectRepository: ProjectRepository,
	projectService: ProjectService,
	sharedWorkflowRepository: SharedWorkflowRepository,
	workflowHistoryService: WorkflowHistoryService,
	urlService: UrlService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'n8n_create_workflow_from_code',
	config: {
		description:
			'Create a workflow in n8n from validated SDK code. Parses the code into a workflow and saves it. Always validate with n8n_validate_workflow_code first.',
		inputSchema,
		annotations: {
			title: 'Create Workflow from Code',
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		},
	},
	handler: async ({
		code,
		name,
		projectId,
	}: {
		code: string;
		name?: string;
		projectId?: string;
	}) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'n8n_create_workflow_from_code',
			parameters: { codeLength: code.length, hasName: !!name, hasProjectId: !!projectId },
		};

		try {
			const { ParseValidateHandler, stripImportStatements } = await import(
				'@n8n/ai-workflow-builder'
			);

			// 1. Parse and validate code
			const handler = new ParseValidateHandler({ generatePinData: false });
			const strippedCode = stripImportStatements(code);
			const result = await handler.parseAndValidate(strippedCode);
			const workflowJson = result.workflow;

			// 2. Create workflow entity
			const newWorkflow = new WorkflowEntity();
			Object.assign(newWorkflow, {
				name: name ?? workflowJson.name ?? 'Untitled Workflow',
				nodes: workflowJson.nodes,
				connections: workflowJson.connections,
				settings: workflowJson.settings ?? { executionOrder: 'v1' },
				pinData: workflowJson.pinData,
				meta: { ...workflowJson.meta, aiBuilderAssisted: true },
			});
			newWorkflow.active = false;
			newWorkflow.versionId = uuid();

			await validateEntity(newWorkflow);
			await WorkflowHelpers.replaceInvalidCredentials(newWorkflow);
			WorkflowHelpers.addNodeIds(newWorkflow);

			// 3. Save in transaction
			const { manager: dbManager } = projectRepository;
			const savedWorkflow = await dbManager.transaction(async (transactionManager) => {
				let resolvedProjectId = projectId;

				if (!resolvedProjectId) {
					const personalProject = await projectRepository.getPersonalProjectForUserOrFail(
						user.id,
						transactionManager,
					);
					resolvedProjectId = personalProject.id;
				}

				const project = await projectService.getProjectWithScope(
					user,
					resolvedProjectId,
					['workflow:create'],
					transactionManager,
				);

				if (project === null) {
					throw new Error("You don't have the permissions to create a workflow in this project.");
				}

				const workflow = await transactionManager.save<WorkflowEntity>(newWorkflow);

				const newSharedWorkflow = sharedWorkflowRepository.create({
					role: 'workflow:owner',
					projectId: project.id,
					workflow,
				});
				await transactionManager.save<SharedWorkflow>(newSharedWorkflow);

				await workflowHistoryService.saveVersion(
					user,
					workflow,
					workflow.id,
					false,
					transactionManager,
				);

				return workflow;
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

			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(
							{
								workflowId: savedWorkflow.id,
								name: savedWorkflow.name,
								nodeCount: savedWorkflow.nodes.length,
								url: workflowUrl,
							},
							null,
							2,
						),
					},
				],
			};
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);

			telemetryPayload.results = {
				success: false,
				error: errorMessage,
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({ error: errorMessage }, null, 2),
					},
				],
				isError: true,
			};
		}
	},
});
