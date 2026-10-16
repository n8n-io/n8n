import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import type { AgentJsonConfig, AgentJsonToolConfig } from '@n8n/api-types';
import { createComponentRenderer } from '@/__tests__/render';
import AgentEvalMockNotice from '../components/AgentEvalMockNotice.vue';

const { ensureLoaded } = vi.hoisted(() => ({ ensureLoaded: vi.fn() }));

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
		ensureLoaded,
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
	beforeEach(() => {
		ensureLoaded.mockReset().mockResolvedValue([]);
	});

	it.each([undefined, null])('shows the generic assurance before config loads', (agentConfig) => {
		const { getByText } = renderComponent({
			props: { config: agentConfig, projectId: 'project-1' },
		});

		expect(
			getByText("Your agent won't really message anyone or change anything here."),
		).toBeInTheDocument();
		expect(ensureLoaded).not.toHaveBeenCalled();
	});

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

	it('uses the configured node name when node metadata has no display name', () => {
		const { getByText } = renderComponent({
			props: {
				projectId: 'project-1',
				config: config({ tools: [{ ...node('community.inventory'), name: 'Inventory API' }] }),
			},
		});

		expect(getByText("Your agent won't really use Inventory API here.")).toBeInTheDocument();
	});

	it('uses the workflow name and a readable custom tool id when no alias exists', () => {
		const { getByText } = renderComponent({
			props: {
				projectId: 'project-1',
				config: config({
					tools: [
						{ type: 'workflow', workflow: 'Order management' },
						{ type: 'custom', id: 'send_invoice' },
					],
				}),
			},
		});

		expect(
			getByText("Your agent won't really use Order management or Send invoice here."),
		).toBeInTheDocument();
	});

	it('excludes built-in chat and channels without a connected credential', () => {
		const { getByText } = renderComponent({
			props: {
				projectId: 'project-1',
				config: config({
					integrations: [
						{ type: 'n8n_chat', credentialId: '' },
						{ type: 'slack', credentialId: '  ' },
					],
				}),
			},
		});

		expect(
			getByText("Your agent won't really message anyone or change anything here."),
		).toBeInTheDocument();
	});

	it('keeps the assurance readable when the integration catalog cannot load', async () => {
		ensureLoaded.mockRejectedValueOnce(new Error('Catalog unavailable'));
		const { getByText } = renderComponent({
			props: {
				projectId: 'project-1',
				config: config({ integrations: [{ type: 'discord', credentialId: 'discord-1' }] }),
			},
		});
		await flushPromises();

		expect(ensureLoaded).toHaveBeenCalledWith('project-1');
		expect(getByText("Your agent won't really use Discord here.")).toBeInTheDocument();
	});
});
