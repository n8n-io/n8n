import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import type { AgentMessage } from '../../types/sdk/message';
import { AgentRuntime } from '../loop/agent-runtime';
import { AgentEventBus } from '../state/event-bus';

interface SentMessage {
	role: string;
	content?: string | null;
	reasoning_content?: string;
	tool_calls?: unknown[];
}

// One finished turn, then the current turn: reasoning, a tool call and its result.
const history: AgentMessage[] = [
	{ role: 'user', content: [{ type: 'text', text: 'First question' }] },
	{
		role: 'assistant',
		content: [
			{ type: 'reasoning', text: 'Earlier chain of thought' },
			{ type: 'text', text: 'First answer' },
		],
	},
	{ role: 'user', content: [{ type: 'text', text: 'Second question' }] },
	{
		role: 'assistant',
		content: [
			{ type: 'reasoning', text: 'Current chain of thought' },
			{
				type: 'tool-call',
				toolCallId: 'call-1',
				toolName: 'lookup',
				input: { q: 'x' },
				state: 'resolved',
				output: { found: true },
			},
		],
	},
];

const completion = {
	id: 'c1',
	object: 'chat.completion',
	created: 0,
	model: 'test-model',
	choices: [{ index: 0, message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
	usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
};

const chunk = (choice: Record<string, unknown>) =>
	`data: ${JSON.stringify({ ...completion, object: 'chat.completion.chunk', choices: [{ index: 0, ...choice }] })}\n\n`;

const streamBody =
	chunk({ delta: { role: 'assistant', content: 'OK' } }) +
	chunk({ delta: {}, finish_reason: 'stop' }) +
	'data: [DONE]\n\n';

describe('reasoning replay on the wire', () => {
	let server: Server;
	let baseUrl: string;
	const bodies: Array<{ messages: SentMessage[] }> = [];

	beforeAll(async () => {
		server = createServer((req, res) => {
			let raw = '';
			req.on('data', (data: Buffer) => (raw += data.toString()));
			req.on('end', () => {
				const body = JSON.parse(raw) as { messages: SentMessage[]; stream?: boolean };
				bodies.push(body);
				if (body.stream) {
					res.writeHead(200, { 'content-type': 'text/event-stream' });
					res.end(streamBody);
				} else {
					res.writeHead(200, { 'content-type': 'application/json' });
					res.end(JSON.stringify(completion));
				}
			});
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
	});

	afterAll(async () => await new Promise<void>((resolve) => server.close(() => resolve())));

	beforeEach(() => (bodies.length = 0));

	async function sentAssistantMessages(id: string, path: 'generate' | 'stream') {
		const agent = new AgentRuntime({
			name: 'replay-test',
			model: { id, url: baseUrl, apiKey: 'k' } as never,
			instructions: 'test',
			eventBus: new AgentEventBus(),
		});
		if (path === 'generate') {
			await agent.generate(history);
		} else {
			const reader = (await agent.stream(history)).stream.getReader();
			while (!(await reader.read()).done) {
				/* Drain the stream. */
			}
		}
		return (bodies.at(-1)?.messages ?? []).filter((message) => message.role === 'assistant');
	}

	it.each(['generate', 'stream'] as const)(
		'%s: sends reasoning_content back on the current tool chain only',
		async (path) => {
			const [finished, current] = await sentAssistantMessages('custom/test-model', path);

			expect(current.tool_calls).toHaveLength(1);
			expect(current.reasoning_content).toBe('Current chain of thought');
			expect(finished.content).toBe('First answer');
			expect(finished.reasoning_content).toBeUndefined();
		},
	);
});
