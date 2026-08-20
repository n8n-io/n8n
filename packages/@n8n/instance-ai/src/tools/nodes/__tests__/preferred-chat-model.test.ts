import {
	buildChatModelProviderHint,
	buildChatModelProviderMismatchWarnings,
	pickPreferredChatModelNode,
} from '../preferred-chat-model';

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

describe('buildChatModelProviderMismatchWarnings', () => {
	const gemini = { id: 'g1', name: 'Google Gemini account', type: 'googlePalmApi' };
	const anthropic = { id: 'a1', name: 'Anthropic key', type: 'anthropicApi' };
	const openAiNode = { name: 'OpenAI Chat Model', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' };
	const webhookNode = { name: 'Webhook', type: 'n8n-nodes-base.webhook' };

	it('warns for a chat-model node whose provider has no stored credential', () => {
		const warnings = buildChatModelProviderMismatchWarnings([webhookNode, openAiNode], [gemini]);

		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain('"OpenAI Chat Model"');
		expect(warnings[0]).toContain('openAiApi');
		expect(warnings[0]).toContain('"Google Gemini account" (googlePalmApi, id: g1)');
	});

	it('lists alternatives in provider recommendation precedence order', () => {
		const warnings = buildChatModelProviderMismatchWarnings([openAiNode], [gemini, anthropic]);

		expect(warnings).toHaveLength(1);
		expect(warnings[0].indexOf('anthropicApi')).toBeLessThan(warnings[0].indexOf('googlePalmApi'));
	});

	it('does not warn when the provider credential is stored', () => {
		const openAi = { id: 'o1', name: 'My OpenAI', type: 'openAiApi' };
		expect(buildChatModelProviderMismatchWarnings([openAiNode], [openAi, gemini])).toEqual([]);
	});

	it('does not warn when the user has no LLM credential for another provider', () => {
		const slack = { id: 's1', name: 'Slack token', type: 'slackApi' };
		expect(buildChatModelProviderMismatchWarnings([openAiNode], [slack])).toEqual([]);
		expect(buildChatModelProviderMismatchWarnings([openAiNode], [])).toEqual([]);
	});

	it('only warns for the mismatched nodes in a multi-model workflow', () => {
		const anthropicNode = { name: 'Claude', type: '@n8n/n8n-nodes-langchain.lmChatAnthropic' };
		const warnings = buildChatModelProviderMismatchWarnings(
			[openAiNode, anthropicNode],
			[anthropic],
		);

		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain('"OpenAI Chat Model"');
	});

	it('still warns for nodes named after Object.prototype members', () => {
		const protoNode = { name: 'constructor', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' };

		const warnings = buildChatModelProviderMismatchWarnings([protoNode], [gemini], {});

		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toContain('"constructor"');
	});

	it('does not warn when the node already runs on the n8n credits managed credential', () => {
		const warnings = buildChatModelProviderMismatchWarnings([openAiNode], [gemini], {
			'OpenAI Chat Model': [{ type: 'openAiApi', __aiGatewayManaged: true }],
		});

		expect(warnings).toEqual([]);
	});

	it('does not warn for disabled chat-model nodes', () => {
		const disabledNode = {
			name: 'Disabled OpenAI',
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			disabled: true,
		};
		const warnings = buildChatModelProviderMismatchWarnings([disabledNode], [gemini]);

		expect(warnings).toEqual([]);
	});
});
