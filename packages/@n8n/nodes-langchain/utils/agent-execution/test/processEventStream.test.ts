import type { StreamEvent } from '@langchain/core/dist/tracers/event_stream';
import type { IterableReadableStream } from '@langchain/core/dist/utils/stream';
import type { IExecuteFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { processEventStream } from '../processEventStream';

describe('processEventStream', () => {
	it('should stream tool call starts and ends with tool output', async () => {
		const events = (async function* () {
			yield {
				event: 'on_chat_model_end',
				data: {
					output: {
						content: '',
						tool_calls: [
							{
								id: 'call_123',
								name: 'Search',
								type: 'tool_call',
								args: { query: 'n8n' },
							},
						],
					},
				},
			};
			yield {
				event: 'on_tool_end',
				name: 'Search',
				data: {
					output: { result: 'found' },
				},
			};
		})();
		const sendChunk = vi.fn();
		const context = mock<IExecuteFunctions>({ sendChunk });

		const result = await processEventStream(
			context,
			events as unknown as IterableReadableStream<StreamEvent>,
			0,
		);

		expect(sendChunk).toHaveBeenCalledWith({ type: 'begin', itemIndex: 0 });
		expect(sendChunk).toHaveBeenCalledWith({
			type: 'tool-call-start',
			metadata: {
				toolId: 'call_123',
				toolName: 'Search',
				toolType: 'tool_call',
				toolInput: JSON.stringify({ query: 'n8n' }),
			},
		});
		expect(sendChunk).toHaveBeenCalledWith({
			type: 'tool-call-end',
			metadata: {
				toolId: 'call_123',
				toolName: 'Search',
				toolType: 'tool_call',
				toolOutput: JSON.stringify({ result: 'found' }),
			},
		});
		expect(sendChunk).toHaveBeenCalledWith({ type: 'end', itemIndex: 0 });
		expect(result.toolCalls).toEqual([
			{
				tool: 'Search',
				toolInput: { query: 'n8n' },
				toolCallId: 'call_123',
				type: 'tool_call',
				log: 'Calling Search with input: {"query":"n8n"}',
				messageLog: [expect.objectContaining({ tool_calls: expect.any(Array) })],
			},
		]);
	});
});
