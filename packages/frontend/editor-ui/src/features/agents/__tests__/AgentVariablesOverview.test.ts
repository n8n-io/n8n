import { mount } from '@vue/test-utils';
import { collectAgentVariables } from '@n8n/api-types';

import AgentVariablesOverview from '../components/AgentVariablesOverview.vue';

vi.mock('@n8n/i18n', () => {
	const i18n = { baseText: (key: string) => key };
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

const tools = [
	{
		type: 'node',
		name: 'Fetch',
		node: { nodeParameters: { url: '={{ $json.base_url }}/{{ $json.region }}' } },
		trustedMetadata: { base_url: { mode: 'fixed', value: 'https://a.test' } },
	},
	{
		type: 'node',
		name: 'Post',
		node: { nodeParameters: { body: '={{ $json.region }}' } },
		trustedMetadata: { region: { mode: 'expression', value: '={{ 1 }}' } },
	},
] as Parameters<typeof collectAgentVariables>[0];

function render(variables = collectAgentVariables(tools)) {
	return mount(AgentVariablesOverview, { props: { variables } });
}

describe('AgentVariablesOverview', () => {
	it('renders one row per variable with its name', () => {
		const wrapper = render();
		const names = wrapper.findAll('[data-testid="agent-variable-name"]').map((n) => n.text());
		expect(names).toEqual(['base_url', 'region']);
	});

	it('shows the default value for a variable with a fixed default', () => {
		const row = render().findAll('[data-testid="agent-variable-row"]')[0];
		expect(row.text()).toContain('agents.variables.status.hasDefault');
		expect(row.find('[data-testid="agent-variable-default"]').text()).toBe('https://a.test');
	});

	it('shows "expression" for an expression default and lists every reading tool', () => {
		const row = render().findAll('[data-testid="agent-variable-row"]')[1];
		expect(row.find('[data-testid="agent-variable-default"]').text()).toBe(
			'agents.variables.default.expression',
		);
		const toolNames = row.findAll('[data-testid="agent-variable-tool"]').map((t) => t.text());
		expect(toolNames).toEqual(['Fetch', 'Post']);
	});

	it('treats an empty fixed default as no default', () => {
		const wrapper = render([
			{ name: 'token', tools: ['Fetch'], default: { mode: 'fixed', value: '' } },
		]);
		const status = wrapper.find('[data-testid="agent-variable-status"]');
		expect(status.text()).toContain('agents.variables.status.noDefault');
		expect(wrapper.find('[data-testid="agent-variable-default"]').exists()).toBe(false);
	});

	it('flags a variable without a default', () => {
		const wrapper = render([{ name: 'token', tools: ['Fetch'] }]);
		const status = wrapper.find('[data-testid="agent-variable-status"]');
		expect(status.text()).toContain('agents.variables.status.noDefault');
		expect(status.text()).toContain('agents.variables.noDefault.hint');
	});

	it('emits open-tool when a tool name is clicked', async () => {
		const wrapper = render();
		await wrapper.findAll('[data-testid="agent-variable-tool"]')[0].trigger('click');
		expect(wrapper.emitted('open-tool')?.[0]).toEqual([
			{ kind: 'tool', toolType: 'node', id: 'Fetch' },
		]);
	});
});
