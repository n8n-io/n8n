import { describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import type { AgentJsonConfig, AgentJsonToolConfig } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import AgentEvalMockNotice from '../components/AgentEvalMockNotice.vue';

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: () => ({
		getNodeType: (name: string) => ({
			displayName: (
				{ slack: 'Slack Tool', sheets: 'Google Sheets', gmail: 'Gmail' } as Record<string, string>
			)[name],
		}),
	}),
}));
vi.mock('../composables/useAgentIntegrationsCatalog', () => ({
	useAgentIntegrationsCatalog: () => ({
		catalog: ref([
			{ type: 'slack', label: 'Slack' },
			{ type: 'telegram', label: 'Telegram' },
		]),
		ensureLoaded: vi.fn().mockResolvedValue([]),
	}),
}));
const node = (nodeType: string): AgentJsonToolConfig => ({
	type: 'node',
	name: nodeType,
	node: { nodeType, nodeTypeVersion: 1, nodeParameters: {} },
});
const renderComponent = createComponentRenderer(AgentEvalMockNotice);
const config = (overrides: Partial<AgentJsonConfig> = {}): AgentJsonConfig => ({
	name: 'Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: '',
	...overrides,
});

describe('AgentEvalMockNotice', () => {
	it.each([
		[[], "Your agent won't really message anyone or change anything here."],
		[[node('slack')], "Your agent won't really use Slack here."],
		[[node('slack'), node('sheets')], "Your agent won't really use Slack or Google Sheets here."],
		[
			[node('slack'), node('sheets'), node('gmail')],
			"Your agent won't really use Slack, Google Sheets and 1 more here.",
		],
	] as const)('describes the configured services', (tools, expected) => {
		const { getByText } = renderComponent({
			props: { config: config({ tools: [...tools] }), projectId: 'project-1' },
		});
		expect(getByText(expected)).toBeInTheDocument();
	});
	it('deduplicates channels and node tools and excludes disabled tools', () => {
		const { getByText } = renderComponent({
			props: {
				projectId: 'project-1',
				config: config({
					tools: [node('slack'), { ...node('sheets'), enabled: false }],
					integrations: [
						{ type: 'slack', credentialId: 'slack-1' },
						{ type: 'telegram', credentialId: 'telegram-1' },
					],
				}),
			},
		});
		expect(getByText("Your agent won't really use Slack or Telegram here.")).toBeInTheDocument();
	});
	it('uses configured workflow and MCP names without showing credential ids', () => {
		const { getByText } = renderComponent({
			props: {
				projectId: 'project-1',
				config: config({
					tools: [{ type: 'workflow', workflow: 'Order management', name: 'Create order' }],
					mcpServers: [
						{
							name: 'CRM',
							url: 'https://example.com/mcp',
							transport: 'streamableHttp',
							authentication: 'none',
						},
					],
				}),
			},
		});
		expect(getByText("Your agent won't really use Create order or CRM here.")).toBeInTheDocument();
	});
});
