import type { User } from '@n8n/db';
import { generateWorkflowSource } from '@n8n/instance-ai';
import { z } from 'zod';

import { toWorkflowJSON } from '@/modules/instance-ai/workflow-json';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';
import type { WorkflowHistoryService } from '@/workflows/workflow-history/workflow-history.service';

import type { ToolDefinition } from '../../mcp.types';
import { getMcpWorkflowVersion } from '../workflow-history.utils';
import { getMcpWorkflow } from '../workflow-validation.utils';

export const GET_WORKFLOW_AS_CODE_TOOL_NAME = 'get_workflow_as_code';

const inputSchema = {
	workflowId: z.string().describe('The workflow to read'),
	versionId: z
		.string()
		.optional()
		.describe('Read this history version instead of the current draft'),
} satisfies z.ZodRawShape;

const outputSchema = {
	workflowId: z.string(),
	name: z.string(),
	code: z.string().describe('The workflow as n8n workflow SDK TypeScript, with its imports'),
} satisfies z.ZodRawShape;

/**
 * A saved workflow as SDK source, for the edit loop of the workspace: write it
 * to a file, change it, and build it back with `build_workflow` and the same
 * `workflowId`. Node ids are kept in the code so the build keeps the layout.
 */
export function createGetWorkflowAsCodeTool(
	user: User,
	workflowFinderService: WorkflowFinderService,
	workflowHistoryService: WorkflowHistoryService,
): ToolDefinition<typeof inputSchema> {
	return {
		name: GET_WORKFLOW_AS_CODE_TOOL_NAME,
		config: {
			description:
				'Read a workflow as n8n workflow SDK TypeScript. Use it to edit an existing workflow in your workspace: write the code to a file, change it, then build_workflow with filePath and the same workflowId.',
			inputSchema,
			outputSchema,
			annotations: {
				title: 'Get Workflow as Code',
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			},
		},
		handler: async ({ workflowId, versionId }) => {
			const workflow = await getMcpWorkflow(
				workflowId,
				user,
				['workflow:read'],
				workflowFinderService,
			);
			const graph = versionId
				? await getMcpWorkflowVersion(workflowHistoryService, user, workflowId, versionId)
				: undefined;
			const json = toWorkflowJSON(workflow, graph ? { graph } : undefined);
			const code = await generateWorkflowSource(json);
			const output = { workflowId: workflow.id, name: workflow.name, code };
			return {
				content: [{ type: 'text', text: code }],
				structuredContent: output,
			};
		},
	};
}
