import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FetchFn } from '../model/model-factory';
import { createModelTokenCounter } from '../model/model-token-counter';

const providerMocks = vi.hoisted(() => ({
	anthropicConstructor: vi.fn(),
	anthropicCountTokens: vi.fn(),
	openAiConstructor: vi.fn(),
	openAiCountTokens: vi.fn(),
}));

vi.mock('@anthropic-ai/sdk', () => ({
	default: class {
		messages = { countTokens: providerMocks.anthropicCountTokens };

		constructor(options: unknown) {
			providerMocks.anthropicConstructor(options);
		}
	},
}));

vi.mock('openai', () => ({
	default: class {
		responses = { inputTokens: { count: providerMocks.openAiCountTokens } };

		constructor(options: unknown) {
			providerMocks.openAiConstructor(options);
		}
	},
}));

describe('createModelTokenCounter', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('counts Anthropic input with the selected model and runtime transport', async () => {
		const fetch = vi.fn() as FetchFn;
		const signal = new AbortController().signal;
		providerMocks.anthropicCountTokens.mockResolvedValue({ input_tokens: 17 });
		const countTokens = createModelTokenCounter(
			{
				id: 'anthropic/claude-sonnet-4-5',
				apiKey: 'anthropic-key',
				baseURL: 'https://anthropic.example/proxy/v1',
				headers: { 'x-tenant': 'tenant-1' },
			},
			fetch,
		);

		await expect(countTokens('hello from Anthropic', signal)).resolves.toBe(17);
		expect(providerMocks.anthropicConstructor).toHaveBeenCalledWith(
			expect.objectContaining({
				apiKey: 'anthropic-key',
				baseURL: 'https://anthropic.example/proxy',
				defaultHeaders: { 'x-tenant': 'tenant-1' },
				fetch,
				maxRetries: 0,
				timeout: 10_000,
			}),
		);
		expect(providerMocks.anthropicCountTokens).toHaveBeenCalledWith(
			{
				model: 'claude-sonnet-4-5',
				messages: [{ role: 'user', content: 'hello from Anthropic' }],
			},
			{ signal },
		);
	});

	it('counts OpenAI Responses input with the selected model and runtime transport', async () => {
		const fetch = vi.fn() as FetchFn;
		const signal = new AbortController().signal;
		providerMocks.openAiCountTokens.mockResolvedValue({ input_tokens: 23 });
		const countTokens = createModelTokenCounter(
			{
				id: 'openai/gpt-5',
				apiKey: 'openai-key',
				apiStyle: 'responses',
				headers: { 'x-tenant': 'tenant-2' },
			},
			fetch,
		);

		await expect(countTokens('hello from OpenAI', signal)).resolves.toBe(23);
		expect(providerMocks.openAiConstructor).toHaveBeenCalledWith(
			expect.objectContaining({
				apiKey: 'openai-key',
				defaultHeaders: { 'x-tenant': 'tenant-2' },
				fetch,
				maxRetries: 0,
				timeout: 10_000,
			}),
		);
		expect(providerMocks.openAiCountTokens).toHaveBeenCalledWith(
			{
				model: 'gpt-5',
				input: 'hello from OpenAI',
			},
			{ signal },
		);
	});

	it('uses cl100k for Google without loading a native SDK', async () => {
		const countTokens = createModelTokenCounter({
			id: 'google/gemini-2.5-pro',
			apiKey: 'google-key',
		});

		await expect(countTokens('hello world')).resolves.toBe(2);
		expect(providerMocks.anthropicConstructor).not.toHaveBeenCalled();
		expect(providerMocks.openAiConstructor).not.toHaveBeenCalled();
	});

	it('disables a failing native counter and keeps using cl100k', async () => {
		providerMocks.anthropicCountTokens.mockRejectedValue(new Error('unavailable'));
		const countTokens = createModelTokenCounter({
			id: 'anthropic/claude-sonnet-4-5',
			apiKey: 'anthropic-key',
		});

		await expect(countTokens('hello world')).resolves.toBe(2);
		await expect(countTokens('hello again')).resolves.toBe(2);
		expect(providerMocks.anthropicCountTokens).toHaveBeenCalledTimes(1);
	});
});
