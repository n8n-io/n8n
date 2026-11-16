import { Agent, type CredentialProvider, type StreamChunk } from '@n8n/agents';
import nock from 'nock';
import { mock } from 'vitest-mock-extended';

import responses from './fixtures/vercel-ai-gateway-responses.json';
import { resolveCredentialAwareModelConfig } from '../model-config';

describe('Vercel AI Gateway model configuration', () => {
	beforeEach(() => {
		nock('https://models.dev').get('/api.json').reply(200, {}).persist();
	});

	afterEach(() => {
		nock.cleanAll();
	});

	async function streamWithCredential(modelId: string) {
		const credentialProvider = mock<CredentialProvider>();
		credentialProvider.resolve.mockResolvedValue({
			apiKey: 'vercel-test-replay',
			url: 'https://ai-gateway.vercel.sh/v1',
		});
		const model = await resolveCredentialAwareModelConfig(
			modelId,
			'cred-vercel',
			credentialProvider,
		);
		const agent = new Agent('vercel-chat-test').model(model).instructions('Reply with exactly OK.');
		const { stream } = await agent.stream('Acknowledge.');
		const chunks: StreamChunk[] = [];
		const reader = stream.getReader();
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(value as StreamChunk);
		}
		return chunks;
	}

	// AGENT-1182: these responses came from live requests with the same gateway key.
	it('passes the Sonnet test-chat request to the native gateway', async () => {
		const scopes = nock.define(
			responses.filter((response) => response.status !== 200) as nock.Definition[],
		);
		const chunks = await streamWithCredential('vercel/anthropic/claude-sonnet-5.5');

		// The key's free tier rejects this model. A valid route returns that error, not a 404.
		expect(chunks.filter((chunk) => chunk.type === 'error')).toEqual([
			expect.objectContaining({
				error: expect.objectContaining({
					message: expect.stringContaining('Free tier users do not have access to this model.'),
				}),
			}),
		]);
		expect(scopes[0].isDone()).toBe(false);
		expect(scopes[1].isDone()).toBe(true);
	});

	it('streams a model response with a standard n8n gateway credential', async () => {
		const scopes = nock.define(
			responses.filter((response) => response.status !== 403) as nock.Definition[],
		);
		const chunks = await streamWithCredential('vercel/openai/gpt-4.1-nano');

		expect(chunks.filter((chunk) => chunk.type === 'error')).toHaveLength(0);
		expect(
			chunks
				.filter((chunk) => chunk.type === 'text-delta')
				.map((chunk) => chunk.delta)
				.join(''),
		).toBe('OK');
		expect(chunks.filter((chunk) => chunk.type === 'finish').at(-1)).toMatchObject({
			finishReason: 'stop',
		});
		expect(scopes[0].isDone()).toBe(false);
		expect(scopes[1].isDone()).toBe(true);
	});
});
