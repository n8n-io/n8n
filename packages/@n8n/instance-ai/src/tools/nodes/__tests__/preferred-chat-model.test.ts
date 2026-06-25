import { pickPreferredChatModelNode } from '../preferred-chat-model';

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
