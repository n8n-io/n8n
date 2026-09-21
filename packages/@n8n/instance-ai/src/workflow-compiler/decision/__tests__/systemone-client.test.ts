import { describe, expect, it, vi } from 'vitest';

import { SystemOneDecisionClient } from '../systemone-client';
import type { DecisionQuestions } from '../schemas';

const questions: DecisionQuestions = {
	intent: {
		type: 'choice',
		instructions: 'What does the user want?',
		criteria: {
			create: 'Create a workflow.',
			edit: 'Edit a workflow.',
			debug: 'Debug a workflow.',
		},
	},
	urgent: { type: 'noul', instructions: 'Is it urgent?' },
};

function jsonResponse(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}

describe('SystemOneDecisionClient', () => {
	it('posts state and questions and returns validated answers', async () => {
		const fetchImpl = vi.fn(async (_url: string | Request | URL, init?: RequestInit) => {
			const body = JSON.parse(typeof init?.body === 'string' ? init.body : '{}');
			expect(body.model).toBe('jev-latest');
			expect(body.state).toEqual({ request: 'make a workflow' });
			expect(Object.keys(body.questions)).toEqual(['intent', 'urgent']);
			return jsonResponse({
				model: 'jev-latest',
				answers: {
					intent: {
						type: 'choice',
						choice: 'create',
						probabilities: { create: 0.97, edit: 0.02, debug: 0.01 },
						confidence: 0.97,
					},
					urgent: { type: 'noul', noul: 0.1 },
				},
				usage: { input_tokens: 10, output_tokens: 2 },
				diagnostics: { timing: { reads: 1, total_ms: 120 } },
			});
		});
		const client = new SystemOneDecisionClient({ baseUrl: 'http://decisions/', fetchImpl });
		const outcome = await client.decide({
			name: 'test',
			schemaVersion: 'v1',
			state: { request: 'make a workflow' },
			questions,
		});
		expect(fetchImpl).toHaveBeenCalledWith('http://decisions/v1/systemone', expect.anything());
		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.answers.intent).toMatchObject({ type: 'choice', choice: 'create' });
		expect(outcome.reads).toBe(1);
		expect(outcome.problems).toEqual([]);
	});

	it('sends the bearer token when configured', async () => {
		const fetchImpl = vi.fn(async (_url: string | Request | URL, init?: RequestInit) => {
			const headers = new Headers(init?.headers);
			expect(headers.get('authorization')).toBe('Bearer secret');
			return jsonResponse({ model: 'm', answers: { intent: null, urgent: null } });
		});
		const client = new SystemOneDecisionClient({
			baseUrl: 'http://d',
			apiKey: 'secret',
			fetchImpl,
		});
		const outcome = await client.decide({ name: 't', schemaVersion: 'v1', state: {}, questions });
		expect(outcome.ok).toBe(true);
	});

	it('nulls an answer whose choice is outside the criteria', async () => {
		const fetchImpl = vi.fn(async () =>
			jsonResponse({
				model: 'm',
				answers: {
					intent: { type: 'choice', choice: 'delete', probabilities: { delete: 1 }, confidence: 1 },
					urgent: { type: 'noul', noul: 0.5 },
				},
			}),
		);
		const client = new SystemOneDecisionClient({ baseUrl: 'http://d', fetchImpl });
		const outcome = await client.decide({ name: 't', schemaVersion: 'v1', state: {}, questions });
		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.answers.intent).toBeNull();
		expect(outcome.problems[0]).toContain('unknown choice');
	});

	it('reports http errors without throwing', async () => {
		const fetchImpl = vi.fn(async () => new Response('boom', { status: 503 }));
		const client = new SystemOneDecisionClient({ baseUrl: 'http://d', fetchImpl });
		const outcome = await client.decide({ name: 't', schemaVersion: 'v1', state: {}, questions });
		expect(outcome).toMatchObject({ ok: false, reason: 'http_error' });
	});

	it('reports malformed payloads', async () => {
		const fetchImpl = vi.fn(async () =>
			jsonResponse({
				answers: {
					intent: { type: 'choice', choice: 'create', probabilities: { create: 2 }, confidence: 1 },
				},
			}),
		);
		const client = new SystemOneDecisionClient({ baseUrl: 'http://d', fetchImpl });
		const outcome = await client.decide({ name: 't', schemaVersion: 'v1', state: {}, questions });
		expect(outcome).toMatchObject({ ok: false, reason: 'malformed' });
	});

	it('reports network failures as unavailable', async () => {
		const fetchImpl = vi.fn(async () => {
			throw new Error('ECONNREFUSED');
		});
		const client = new SystemOneDecisionClient({ baseUrl: 'http://d', fetchImpl });
		const outcome = await client.decide({ name: 't', schemaVersion: 'v1', state: {}, questions });
		expect(outcome).toMatchObject({ ok: false, reason: 'unavailable', message: 'ECONNREFUSED' });
	});

	it('times out within the configured budget', async () => {
		const fetchImpl = vi.fn(
			async (_url: string | Request | URL, init?: RequestInit) =>
				await new Promise<Response>((_resolve, reject) => {
					init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
				}),
		);
		const client = new SystemOneDecisionClient({ baseUrl: 'http://d', fetchImpl, timeoutMs: 10 });
		const outcome = await client.decide({ name: 't', schemaVersion: 'v1', state: {}, questions });
		expect(outcome).toMatchObject({ ok: false, reason: 'timeout' });
	});
});
