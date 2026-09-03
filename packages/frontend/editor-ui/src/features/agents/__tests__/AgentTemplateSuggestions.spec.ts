/* eslint-disable import-x/no-extraneous-dependencies -- test-only Vue mounting */
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));

vi.mock('@n8n/design-system', () => ({
	N8nIcon: { template: '<i v-bind="$attrs" :data-icon="icon" />', props: ['icon', 'size'] },
}));

describe('AgentTemplateSuggestions', () => {
	async function mountSuggestions() {
		const { default: AgentTemplateSuggestions } = await import(
			'../components/AgentTemplateSuggestions.vue'
		);

		return mount(AgentTemplateSuggestions);
	}

	it('renders a button for each defined template', async () => {
		const wrapper = await mountSuggestions();

		const buttons = wrapper.findAll('[data-testid^="agent-template-"]');

		expect(buttons.length).toBe(4);
	});

	it('renders the heading and subtitle text', async () => {
		const wrapper = await mountSuggestions();

		expect(wrapper.find('[data-testid="agent-template-suggestions"]').exists()).toBe(true);
		expect(wrapper.text()).toContain('agents.builder.templates.heading');
		expect(wrapper.text()).toContain('agents.builder.templates.subtitle');
	});

	it('emits a select event with the template when a button is clicked', async () => {
		const wrapper = await mountSuggestions();

		await wrapper.find('[data-testid="agent-template-customer-support"]').trigger('click');

		const events = wrapper.emitted('select');
		expect(events).toHaveLength(1);
		expect(events![0]).toHaveLength(1);
		expect(events![0][0] as { id: string }).toMatchObject({ id: 'customer-support' });
	});

	it('includes a connected trigger on the customer support template', async () => {
		const { AGENT_TEMPLATES } = await import('../agentTemplates');

		const support = AGENT_TEMPLATES.find((t) => t.id === 'customer-support');
		expect(support?.connectedTriggers).toContain('telegram');
	});

	it('includes credential-free tools on the research assistant template', async () => {
		const { AGENT_TEMPLATES } = await import('../agentTemplates');

		const research = AGENT_TEMPLATES.find((t) => t.id === 'research-assistant');
		const tools = research?.config.tools ?? [];
		const nodeTypes = tools
			.filter((t) => 'node' in t && t.type === 'node')
			.map((t) => (t as { node: { nodeType: string } }).node.nodeType);

		expect(nodeTypes).toContain('@n8n/n8n-nodes-langchain.toolWikipedia');
		expect(nodeTypes).toContain('@n8n/n8n-nodes-langchain.toolCalculator');
		// The research tools must not require credentials.
		expect(research?.config.credential).toBeUndefined();
	});
});
