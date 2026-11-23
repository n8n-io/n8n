import { describe, expect, it } from 'vitest';

import { TOOL_CALL_STATE } from '@/features/ai/shared/agentsChat/constants';
import { findToolOutputRenderer } from '@/features/ai/shared/agentsChat/interactionRegistry';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';

import {
	assistantToolResultTableExtension,
	isAssistantTableToolCall,
} from '../assistantToolResultTables';

const workflows = [
	{ id: 'wf-1', name: 'Daily report', active: true },
	{ id: 'wf-2', name: 'Slack sync', active: false },
];

function call(overrides: Partial<ToolCall>): ToolCall {
	return {
		tool: 'list_workflows',
		toolCallId: 'tc-1',
		state: TOOL_CALL_STATE.DONE,
		input: {},
		output: { workflows },
		...overrides,
	};
}

describe('isAssistantTableToolCall', () => {
	it.each([
		['list_workflows', {}, { workflows }],
		['list_executions', {}, { executions: workflows }],
		['list_credentials', {}, { credentials: workflows }],
		['list_data_tables', {}, { tables: workflows }],
		['query_data_table', {}, { data: workflows }],
		['search_nodes', {}, { results: workflows }],
		['workflows', { action: 'list' }, { workflows }],
		['workflow_builder_nodes', { action: 'search' }, { nodes: workflows }],
	])('matches %s with rows', (tool, input, output) => {
		expect(isAssistantTableToolCall(call({ tool, input, output }))).toBe(true);
	});

	it('matches a list tool that the tool catalog runs', () => {
		expect(
			isAssistantTableToolCall(
				call({ tool: 'call_tool', input: { tool: 'list_workflows', arguments: {} } }),
			),
		).toBe(true);
	});

	it.each([
		['another tool', call({ tool: 'get_workflow' })],
		[
			'a former multi-action tool with another action',
			call({ tool: 'workflows', input: { action: 'get' } }),
		],
		['a result without rows', call({ output: { workflows: [] } })],
		['rows that are not objects', call({ output: { workflows: ['wf-1'] } })],
		['a result that is not an object', call({ output: 'No workflows' })],
	])('does not match %s', (_, toolCall) => {
		expect(isAssistantTableToolCall(toolCall)).toBe(false);
	});
});

describe('assistantToolResultTableExtension', () => {
	it('renders the output of a finished list call', () => {
		expect(findToolOutputRenderer(call({}), [assistantToolResultTableExtension])).toBeDefined();
	});

	it('keeps the default output of a list call that failed', () => {
		expect(
			findToolOutputRenderer(call({ state: TOOL_CALL_STATE.ERROR }), [
				assistantToolResultTableExtension,
			]),
		).toBeUndefined();
	});
});
