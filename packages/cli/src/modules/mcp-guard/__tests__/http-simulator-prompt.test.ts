import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';

import { createLlmMockHandler } from '../../instance-ai/eval/mock-handler';
import { HttpSimulator } from '../http-simulator';
import type { HydrationModel } from '../hydration-llm';
import { createNodeRequestGuard } from '../node-request-guard';

const prompts: string[] = [];
const logged: string[] = [];
// The body that the fake model sends back for the next request.
let answer: Record<string, unknown> = {};
// Holds a model call until it resolves, and makes the call fail when `failGenerate` is set.
let gate: Promise<void> | undefined;
let failGenerate = false;

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
				await gate;
				if (failGenerate) throw new Error('model down');
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
		gate = undefined;
		failGenerate = false;
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
	it('holds no secret of a text body', async () => {
		const handler = createLlmMockHandler({ maxRetries: 0, redactSecrets: true });

		await handler(
			{ url: 'https://api.unknown.test/v1/a', method: 'POST', body: '{"api_key":"json-secret"}' },
			node,
		);
		await handler(
			{ url: 'https://api.unknown.test/v1/b', method: 'POST', body: 'grant=x&token=form-secret' },
			node,
		);

		expect(prompts).toHaveLength(2);
		for (const prompt of prompts) {
			expect(prompt).not.toContain('json-secret');
			expect(prompt).not.toContain('form-secret');
		}
		expect(prompts[1]).toContain('grant=x');
	});

	it('holds no value that query auth adds, on the way from the guard to the prompt', async () => {
		const simulator = new HttpSimulator();
		Container.set(HttpSimulator, simulator);
		const model: HydrationModel = { resolve: async () => ({}) as never };
		const guard = createNodeRequestGuard({ model, chatId: 'chat1', agentId: 'agent1' });
		const authNode = {
			...node,
			parameters: { authentication: 'genericCredentialType', genericAuthType: 'httpQueryAuth' },
		} as unknown as INode;

		await guard(
			{ url: 'https://api.unknown.test/data/2.5/weather', qs: { q: 'Berlin', appid: 'SECRET' } },
			authNode,
		);

		expect(prompts).toHaveLength(1);
		expect(prompts[0]).not.toContain('SECRET');
		expect(prompts[0]).toContain('/data/2.5/weather');
	});

	describe('a call that the caller gave up', () => {
		const post = {
			url: 'https://api.unknown.test/v1/tasks',
			method: 'POST' as const,
			body: { title: 'Buy milk' },
		};

		const startHeld = async (handler: ReturnType<typeof createLlmMockHandler>) => {
			let release = () => {};
			gate = new Promise<void>((resolve) => {
				release = resolve;
			});
			const abort = new AbortController();
			const call = handler(post, node, abort.signal);
			await vi.waitFor(() => expect(prompts).toHaveLength(1));
			abort.abort();
			release();
			return await call;
		};

		it('keeps its late write out of the ledger and out of the cache', async () => {
			const handler = createLlmMockHandler({ maxRetries: 0, redactSecrets: true });
			answer = { id: 7, title: 'Buy milk' };

			const late = await startHeld(handler);
			gate = undefined;
			await handler({ url: post.url, method: 'GET' }, node);
			await handler(post, node);

			expect(late?.body).toMatchObject({ _evalMockError: true });
			expect(prompts[1]).not.toContain('Earlier writes in this execution');
			// The same write again makes a new answer. A cached late answer would have served it.
			expect(prompts).toHaveLength(3);
		});

		it('makes no more attempts', async () => {
			const handler = createLlmMockHandler({ maxRetries: 2, redactSecrets: true });
			failGenerate = true;

			await startHeld(handler);

			expect(prompts).toHaveLength(1);
		});
	});
});
