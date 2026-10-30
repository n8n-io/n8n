import type { BuiltTool } from '@n8n/agents';
import { WORKFLOW_TOOL_NAME_BY_ACTION } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import type { InstanceAiContext } from '../../types';
import {
	createWorkflowTool,
	createWorkflowTools,
	type WorkflowsToolOptions,
} from '../workflows.tool';
import { WORKFLOW_ACTIONS } from '../workflows/workflow-tool-actions';

/**
 * Builds a tool for every workflow action and returns one tool whose handler
 * passes each call to the tool that owns `input.action`. Tests keep the action
 * in their input. Capability gating is skipped, so a test can run an action
 * without mocking every service method. Each tool is built once, so suspend and
 * resume reach the same instance.
 */
export function createWorkflowToolRouter(
	context: InstanceAiContext,
	options?: WorkflowsToolOptions | 'full' | 'orchestrator',
): BuiltTool {
	const tools = new Map(
		WORKFLOW_ACTIONS.map((action) => {
			const tool = createWorkflowTool(context, action, options);
			return [tool.name, tool];
		}),
	);
	return {
		name: 'workflow-tool-router',
		description: [...tools.values()].map((tool) => tool.description).join('\n'),
		handler: async (input, ctx) => {
			const action = isRecord(input) ? input.action : undefined;
			const name =
				typeof action === 'string' && Object.hasOwn(WORKFLOW_TOOL_NAME_BY_ACTION, action)
					? WORKFLOW_TOOL_NAME_BY_ACTION[action as keyof typeof WORKFLOW_TOOL_NAME_BY_ACTION]
					: undefined;
			const tool = name ? tools.get(name) : undefined;
			if (!tool?.handler) throw new Error(`No workflow tool for action "${String(action)}"`);
			return await tool.handler(input, ctx);
		},
	} as BuiltTool;
}

/** The workflow tools by name. */
export function createWorkflowToolMap(
	context: InstanceAiContext,
	options?: WorkflowsToolOptions | 'full' | 'orchestrator',
): Map<string, BuiltTool> {
	return new Map(createWorkflowTools(context, options).map((tool) => [tool.name, tool]));
}
