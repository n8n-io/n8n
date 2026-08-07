import { buildChatModelProviderHint, pickPreferredChatModelNode } from '../preferred-chat-model';

describe('pickPreferredChatModelNode', () => {
	it('returns the matching chat model for a single provider credential', () => {
		expect(pickPreferredChatModelNode(['anthropicApi'])).toBe(
			'@n8n/n8n-nodes-langchain.lmChatAnthropic',
		);
	});

	it('follows recommendation precedence when several providers are configured', () => {
		expect(pickPreferredChatModelNode(['openAiApi', 'anthropicApi'])).toBe(
			'@n8n/n8n-nodes-langchain.lmChatAnthropic',
		);
		expect(pickPreferredChatModelNode(['xAiApi', 'mistralCloudApi'])).toBe(
			'@n8n/n8n-nodes-langchain.lmChatMistralCloud',
		);
	});

	it('returns undefined when no credential maps to a chat model', () => {
		expect(pickPreferredChatModelNode([])).toBeUndefined();
		expect(pickPreferredChatModelNode(['slackApi', 'notionApi'])).toBeUndefined();
	});
});

describe('buildChatModelProviderHint', () => {
	const gemini = { id: 'g1', name: 'Google Gemini account', type: 'googlePalmApi' };
	const anthropic = { id: 'a1', name: 'Anthropic key', type: 'anthropicApi' };
	const slack = { id: 's1', name: 'Slack token', type: 'slackApi' };

	it('names the LLM credentials the user does have when the requested type has none', () => {
		const hint = buildChatModelProviderHint('openAiApi', [slack, gemini]);

		expect(hint).toContain('openAiApi');
		expect(hint).toContain('"Google Gemini account" (googlePalmApi, id: g1)');
		expect(hint).not.toContain('slackApi');
	});

	it('lists several alternatives in provider recommendation precedence order', () => {
		const hint = buildChatModelProviderHint('openAiApi', [gemini, anthropic]);

		expect(hint).toBeDefined();
		expect(hint!.indexOf('anthropicApi')).toBeLessThan(hint!.indexOf('googlePalmApi'));
	});

	it('returns undefined when a stored credential of the requested type exists', () => {
		const openAi = { id: 'o1', name: 'My OpenAI', type: 'openAiApi' };
		expect(buildChatModelProviderHint('openAiApi', [openAi, gemini])).toBeUndefined();
	});

	it('returns undefined when the requested type is not an LLM provider', () => {
		expect(buildChatModelProviderHint('notionApi', [gemini])).toBeUndefined();
	});

	it('returns undefined when the user has no LLM credential for another provider', () => {
		expect(buildChatModelProviderHint('openAiApi', [slack])).toBeUndefined();
		expect(buildChatModelProviderHint('openAiApi', [])).toBeUndefined();
	});
});
