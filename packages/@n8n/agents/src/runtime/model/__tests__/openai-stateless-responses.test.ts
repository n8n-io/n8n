import { generateText } from 'ai';

import type { Message } from '../../../types/sdk/message';
import { toAiMessages } from '../messages';
import { createModel } from '../model-factory';

// History from a Responses turn that an other OpenAI org stored (for example
// Gateway credits before the user switched to their own API key).
const history = [
	{ role: 'user', content: [{ type: 'text', text: 'hi' }] },
	{
		role: 'assistant',
		content: [
			{
				type: 'reasoning',
				text: '',
				providerMetadata: {
					openai: { itemId: 'rs_from_other_org', reasoningEncryptedContent: null },
				},
			},
			{
				type: 'text',
				text: 'hello',
				providerMetadata: { openai: { itemId: 'msg_from_other_org' } },
			},
		],
	},
	{ role: 'user', content: [{ type: 'text', text: 'again' }] },
] as unknown as Message[];

async function captureBody(url?: string) {
	let body: Record<string, unknown> = {};
	const fetch = async (_url: unknown, init?: { body?: unknown }) => {
		body = JSON.parse(String(init?.body)) as Record<string, unknown>;
		return new Response('{}', { status: 500 });
	};
	const model = createModel(
		{ id: 'openai/gpt-5-mini', apiKey: 'sk-test', ...(url && { url }) } as never,
		fetch as never,
	);
	await generateText({
		model,
		messages: toAiMessages(history, 'openai'),
		providerOptions: { openai: { promptCacheKey: 'agent-cache-key' } },
		maxRetries: 0,
	}).catch(() => {});
	return body;
}

describe('OpenAI Responses replay', () => {
	it.each([
		['official API', undefined],
		['Gateway', 'https://ai-assistant.n8n.io/v1/gateway/openai'],
	])('sends stateless requests without item references on the %s', async (_name, url) => {
		const body = await captureBody(url);

		expect(body.store).toBe(false);
		expect(body.include).toEqual(['reasoning.encrypted_content']);
		expect(body.prompt_cache_key).toBe('agent-cache-key');
		const input = JSON.stringify(body.input);
		expect(input).not.toContain('item_reference');
		expect(input).not.toContain('_from_other_org');
	});

	it('drops reasoning without encrypted content and keeps the conversation', async () => {
		const body = await captureBody();

		expect(body.input).toEqual([
			{ role: 'user', content: [{ type: 'input_text', text: 'hi' }] },
			{ role: 'assistant', content: 'hello' },
			{ role: 'user', content: [{ type: 'input_text', text: 'again' }] },
		]);
	});
});
