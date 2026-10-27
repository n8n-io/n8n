import { Tool } from '../../../sdk/tool';
import type { Message, StreamChunk } from '../../../types';
import { AgentRuntime } from '../../loop/agent-runtime';

const MODEL_ID = 'claude-sonnet-5-5';
const history: Message[] = [
	{ role: 'user', content: [{ type: 'text', text: 'Research the options.' }] },
	{
		role: 'assistant',
		content: [
			{
				type: 'reasoning',
				text: 'I will search for the options.',
				providerOptions: { anthropic: { signature: 'first-signature' } },
			},
			{
				type: 'tool-call',
				toolCallId: 'srvtoolu_search',
				toolName: 'anthropic.web_search_20250305',
				providerExecuted: true,
				input: { query: 'support tools' },
				state: 'resolved',
				output: [],
			},
			{
				type: 'reasoning',
				text: '',
				providerOptions: { anthropic: { redactedData: 'redacted-reasoning' } },
			},
			{ type: 'text', text: 'I found some options.' },
		],
	},
	{ role: 'user', content: [{ type: 'text', text: 'Report the stopped work.' }] },
];

function response(stream: boolean): Response {
	const message = {
		id: 'msg_report',
		type: 'message',
		role: 'assistant',
		model: MODEL_ID,
		content: [{ type: 'text', text: 'The research stopped.' }],
		stop_reason: 'end_turn',
		stop_sequence: null,
		usage: { input_tokens: 100, output_tokens: 5 },
	};
	if (!stream) return Response.json(message);
	const events = [
		{ type: 'message_start', message: { ...message, content: [], stop_reason: null } },
		{ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
		{
			type: 'content_block_delta',
			index: 0,
			delta: { type: 'text_delta', text: 'The research stopped.' },
		},
		{ type: 'content_block_stop', index: 0 },
		{
			type: 'message_delta',
			delta: { stop_reason: 'end_turn', stop_sequence: null },
			usage: { output_tokens: 5 },
		},
		{ type: 'message_stop' },
	];
	return new Response(
		events.map((event) => `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`).join(''),
		{ headers: { 'content-type': 'text/event-stream' } },
	);
}

describe.each(['generate', 'stream'] as const)('Anthropic Stop report with %s', (mode) => {
	it('preserves tool history and thinking when new tool calls are disabled', async () => {
		const fetch = vi
			.fn<typeof globalThis.fetch>()
			.mockImplementation(async () => response(mode === 'stream'));
		const work = vi.fn();
		const runtime = new AgentRuntime({
			name: 'test',
			model: { id: `anthropic/${MODEL_ID}`, apiKey: 'test-key' },
			modelFetch: fetch,
			modelCost: { input: 1, output: 1 },
			instructions: 'Research the options and report progress.',
			tools: [
				new Tool('work')
					.description('Do work')
					.input({ type: 'object', properties: {} })
					.handler(work)
					.build(),
			],
			providerTools: [{ name: 'anthropic.web_search_20250305', args: {} }],
		});
		for (const toolsEnabled of [true, false]) {
			if (mode === 'generate') {
				const result = await runtime.generate(history, { toolsEnabled });
				expect(result.finishReason).toBe('stop');
			} else {
				const result = await runtime.stream(history, { toolsEnabled, smoothStream: false });
				const chunks: StreamChunk[] = [];
				for await (const chunk of result.stream) chunks.push(chunk);
				expect(chunks.filter((chunk) => chunk.type === 'error')).toEqual([]);
				expect(chunks.at(-1)).toMatchObject({ type: 'finish', finishReason: 'stop' });
			}
		}
		expect(fetch).toHaveBeenCalledTimes(2);
		const [normal, report] = fetch.mock.calls.map(([, init]) => JSON.parse(init?.body as string));
		expect(report.messages).toEqual(normal.messages);
		expect(report.messages[1].content).toEqual([
			{
				type: 'thinking',
				thinking: 'I will search for the options.',
				signature: 'first-signature',
			},
			{
				type: 'server_tool_use',
				id: 'srvtoolu_search',
				name: 'web_search',
				input: { query: 'support tools' },
			},
			{ type: 'web_search_tool_result', tool_use_id: 'srvtoolu_search', content: [] },
			{ type: 'redacted_thinking', data: 'redacted-reasoning' },
			{ type: 'text', text: 'I found some options.' },
		]);
		expect(report.tools).toEqual(normal.tools);
		expect(report.tool_choice).toEqual({ type: 'none' });
		expect(normal.tool_choice).toEqual({ type: 'auto' });
		expect(work).not.toHaveBeenCalled();
	});
});
