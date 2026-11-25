import { describe, expect, it } from 'vitest';

import { TOOL_CALL_STATE } from '@/features/ai/shared/agentsChat/constants';
import { findToolOutputRenderer } from '@/features/ai/shared/agentsChat/interactionRegistry';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';
import { MAX_TOOL_DATA_DISPLAY_LENGTH } from '@/features/ai/shared/components/ToolDataBlock/toolData.utils';

import {
	assistantCodeToolResultExtension,
	getAssistantToolCallCode,
} from '../assistantCodeToolResults';

const workflowCode =
	"import { workflow } from '@n8n/workflow-sdk';\n\nexport default workflow({});";

function call(overrides: Partial<ToolCall>): ToolCall {
	return {
		tool: 'get_workflow_as_code',
		toolCallId: 'tc-1',
		state: TOOL_CALL_STATE.DONE,
		input: { workflowId: 'wf-1' },
		output: { code: workflowCode },
		...overrides,
	};
}

const definitions = {
	definitions: [
		{ nodeType: 'n8n-nodes-base.slack', version: 2.3, content: 'interface Slack {}' },
		{ nodeType: 'n8n-nodes-base.if', version: 2.2, content: 'interface If {}' },
	],
};

describe('getAssistantToolCallCode', () => {
	it('reads the code of a workflow', () => {
		expect(getAssistantToolCallCode(call({}))).toBe(workflowCode);
	});

	it('reads the workflow code of a former multi-action workflows call', () => {
		expect(
			getAssistantToolCallCode(
				call({ tool: 'workflows', input: { action: 'get-as-code', workflowId: 'wf-1' } }),
			),
		).toBe(workflowCode);
	});

	it('reads the code of a call that the tool catalog runs', () => {
		expect(
			getAssistantToolCallCode(
				call({
					tool: 'call_tool',
					input: { tool: 'get_workflow_as_code', arguments: { workflowId: 'wf-1' } },
				}),
			),
		).toBe(workflowCode);
	});

	it.each([
		['get_node_types', {}],
		['agent_builder_get_node_types', {}],
		['workflow_builder_nodes', { action: 'type-definition' }],
	])('joins the node type definitions of %s', (tool, input) => {
		expect(getAssistantToolCallCode(call({ tool, input, output: definitions }))).toBe(
			'interface Slack {}\n\ninterface If {}',
		);
	});

	it('skips definitions without content', () => {
		expect(
			getAssistantToolCallCode(
				call({
					tool: 'get_node_types',
					output: { definitions: [{ content: 'interface Slack {}' }, { content: '' }, {}] },
				}),
			),
		).toBe('interface Slack {}');
	});

	it.each([
		['another tool', call({ tool: 'get_workflow' })],
		[
			'another nodes action',
			call({ tool: 'workflow_builder_nodes', input: { action: 'search' }, output: definitions }),
		],
		['a workflow without inline code', call({ output: { filePath: 'wf.ts', nodes: [] } })],
		['a failed workflow read', call({ output: { code: '', error: 'Workflow not found' } })],
		[
			'node types where one definition failed',
			call({
				tool: 'get_node_types',
				output: {
					definitions: [
						...definitions.definitions,
						{
							nodeType: 'n8n-nodes-base.nope',
							content: '',
							error: "No type definition found for 'n8n-nodes-base.nope'.",
						},
					],
				},
			}),
		],
		[
			'definitions without content',
			call({ tool: 'get_node_types', output: { definitions: [{}] } }),
		],
		[
			'code too long to highlight',
			call({ output: { code: 'x'.repeat(MAX_TOOL_DATA_DISPLAY_LENGTH + 1) } }),
		],
	])('returns undefined for %s', (_, toolCall) => {
		expect(getAssistantToolCallCode(toolCall)).toBeUndefined();
	});
});

describe('assistantCodeToolResultExtension', () => {
	it('renders the output of a finished code call', () => {
		expect(findToolOutputRenderer(call({}), [assistantCodeToolResultExtension])).toBeDefined();
	});

	it('keeps the default output of a code call that failed', () => {
		expect(
			findToolOutputRenderer(call({ state: TOOL_CALL_STATE.ERROR }), [
				assistantCodeToolResultExtension,
			]),
		).toBeUndefined();
	});
});
