import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentBudgetMonthlyModal from '../components/AgentBudgetMonthlyModal.vue';
import AgentBudgetPanel from '../components/AgentBudgetPanel.vue';
import AgentBudgetSessionModal from '../components/AgentBudgetSessionModal.vue';
import type { AgentJsonConfig } from '../types';

const getAgentBudgetSpend = vi.hoisted(() => vi.fn());

vi.mock('../composables/useAgentApi', () => ({
	getAgentBudgetSpend,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '' } }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string | number> }) => {
			const copy: Record<string, string> = {
				'agents.builder.budget.title': 'Usage and limits',
				'agents.builder.budget.notSet': 'Not set',
				'agents.builder.budget.usage.none': 'No monthly budget',
				'agents.builder.budget.usage.unavailable': 'Usage unavailable',
				'agents.builder.budget.usage.spent': '{spent} of {budget} used',
				'agents.builder.budget.monthly.value': '{amount}/month',
				'agents.builder.budget.monthly.alert': 'Alert at {percent}%',
			};
			const template = copy[key] ?? key;
			const values = options?.interpolate ?? {};
			return template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
		},
	}),
}));

function config(budget?: AgentJsonConfig['config']): AgentJsonConfig {
	return {
		name: 'Agent',
		model: 'openai/gpt-4o-mini',
		instructions: 'You are a test agent',
		...(budget ? { config: budget } : {}),
	};
}

describe('AgentBudgetPanel', () => {
	it('shows Not set when no budget is saved', async () => {
		getAgentBudgetSpend.mockReset();
		const wrapper = mount(AgentBudgetPanel, {
			props: { config: config(), projectId: 'project-1', agentId: 'agent-1' },
		});
		await flushPromises();

		expect(wrapper.text()).toContain('Not set');
		expect(wrapper.text()).toContain('No monthly budget');
		expect(getAgentBudgetSpend).not.toHaveBeenCalled();
	});

	it('shows the saved amounts and the alert percent', async () => {
		getAgentBudgetSpend.mockReset().mockResolvedValue({ spentUsd: 42 });
		const wrapper = mount(AgentBudgetPanel, {
			props: {
				config: config({
					guardrails: {
						budget: {
							enabled: true,
							monthlyBudgetUsd: 200,
							sessionCostCapUsd: 5,
							alertThresholdPercent: 80,
						},
					},
				}),
				projectId: 'project-1',
				agentId: 'agent-1',
			},
			global: {
				stubs: {
					I18nT: {
						template: '<span><slot name="spent" /> of <slot name="budget" /> used</span>',
					},
				},
			},
		});
		await flushPromises();

		expect(wrapper.text()).toContain('$42 of $200 used');
		expect(wrapper.text()).toContain('$200/month');
		expect(wrapper.text()).toContain('Alert at 80%');
		expect(wrapper.text()).toContain('$5');
	});

	it('shows Usage unavailable when the spend read fails', async () => {
		getAgentBudgetSpend.mockReset().mockRejectedValue(new Error('read failed'));
		const wrapper = mount(AgentBudgetPanel, {
			props: {
				config: config({
					guardrails: {
						budget: {
							enabled: true,
							monthlyBudgetUsd: 200,
						},
					},
				}),
				projectId: 'project-1',
				agentId: 'agent-1',
			},
		});
		await flushPromises();

		expect(wrapper.text()).toContain('Usage unavailable');
		expect(wrapper.text()).not.toContain('used');
	});

	it('opens the matching modal from each row', async () => {
		getAgentBudgetSpend.mockReset();
		const wrapper = mount(AgentBudgetPanel, {
			props: { config: config(), projectId: 'project-1', agentId: 'agent-1' },
		});

		await wrapper.get('[data-testid="agent-budget-monthly-row"]').trigger('click');
		expect(wrapper.getComponent(AgentBudgetMonthlyModal).props('open')).toBe(true);

		await wrapper.get('[data-testid="agent-budget-session-row"]').trigger('click');
		expect(wrapper.getComponent(AgentBudgetSessionModal).props('open')).toBe(true);
	});

	it('keeps an open modal view-only when editing becomes locked', async () => {
		getAgentBudgetSpend.mockReset();
		const wrapper = mount(AgentBudgetPanel, {
			props: { config: config(), projectId: 'project-1', agentId: 'agent-1' },
		});

		await wrapper.get('[data-testid="agent-budget-session-row"]').trigger('click');
		expect(wrapper.getComponent(AgentBudgetSessionModal).props('disabled')).toBe(false);

		await wrapper.setProps({ disabled: true });
		expect(wrapper.getComponent(AgentBudgetSessionModal).props('disabled')).toBe(true);
		expect(wrapper.getComponent(AgentBudgetMonthlyModal).props('disabled')).toBe(true);
	});

	it('keeps the panel heading visually hidden but accessible', async () => {
		getAgentBudgetSpend.mockReset();
		const wrapper = mount(AgentBudgetPanel, {
			props: { config: config(), projectId: 'project-1', agentId: 'agent-1' },
		});
		await flushPromises();

		const heading = wrapper.get('h3');
		expect(heading.text()).toBe('Usage and limits');
		expect(heading.attributes('style')).toContain('clip');
		const section = wrapper.get('[data-testid="agent-budget-panel"]');
		expect(section.attributes('aria-labelledby')).toBe(heading.attributes('id'));
	});

	it('applies the disabled styling to the panel body only when disabled', async () => {
		getAgentBudgetSpend.mockReset();
		const wrapper = mount(AgentBudgetPanel, {
			props: { config: config(), projectId: 'project-1', agentId: 'agent-1' },
		});
		await flushPromises();

		const body = () => wrapper.get('[data-testid="agent-budget-usage"]').element.parentElement;
		expect(body()?.classList.contains('disabled')).toBe(false);

		await wrapper.setProps({ disabled: true });
		expect(body()?.classList.contains('disabled')).toBe(true);
	});
});
