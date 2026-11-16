import type { BuiltTool } from '@n8n/agents';
import {
	DATA_TABLE_READ_TOOL_ACTIONS,
	type DataTableReadToolAction,
	type InstanceAiPermissions,
} from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import type { Mock } from 'vitest';

import type { InstanceAiContext } from '../../types';
import { createDataTableTool } from '../data-tables.tool';

/**
 * Builds a tool for every data table read action and returns one tool whose handler
 * passes each call to the tool that owns `input.action`. Tests keep the action
 * in their input. Each tool is built once, so suspend and resume reach the same
 * instance.
 */
export function createDataTableToolRouter(context: InstanceAiContext): BuiltTool {
	const tools = new Map<string, BuiltTool>(
		DATA_TABLE_READ_TOOL_ACTIONS.map((action) => [action, createDataTableTool(context, action)]),
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

export function dataTableToolFor(context: InstanceAiContext, action: DataTableReadToolAction) {
	return createDataTableTool(context, action);
}

export function createMockContext(
	overrides: Partial<Omit<InstanceAiContext, 'permissions'>> & {
		permissions?: Partial<InstanceAiPermissions>;
	} = {},
): InstanceAiContext {
	return {
		userId: 'user-1',
		workflowService: {} as InstanceAiContext['workflowService'],
		executionService: {} as InstanceAiContext['executionService'],
		nodeService: {} as InstanceAiContext['nodeService'],
		credentialService: {} as InstanceAiContext['credentialService'],
		dataTableService: {
			list: vi.fn().mockResolvedValue([]),
			getSchema: vi.fn().mockResolvedValue([]),
			queryRows: vi.fn().mockResolvedValue({ count: 0, data: [] }),
			create: vi.fn().mockResolvedValue({}),
			delete: vi.fn().mockResolvedValue(undefined),
			addColumn: vi.fn().mockResolvedValue({}),
			deleteColumn: vi.fn().mockResolvedValue(undefined),
			renameColumn: vi.fn().mockResolvedValue(undefined),
			insertRows: vi.fn().mockResolvedValue({ insertedCount: 0 }),
			updateRows: vi.fn().mockResolvedValue({ updatedCount: 0 }),
			deleteRows: vi.fn().mockResolvedValue({ deletedCount: 0 }),
		},
		permissions: {},
		logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
		...overrides,
	} as unknown as InstanceAiContext;
}

export function suspendCtx(suspendFn: Mock) {
	return { resumeData: undefined, suspend: suspendFn } as never;
}

export function resumeCtx(approved: boolean, scope?: 'once' | 'session') {
	return { resumeData: { approved, ...(scope ? { scope } : {}) } } as never;
}
