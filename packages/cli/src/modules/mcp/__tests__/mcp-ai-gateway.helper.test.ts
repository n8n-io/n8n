import { stripToolSuffix } from '../mcp-ai-gateway.helper';

describe('stripToolSuffix', () => {
	it.each([
		['@n8n/n8n-nodes-langchain.openAi', '@n8n/n8n-nodes-langchain.openAi'],
		['@n8n/n8n-nodes-langchain.openAiTool', '@n8n/n8n-nodes-langchain.openAi'],
		['@n8n/n8n-nodes-langchain.openAiHitlTool', '@n8n/n8n-nodes-langchain.openAi'],
		['@n8n/n8n-nodes-langchain.slackTool', '@n8n/n8n-nodes-langchain.slack'],
		['plain', 'plain'],
		['n8n-nodes-base.set', 'n8n-nodes-base.set'],
	])('strips %s -> %s', (input, expected) => {
		expect(stripToolSuffix(input)).toBe(expected);
	});
});
