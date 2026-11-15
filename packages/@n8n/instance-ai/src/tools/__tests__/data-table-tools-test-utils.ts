import type { BuiltTool } from '@n8n/agents';
import { DATA_TABLE_TOOL_ACTIONS, type DataTableToolAction } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';

import type { InstanceAiContext } from '../../types';
import { createDataTableTool } from '../data-tables.tool';

/**
 * Builds a tool for every data table action and returns one tool whose handler
 * passes each call to the tool that owns `input.action`. Tests keep the action
 * in their input. Each tool is built once, so suspend and resume reach the same
 * instance.
 */
export function createDataTableToolRouter(context: InstanceAiContext): BuiltTool {
	const tools = new Map<string, BuiltTool>(
		DATA_TABLE_TOOL_ACTIONS.map((action) => [action, createDataTableTool(context, action)]),
	);
	return {
		name: 'data-table-tool-router',
		description: [...tools.values()].map((tool) => tool.description).join('\n'),
		handler: async (input, ctx) => {
			const action = isRecord(input) ? input.action : undefined;
			const tool = typeof action === 'string' ? tools.get(action) : undefined;
			if (!tool?.handler) throw new Error(`No data table tool for action "${String(action)}"`);
			const { action: _action, ...args } = input as Record<string, unknown>;
			return await tool.handler(args, ctx);
		},
	} as BuiltTool;
}

export function dataTableToolFor(context: InstanceAiContext, action: DataTableToolAction) {
	return createDataTableTool(context, action);
}
