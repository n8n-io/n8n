import { mount } from '@vue/test-utils';

import AgentTestVariablesPanel from '../components/AgentTestVariablesPanel.vue';
import { useAgentTestVariables } from '../composables/useAgentTestVariables';
import type { AgentJsonConfig } from '../types';

vi.mock('@n8n/i18n', () => {
	const i18n = {
		baseText: (key: string, opts?: { interpolate?: Record<string, string> }) =>
			opts?.interpolate ? `${key}:${Object.values(opts.interpolate).join(',')}` : key,
	};
	return { useI18n: () => i18n, i18n, i18nInstance: { install: vi.fn() } };
});

function makeConfig(): AgentJsonConfig {
	return {
		tools: [
			{
				type: 'node',
				name: 'Fetch',
				node: {
					nodeParameters: { url: '={{ $json.base_url }}/{{ $json.token }}/{{ $json.expr }}' },
				},
				trustedMetadata: {
					base_url: { mode: 'fixed', value: 'https://a.test' },
					expr: { mode: 'expression', value: '={{ 1 }}' },
				},
			},
		],
	} as unknown as AgentJsonConfig;
}

let agentCounter = 0;
function render(config: AgentJsonConfig | null = makeConfig()) {
	const agentId = `agent-${agentCounter++}`;
	return { agentId, wrapper: mount(AgentTestVariablesPanel, { props: { agentId, config } }) };
}

describe('AgentTestVariablesPanel', () => {
	it('is hidden when the agent has no variables', () => {
		const { wrapper } = render({ tools: [] } as unknown as AgentJsonConfig);
		expect(wrapper.find('[data-testid="agent-test-values-panel"]').exists()).toBe(false);
	});

	it('is collapsed by default and expands on click', async () => {
		const { wrapper } = render();
		expect(wrapper.find('[data-testid="agent-test-values-content"]').exists()).toBe(false);
		await wrapper.find('[data-testid="agent-test-values-toggle"]').trigger('click');
		expect(wrapper.findAll('input')).toHaveLength(3);
	});

	it('uses the default or a required hint as placeholder', async () => {
		const { wrapper } = render();
		await wrapper.find('[data-testid="agent-test-values-toggle"]').trigger('click');
		const placeholders = wrapper.findAll('input').map((i) => i.attributes('placeholder'));
		expect(placeholders).toEqual([
			'agents.variables.test.placeholder.default:https://a.test',
			'agents.variables.test.placeholder.required',
			'agents.variables.test.placeholder.expression',
		]);
	});

	it('keeps typed values in the payload and drops empty ones', async () => {
		const { wrapper, agentId } = render();
		await wrapper.find('[data-testid="agent-test-values-toggle"]').trigger('click');
		const inputs = wrapper.findAll('input');
		await inputs[1].setValue('secret');
		await inputs[0].setValue('x');
		await inputs[0].setValue('');

		const { payload } = useAgentTestVariables(agentId, makeConfig());
		expect(payload.value).toEqual({ token: 'secret' });
	});

	it('does not read inherited object members for variables named like them (toString, valueOf)', async () => {
		const config = {
			tools: [
				{
					type: 'node',
					name: 'Fetch',
					node: { nodeParameters: { a: '={{ $json.valueOf }}/{{ $json.toString }}' } },
				},
			],
		} as unknown as AgentJsonConfig;
		const { wrapper, agentId } = render(config);
		await wrapper.find('[data-testid="agent-test-values-toggle"]').trigger('click');
		const inputs = wrapper.findAll('input');
		expect(inputs.map((i) => i.element.value)).toEqual(['', '']);
		expect(useAgentTestVariables(agentId, config).payload.value).toBeUndefined();

		await inputs[0].setValue('x');
		expect(useAgentTestVariables(agentId, config).payload.value).toEqual({ valueOf: 'x' });
		expect(wrapper.findAll('input')[1].element.value).toBe('');
	});

	it('has no payload when nothing is entered', () => {
		const { payload } = useAgentTestVariables('fresh-agent', makeConfig());
		expect(payload.value).toBeUndefined();
	});
});
