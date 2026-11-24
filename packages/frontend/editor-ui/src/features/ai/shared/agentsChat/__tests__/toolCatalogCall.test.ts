import type { AgentPersistedMessageDto } from '@n8n/api-types';

import { convertDbMessages } from '../messageMappers';
import { resolveToolCatalogCall } from '../toolCatalogCall';

describe('resolveToolCatalogCall', () => {
	it('returns the tool and arguments that call_tool runs', () => {
		expect(
			resolveToolCatalogCall('call_tool', { tool: 'list_workflows', arguments: { limit: 5 } }),
		).toEqual({ tool: 'list_workflows', input: { limit: 5 } });
	});

	it.each([
		['another tool', 'list_workflows', { tool: 'other' }],
		['call_tool without a target', 'call_tool', { arguments: { limit: 5 } }],
		['call_tool without an input', 'call_tool', undefined],
	])('leaves %s unchanged', (_, toolName, input) => {
		expect(resolveToolCatalogCall(toolName, input)).toEqual({ tool: toolName, input });
	});
});

describe('convertDbMessages — tool catalog calls', () => {
	it('shows the tool that a stored call_tool call runs', () => {
		const dbMessages: AgentPersistedMessageDto[] = [
			{
				id: 'm1',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolName: 'call_tool',
						toolCallId: 'tc-1',
						input: { tool: 'list_workflows', arguments: { limit: 5 } },
						output: { workflows: [] },
						state: 'resolved',
					},
				],
			},
		];

		const [toolCall] = convertDbMessages(dbMessages)[0].toolCalls ?? [];

		expect(toolCall.tool).toBe('list_workflows');
		expect(toolCall.input).toEqual({ limit: 5 });
	});
});
