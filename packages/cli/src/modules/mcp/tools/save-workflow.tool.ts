import { type User, WorkflowEntity, SharedWorkflow, type ProjectRepository } from '@n8n/db';
import { UserError } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';
import z from 'zod';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolDefinition, UserCalledMCPToolEventPayload } from '../mcp.types';
import { workflowJsonSchema } from './schemas';

import type { ProjectService } from '@/services/project.service.ee';
import type { Telemetry } from '@/telemetry';

const inputSchema = {
	workflowJson: workflowJsonSchema.describe('The workflow JSON to save'),
	name: z.string().describe('Name for the workflow'),
	description: z.string().optional().describe('Optional description'),
	projectId: z
		.string()
		.optional()
		.describe('Project ID to save the workflow in. Defaults to the personal project.'),
} satisfies z.ZodRawShape;

export const createSaveWorkflowTool = (
	user: User,
	projectRepository: ProjectRepository,
	projectService: ProjectService,
	telemetry: Telemetry,
): ToolDefinition<typeof inputSchema> => ({
	name: 'save_workflow',
	config: {
		description:
			'Save a workflow to n8n. Creates a new workflow with the provided nodes and connections. Returns the saved workflow metadata.',
		inputSchema,
		annotations: {
			title: 'Save Workflow',
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: false,
			openWorldHint: false,
		},
	},
	handler: async ({ workflowJson, name, description, projectId }) => {
		const telemetryPayload: UserCalledMCPToolEventPayload = {
			user_id: user.id,
			tool_name: 'save_workflow',
			parameters: { name, projectId },
		};

		try {
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

				// Verify user has workflow:create scope in the target project
				const project = await projectService.getProjectWithScope(
					user,
					resolvedProjectId,
					['workflow:create'],
					transactionManager,
				);

				if (!project) {
					throw new UserError("You don't have permission to create workflows in this project.");
				}

				const newWorkflow = new WorkflowEntity();
				newWorkflow.name = name;
				newWorkflow.nodes = workflowJson.nodes;
				newWorkflow.connections = workflowJson.connections;
				newWorkflow.active = false;
				newWorkflow.versionId = uuid();
				if (description) {
					newWorkflow.description = description;
				}

				const workflow = await transactionManager.save<WorkflowEntity>(newWorkflow);

				const newSharedWorkflow = new SharedWorkflow();
				Object.assign(newSharedWorkflow, {
					role: 'workflow:owner',
					project,
					workflow,
				});
				await transactionManager.save<SharedWorkflow>(newSharedWorkflow);

				return workflow;
			});

			const payload = {
				workflowId: savedWorkflow.id,
				name: savedWorkflow.name,
				active: savedWorkflow.active,
				versionId: savedWorkflow.versionId,
				createdAt: savedWorkflow.createdAt.toISOString(),
			};

			telemetryPayload.results = {
				success: true,
				data: {
					workflow_id: savedWorkflow.id,
					node_count: workflowJson.nodes.length,
				},
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);

			return {
				content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
				structuredContent: payload,
			};
		} catch (error) {
			telemetryPayload.results = {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
			telemetry.track(USER_CALLED_MCP_TOOL_EVENT, telemetryPayload);
			throw error;
		}
	},
});
