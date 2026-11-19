import type { AgentJsonConfig } from '@n8n/api-types';
import type { Agent } from '../../entities/agent.entity';
import { pruneConfigForEval, summarizeTools } from '../evaluation-config';

const baseConfig: AgentJsonConfig = {
	name: 'Support agent',
	model: 'openai/gpt-5',
	credential: 'cred-1',
	instructions: 'Help with support tickets.',
	tools: [
		{
			type: 'node',
			name: 'Slack Tool',
			node: { nodeType: 'n8n-nodes-base.slackTool', nodeTypeVersion: 1, nodeParameters: {} },
		},
	],
} as unknown as AgentJsonConfig;

describe('pruneConfigForEval', () => {
	it('leaves a plain tools-only config untouched', () => {
		const { config, skippedFeatures } = pruneConfigForEval({ ...baseConfig });
		expect(skippedFeatures).toEqual([]);
		expect(config.tools).toEqual(baseConfig.tools);
	});

	it('keeps streamable-HTTP MCP servers and strips only SSE-transport ones', () => {
		const withMcp = {
			...baseConfig,
			mcpServers: [
				{ name: 'acme_kb', url: 'https://mcp.acme-kb.example/mcp', transport: 'streamableHttp' },
				{ name: 'legacy', url: 'https://legacy.example/sse', transport: 'sse' },
			],
		} as unknown as AgentJsonConfig;

		const { config, skippedFeatures } = pruneConfigForEval(withMcp);

		expect(config.mcpServers?.map((server) => server.name)).toEqual(['acme_kb']);
		expect(skippedFeatures).toHaveLength(1);
		expect(skippedFeatures[0].feature).toContain('sse');
		expect(skippedFeatures[0].reason).toContain('legacy');
	});

	it('keeps fallback web search — the web-search mock serves it', () => {
		const withSearch = {
			...baseConfig,
			model: 'mistral/mistral-large',
			config: { webSearch: { enabled: true, provider: 'brave', credential: 'cred-2' } },
		} as unknown as AgentJsonConfig;

		const { config, skippedFeatures } = pruneConfigForEval(withSearch);

		expect(skippedFeatures).toHaveLength(0);
		expect(config.config?.webSearch?.enabled).toBe(true);
	});
});

describe('summarizeTools', () => {
	it('summarizes the fallback web_search tool so the seed can steer it', () => {
		const config = {
			...baseConfig,
			model: 'mistral/mistral-large',
			config: { webSearch: { enabled: true, provider: 'brave', credential: 'cred-2' } },
		} as unknown as AgentJsonConfig;

		const summaries = summarizeTools(config, {}, (name) => name);

		expect(summaries.find((entry) => entry.name === 'web_search')?.kind).toBe('other');
	});

	it('summarizes MCP servers by server name with kind mcp', () => {
		const config = {
			...baseConfig,
			tools: [],
			mcpServers: [
				{ name: 'acme_kb', url: 'https://mcp.acme-kb.example/mcp', description: 'KB server' },
			],
		} as unknown as AgentJsonConfig;

		const summaries = summarizeTools(config, {} as never, (name) => name);
		expect(summaries).toEqual([{ name: 'acme_kb', kind: 'mcp', description: 'KB server' }]);
	});

	it('maps node, workflow, and custom tools with sanitized names', () => {
		const config = {
			...baseConfig,
			tools: [
				...(baseConfig.tools ?? []),
				{ type: 'workflow', workflow: 'Order lookup', description: 'Find an order' },
				{ type: 'custom', id: 't-1' },
			],
		} as unknown as AgentJsonConfig;
		const customTools = {
			't-1': { code: '', descriptor: { name: 'my_custom', description: 'Custom' } },
		} as unknown as NonNullable<Agent['tools']>;

		const summaries = summarizeTools(config, customTools, (name) =>
			name.replace(/[^a-zA-Z0-9_-]+/g, '_'),
		);

		expect(summaries).toEqual([
			{
				name: 'Slack_Tool',
				kind: 'node',
				description: undefined,
				nodeType: 'n8n-nodes-base.slackTool',
			},
			{ name: 'Order_lookup', kind: 'workflow', description: 'Find an order' },
			{ name: 'my_custom', kind: 'custom', description: 'Custom' },
		]);
	});
});
