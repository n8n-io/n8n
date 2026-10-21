import type { ProviderOptions } from '@ai-sdk/provider-utils';
import { generateText, type ModelMessage } from 'ai';

import { createModel } from '../model-factory';
import { applyOpenRouterPromptCache } from '../openrouter-prompt-cache';

type CacheParams = Parameters<typeof applyOpenRouterPromptCache>[0];
type WireRequest = {
	cache_control?: { type: string; ttl?: string };
	messages: Array<{ role: string; content: unknown; cache_control?: unknown }>;
};
const CACHE_1H = { type: 'ephemeral', ttl: '1h' };
const CACHE_5M = { type: 'ephemeral', ttl: '5m' };

async function prepareRequest(overrides: Partial<CacheParams> = {}): Promise<WireRequest> {
	const params: CacheParams = {
		modelId: 'openrouter/anthropic/claude-sonnet-4.5',
		promptCaching: { enabled: true },
		system: [
			{ role: 'system', content: 'Stable instructions' },
			{ role: 'system', content: 'Recovered skills' },
			{ role: 'system', content: 'Volatile instructions' },
		],
		messages: [{ role: 'user', content: 'Hello' }],
		providerOptions: undefined,
		...overrides,
	};
	const original = structuredClone(params);
	const prepared = applyOpenRouterPromptCache(params);
	const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
		Response.json({
			id: 'completion-1',
			model: 'anthropic/claude-sonnet-4.5',
			choices: [
				{ index: 0, message: { role: 'assistant', content: 'Done.' }, finish_reason: 'stop' },
			],
		}),
	);
	await generateText({
		model: createModel({ id: params.modelId, apiKey: 'test-key' }, fetch),
		instructions: prepared.system,
		messages: params.messages,
		providerOptions: prepared.providerOptions,
		maxRetries: 0,
	});
	expect(params).toEqual(original);
	return JSON.parse(fetch.mock.calls[0][1]?.body as string) as WireRequest;
}

function toolHistory(count: number, providerOptions: ProviderOptions): ModelMessage[] {
	const ids = Array.from({ length: count }, (_, index) => `call-${index}`);
	return [
		{ role: 'user', content: 'Look up records' },
		{
			role: 'assistant',
			content: ids.map((id) => ({
				type: 'tool-call',
				toolCallId: id,
				toolName: 'lookup',
				input: {},
			})),
		},
		{
			role: 'tool',
			providerOptions,
			content: ids.map((id) => ({
				type: 'tool-result',
				toolCallId: id,
				toolName: 'lookup',
				output: { type: 'text', value: 'Found' },
			})),
		},
		{ role: 'user', content: 'Continue' },
	];
}

describe('OpenRouter prompt caching', () => {
	it.each([
		{ promptCaching: undefined },
		{ promptCaching: { enabled: false } },
		{ promptCaching: { anthropic: false } },
		{ modelId: 'openrouter/google/gemini-2.5-pro' },
	] satisfies Array<Partial<CacheParams>>)('leaves caching unchanged for %j', async (overrides) => {
		const request = await prepareRequest(overrides);
		expect(JSON.stringify(request)).not.toContain('cache_control');
	});

	it.each([
		{ count: 2, namespace: 'anthropic', key: 'cacheControl', automatic: true },
		{ count: 3, namespace: 'openrouter', key: 'cache_control', automatic: false },
		{ count: 4, namespace: 'anthropic', key: 'cache_control', automatic: false },
		{ count: 4, namespace: 'openrouter', key: 'cacheControl', automatic: false },
	])(
		'keeps four wire markers with $count marked tool results via $namespace.$key',
		async ({ count, namespace, key, automatic }) => {
			const request = await prepareRequest({
				messages: toolHistory(count, { [namespace]: { [key]: CACHE_1H } }),
			});
			expect(request.cache_control).toEqual(automatic ? CACHE_1H : undefined);
			expect(request.messages[0].content).toEqual([
				{
					type: 'text',
					text: 'Stable instructions',
					...(count < 4 ? { cache_control: CACHE_1H } : {}),
				},
			]);
			expect(JSON.stringify(request).match(/"cache_control":/g)).toHaveLength(4);
		},
	);

	it.each(['cacheControl', 'cache_control'])(
		'reserves a slot for explicit automatic %s',
		async (key) => {
			const request = await prepareRequest({
				messages: toolHistory(3, { openrouter: { cacheControl: CACHE_1H } }),
				providerOptions: { openrouter: { [key]: CACHE_5M } },
			});
			expect(request.cache_control).toEqual(CACHE_5M);
			expect(request.messages[0].content).toEqual([{ type: 'text', text: 'Stable instructions' }]);
			expect(JSON.stringify(request).match(/"cache_control":/g)).toHaveLength(4);
		},
	);

	it('uses the raw automatic control when both caller keys are present', async () => {
		const request = await prepareRequest({
			providerOptions: { openrouter: { cacheControl: CACHE_1H, cache_control: CACHE_5M } },
		});
		expect(request.cache_control).toEqual(CACHE_5M);
		expect(request.messages[0].content).toEqual([
			{ type: 'text', text: 'Stable instructions', cache_control: CACHE_5M },
		]);
	});

	it.each([
		{ ttl: '1h', caller: CACHE_5M, trailing: true, instruction: CACHE_1H, automatic: undefined },
		{ ttl: '5m', caller: CACHE_1H, trailing: true, instruction: undefined, automatic: CACHE_5M },
		{ ttl: '5m', caller: CACHE_1H, trailing: false, instruction: undefined, automatic: undefined },
		{ ttl: '1h', caller: CACHE_1H, trailing: false, instruction: CACHE_1H, automatic: undefined },
	] as const)(
		'respects TTL order and final markers: %j',
		async ({ ttl, caller, trailing, instruction, automatic }) => {
			const messages: ModelMessage[] = [
				{
					role: 'user',
					content: 'Caller prompt',
					providerOptions: { anthropic: { cacheControl: caller } },
				},
			];
			if (trailing) messages.push({ role: 'user', content: 'Continue' });
			const request = await prepareRequest({ messages, promptCaching: { anthropic: { ttl } } });
			expect(request.cache_control).toEqual(automatic);
			expect(request.messages[0].content).toEqual([
				{
					type: 'text',
					text: 'Stable instructions',
					...(instruction ? { cache_control: instruction } : {}),
				},
			]);
		},
	);

	it.each([false, true])(
		'matches adapter precedence for multipart=%s user content',
		async (multipart) => {
			const content: Extract<ModelMessage, { role: 'user' }>['content'] = [
				{
					type: 'text',
					text: 'First part',
					providerOptions: { openrouter: { cache_control: CACHE_5M } },
				},
			];
			if (multipart) content.push({ type: 'text', text: 'Second part' });
			const request = await prepareRequest({
				messages: [
					{ role: 'user', content, providerOptions: { anthropic: { cacheControl: CACHE_1H } } },
					{ role: 'user', content: 'Continue' },
				],
			});
			expect(request.cache_control).toEqual(multipart ? undefined : CACHE_1H);
		},
	);
});
