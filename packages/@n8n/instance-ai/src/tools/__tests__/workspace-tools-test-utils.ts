import type { BuiltTool } from '@n8n/agents';
import { WORKSPACE_TOOL_ACTIONS } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import type { InstanceAiContext } from '../../types';
import { createWorkspaceActionTool } from '../workspace.tool';

/**
 * Builds a tool for every workspace action and returns one tool whose handler
 * passes each call to the tool that owns `input.action`. Tests keep the action
 * in their input. Each tool is built once, so suspend and resume reach the same
 * instance.
 */
export function createWorkspaceToolRouter(context: InstanceAiContext): BuiltTool {
	const tools = new Map<string, BuiltTool>(
		WORKSPACE_TOOL_ACTIONS.map((action) => [action, createWorkspaceActionTool(context, action)]),
	);
	return {
		name: 'workspace-tool-router',
		description: [...tools.values()].map((tool) => tool.description).join('\n'),
		handler: async (input, ctx) => {
			const action = isRecord(input) ? input.action : undefined;
			const tool = typeof action === 'string' ? tools.get(action) : undefined;
			if (!tool?.handler) throw new Error(`No workspace tool for action "${String(action)}"`);
			const { action: _action, ...args } = input as Record<string, unknown>;
			return await tool.handler(args, ctx);
		},
	} as BuiltTool;
}
