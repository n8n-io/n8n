import type { BuiltTool } from '@n8n/agents';
import { WORKSPACE_TOOL_NAME_BY_ACTION } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import type { InstanceAiContext } from '../../types';
import { createWorkspaceTools } from '../workspace.tool';

/**
 * Builds the tools that `createWorkspaceTools` returns for this context and
 * returns one tool whose handler passes each call to the tool that owns
 * `input.action`. Tests keep the action in their input. Routing goes through
 * the factory output, so a factory that wires an action to the wrong tool
 * fails the behavior tests. Each tool is built once, so suspend and resume
 * reach the same instance.
 */
export function createWorkspaceToolRouter(context: InstanceAiContext): BuiltTool {
	const toolsByName = new Map(createWorkspaceTools(context).map((tool) => [tool.name, tool]));
	return {
		name: 'workspace-tool-router',
		description: [...toolsByName.values()].map((tool) => tool.description).join('\n'),
		handler: async (input, ctx) => {
			const action = isRecord(input) ? input.action : undefined;
			const toolName =
				typeof action === 'string' && Object.hasOwn(WORKSPACE_TOOL_NAME_BY_ACTION, action)
					? WORKSPACE_TOOL_NAME_BY_ACTION[action as keyof typeof WORKSPACE_TOOL_NAME_BY_ACTION]
					: undefined;
			const tool = toolName ? toolsByName.get(toolName) : undefined;
			if (!tool?.handler) throw new Error(`No workspace tool for action "${String(action)}"`);
			const { action: _action, ...args } = input as Record<string, unknown>;
			return await tool.handler(args, ctx);
		},
	} as BuiltTool;
}
