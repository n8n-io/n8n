import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';

import { createLlmMockHandler } from '../../instance-ai/eval/mock-handler';

const prompts: string[] = [];
const logged: string[] = [];
// The body that the fake model sends back for the next request.
let answer: Record<string, unknown> = {};

vi.mock('@n8n/instance-ai', () => ({
	createEvalAgent: () => {
		const tools: Array<{ name: string; handler: (i: unknown, c: unknown) => unknown }> = [];
		const agent = {
			tool: (tool: (typeof tools)[number]) => {
				tools.push(tool);
				return agent;
			},
			generate: async (prompt: string) => {
				prompts.push(prompt);
				const submit = tools.find((t) => t.name === 'submit_response');
				await submit?.handler({ type: 'json', body: answer }, {});
				return { messages: [], finishReason: 'stop' };
			},
		};
		return agent;
	},
	extractText: () => '',
}));

const BOT_TOKEN = 'bot123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw';
const SECRETS = [
	'qs-secret',
	'url-secret',
	'body-secret',
	'hdr-secret',
	'param-secret',
	'abc123tok',
	'AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw',
	'json-hdr-secret',
	'node-url-secret',
];

const node = {
	name: 'HTTP Request',
	type: 'n8n-nodes-base.httpRequestTool',
	parameters: {
		method: 'POST',
		url: `https://api.unknown.test/${BOT_TOKEN}/tasks?token=node-url-secret`,
		sendHeaders: true,
		headerParameters: { parameters: [{ name: 'X-Api-Key', value: 'param-secret' }] },
		jsonHeaders: '{"Authorization":"Basic json-hdr-secret"}',
		authToken: 'abc123tok',
	},
} as unknown as INode;

describe('the prompt and the log of the simulator', () => {
	beforeEach(() => {
		prompts.length = 0;
		logged.length = 0;
		answer = {};
		const sink = (line: string) => logged.push(line);
		Container.set(Logger, {
			info: sink,
			warn: sink,
			error: sink,
			debug: sink,
		} as unknown as Logger);
	});

	it('holds no secret of the request or of the node parameters', async () => {
		const handler = createLlmMockHandler({ maxRetries: 0, redactSecrets: true });
		const request = {
			url: `https://api.unknown.test/${BOT_TOKEN}/tasks?api_key=url-secret&page=2`,
			method: 'POST' as const,
			qs: { access_token: 'qs-secret' },
			body: { password: 'body-secret', title: 'Buy milk' },
			headers: { authorization: 'Bearer hdr-secret' },
		};

		await handler(request, node);
		// The same request again is served from the cache, which writes its own log line.
		await handler(request, node);
		await handler({ ...request, method: 'GET' }, node);

		expect(prompts.length).toBeGreaterThan(0);
		for (const prompt of prompts) {
			for (const secret of SECRETS) expect(prompt).not.toContain(secret);
			expect(prompt).toContain('Buy milk');
		}
		expect(logged.length).toBeGreaterThan(0);
		for (const line of logged) {
			for (const secret of SECRETS) expect(line).not.toContain(secret);
		}
	});

	it('shows a later read the write that the same mock answered before', async () => {
		const handler = createLlmMockHandler({ maxRetries: 0, redactSecrets: true });
		answer = { id: 7, title: 'Buy milk' };

		await handler(
			{
				url: 'https://api.unknown.test/v1/tasks',
				method: 'POST',
				body: { title: 'Buy milk' },
			},
			node,
		);
		await handler({ url: 'https://api.unknown.test/v1/tasks', method: 'GET' }, node);

		expect(prompts[0]).not.toContain('Earlier writes in this execution');
		expect(prompts[1]).toContain('Earlier writes in this execution');
		expect(prompts[1]).toContain('Buy milk');
	});
});
