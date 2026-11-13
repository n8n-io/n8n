/**
 * Response equivalence of the library HTTP Request node with v1: each case
 * runs a v1 workflow (Manual Trigger → HTTP Request) in n8n's engine against a
 * local server, and the converted workflow on the reference runner with the
 * same response as the step result. The output items (or the error message)
 * must be the same. Server headers that change per request (`date`) are left
 * out of full responses.
 */
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { runOracle } from '../../convert/__tests__/behaviour/oracle-engine.ts';
import { convertWorkflow } from '../../convert/index.ts';
import { runReference } from '../../reference/runner.ts';

interface Case {
	name: string;
	version: number;
	options?: Record<string, unknown>;
	onError?: string;
	status: number;
	contentType: string;
	body: string;
	/** The request first gets a 307 to the real URL, which v1 (axios) follows. */
	redirect?: boolean;
}

const CASES: Case[] = [
	{
		name: 'JSON array',
		version: 4.2,
		status: 200,
		contentType: 'application/json',
		body: '[{"a":1},{"a":2}]',
	},
	{
		name: 'JSON object',
		version: 4.2,
		status: 200,
		contentType: 'application/json',
		body: '{"a":1}',
	},
	{ name: 'text', version: 4.2, status: 200, contentType: 'text/plain', body: 'hello' },
	{ name: 'empty text', version: 4.2, status: 200, contentType: 'text/plain', body: '' },
	{
		name: 'forced text',
		version: 4.2,
		options: { response: { response: { responseFormat: 'text' } } },
		status: 200,
		contentType: 'application/json',
		body: '[{"a":1}]',
	},
	{
		name: 'full response JSON',
		version: 4.2,
		options: { response: { response: { fullResponse: true } } },
		status: 200,
		contentType: 'application/json',
		body: '[{"a":1}]',
	},
	{
		name: 'full response text',
		version: 4.2,
		options: { response: { response: { fullResponse: true } } },
		status: 200,
		contentType: 'text/plain',
		body: 'hello',
	},
	{
		name: '404 fails',
		version: 4.2,
		status: 404,
		contentType: 'application/json',
		body: '{"error":"nope"}',
	},
	{
		name: '404 with never error',
		version: 4.2,
		options: { response: { response: { neverError: true } } },
		status: 404,
		contentType: 'application/json',
		body: '{"error":"nope","code":7}',
	},
	{
		name: '404 with never error and full response',
		version: 4.2,
		options: { response: { response: { neverError: true, fullResponse: true } } },
		status: 404,
		contentType: 'application/json',
		body: '{"error":"nope"}',
	},
	{
		name: '404 continue on fail 4.2',
		version: 4.2,
		onError: 'continueRegularOutput',
		status: 404,
		contentType: 'application/json',
		body: '{"error":"nope","code":7}',
	},
	{
		name: '404 continue on fail 4.5',
		version: 4.5,
		onError: 'continueRegularOutput',
		status: 404,
		contentType: 'application/json',
		body: '{"error":"nope","code":7}',
	},
	{
		name: 'follows a 307 redirect',
		version: 4.2,
		status: 200,
		contentType: 'application/json',
		body: '{"a":1}',
		redirect: true,
	},
];

let server: Server;
let current: Case = CASES[0];
let base = '';

beforeAll(async () => {
	server = createServer((request, response) => {
		if (request.url === '/r') {
			response.statusCode = 307;
			response.setHeader('location', '/x');
			response.end();
			return;
		}
		response.statusCode = current.status;
		response.setHeader('content-type', current.contentType);
		response.end(current.body);
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
	await new Promise((resolve) => server.close(resolve));
});

function workflow(c: Case) {
	return {
		name: 'HTTP',
		nodes: [
			{
				name: 'T',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				name: 'H',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: c.version,
				position: [200, 0],
				parameters: { url: `${base}/${c.redirect ? 'r' : 'x'}`, options: c.options ?? {} },
				...(c.onError ? { onError: c.onError } : {}),
			},
		],
		connections: { T: { main: [[{ node: 'H', type: 'main', index: 0 }]] } },
		settings: { executionOrder: 'v1' },
	};
}

/** Drops what changes per request, and the error fields that only axios has (stack, config). */
function comparable(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(comparable);
	if (typeof value !== 'object' || value === null) return value;
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(value)) {
		if (['date', 'connection', 'content-length', 'keep-alive'].includes(k)) continue;
		if (['stack', 'config', 'request', 'response', 'options', 'isAxiosError', 'code'].includes(k))
			continue;
		out[k] = comparable(v);
	}
	return out;
}

describe('HTTP Request library node and v1', () => {
	it.each(CASES.map((c) => ({ ...c, label: c.name })))('$label', async (c) => {
		current = c;
		const v1 = await runOracle(workflow(c), {
			start: 'T',
			item: {},
			mode: 'trigger',
			timeoutMs: 10_000,
		});
		const converted = convertWorkflow(workflow(c), { trace: 'all' });
		expect(converted.ok).toBe(true);
		const headers = { 'content-type': c.contentType };
		const parsed = (() => {
			try {
				return JSON.parse(c.body) as unknown;
			} catch {
				return c.body;
			}
		})();
		const out = await runReference(converted.source, {
			trigger: { body: {} },
			now: 0,
			seed: 1,
			effects: {
				H: [
					...(c.redirect ? [{ status: 307, headers: { location: '/x' }, body: '' }] : []),
					{ status: c.status, headers, body: parsed },
				],
			},
			trace: true,
		});
		if (v1.error) {
			expect(out.status).toBe('error');
			const message = (out.result as { message?: string }).message ?? '';
			expect(message.startsWith(v1.error)).toBe(true);
			return;
		}
		expect(out.status).toBe('ok');
		const trace = (out.trace ?? [])
			.filter((t) => t.step === 'H')
			.flatMap((t) => t.items as unknown[]);
		expect(comparable(trace)).toEqual(comparable(v1.nodes.H?.[0] ?? []));
	});
});
