import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import AgentBudgetNoticeCard from '../components/AgentBudgetNoticeCard.vue';

const openTopUpMock = vi.fn();
vi.mock('@/app/composables/useAiGatewayTopUp', () => ({
	useAiGatewayTopUp: () => ({ openTopUp: openTopUpMock }),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) =>
			({
				'agents.chat.budget.notNow': 'Not now',
				'agents.chat.budget.increase': 'Increase cap',
				'agents.chat.budget.monthly.title': "You've reached your monthly budget.",
				'agents.chat.budget.monthly.message':
					'This agent has reached its monthly budget. Increase the cap to keep it running this month.',
				'agents.chat.budget.monthly.dismissed':
					'You can increase the monthly cap at any time from Settings.',
				'agents.chat.budget.session.title': "You've reached your session cost cap.",
				'agents.chat.budget.session.message':
					'This session reached its cost cap before finishing. Increase the cap to keep it going.',
				'agents.chat.budget.alert.title': "You're getting close to your monthly budget.",
				'agents.chat.budget.alert.message':
					'This agent is approaching its monthly budget. It can keep running for now.',
				'agents.chat.budget.credits.title': 'Your Gateway credits are empty.',
				'agents.chat.budget.credits.message':
					'This agent stopped because the shared Gateway credits balance is empty. Top up to keep it running.',
				'agents.chat.budget.credits.dismissed':
					'The chat resumes once the new balance is detected.',
				'agents.chat.budget.credits.topUp': 'Top up',
			})[key] ?? key,
	}),
}));

const N8nInputNumber = defineComponent({
	name: 'N8nInputNumber',
	props: { modelValue: Number },
	emits: ['update:modelValue'],
	template: '<input />',
});

describe('AgentBudgetNoticeCard', () => {
	function mountCard(
		code: 'budget.monthly' | 'budget.session' | 'budget.alert' | 'budget.credits',
		props: { canIncrease?: boolean; pending?: boolean } = {},
	) {
		return mount(AgentBudgetNoticeCard, {
			props: { code, canIncrease: true, ...props },
			global: { stubs: { N8nInputNumber } },
		});
	}

	it('renders the monthly stop copy', () => {
		const wrapper = mountCard('budget.monthly');
		expect(wrapper.text()).toContain("You've reached your monthly budget.");
		expect(wrapper.text()).toContain(
			'This agent has reached its monthly budget. Increase the cap to keep it running this month.',
		);
	});

	it('renders the session stop copy', () => {
		const wrapper = mountCard('budget.session');
		expect(wrapper.text()).toContain("You've reached your session cost cap.");
		expect(wrapper.text()).toContain(
			'This session reached its cost cap before finishing. Increase the cap to keep it going.',
		);
	});

	it('renders the approaching copy', () => {
		const wrapper = mountCard('budget.alert');
		expect(wrapper.text()).toContain("You're getting close to your monthly budget.");
		expect(wrapper.text()).toContain(
			'This agent is approaching its monthly budget. It can keep running for now.',
		);
	});

	it('shows the follow-up sentence and does not save on Not now', async () => {
		const wrapper = mountCard('budget.monthly');
		await wrapper.get('[data-testid="agent-budget-notice-not-now"]').trigger('click');
		expect(wrapper.text()).toContain('You can increase the monthly cap at any time from Settings.');
		expect(wrapper.emitted('increase')).toBeUndefined();
	});

	it('emits the new amount from Increase cap and stays visible until the parent clears it', async () => {
		const wrapper = mountCard('budget.session');
		wrapper.getComponent({ name: 'N8nInputNumber' }).vm.$emit('update:modelValue', 12);
		await wrapper.get('[data-testid="agent-budget-notice-increase"]').trigger('click');
		expect(wrapper.emitted('increase')?.[0]).toEqual([{ field: 'sessionCostCapUsd', amount: 12 }]);
		expect(wrapper.find('[data-testid="agent-budget-notice-card"]').exists()).toBe(true);
	});

	it('does not emit when the amount is empty', async () => {
		const wrapper = mountCard('budget.monthly');
		await wrapper.get('[data-testid="agent-budget-notice-increase"]').trigger('click');
		expect(wrapper.emitted('increase')).toBeUndefined();
	});

	it('hides the amount input and Increase cap when the user cannot edit the agent', () => {
		const wrapper = mountCard('budget.session', { canIncrease: false });
		expect(wrapper.find('[data-testid="agent-budget-notice-amount"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-budget-notice-increase"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-budget-notice-not-now"]').exists()).toBe(true);
	});

	it('does not emit while a save is pending', async () => {
		const wrapper = mountCard('budget.session', { pending: true });
		wrapper.getComponent({ name: 'N8nInputNumber' }).vm.$emit('update:modelValue', 12);
		await wrapper.get('[data-testid="agent-budget-notice-increase"]').trigger('click');
		expect(wrapper.emitted('increase')).toBeUndefined();
	});

	it('renders the credits stop with a top-up action and no cap input', () => {
		const wrapper = mountCard('budget.credits');
		expect(wrapper.text()).toContain('Your Gateway credits are empty.');
		expect(wrapper.text()).toContain(
			'This agent stopped because the shared Gateway credits balance is empty. Top up to keep it running.',
		);
		expect(wrapper.find('[data-testid="agent-budget-notice-amount"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-budget-notice-increase"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-budget-notice-top-up"]').exists()).toBe(true);
	});

	it('opens the top-up flow from the credits card and stays actionable', async () => {
		openTopUpMock.mockResolvedValue(undefined);
		const wrapper = mountCard('budget.credits');
		await wrapper.get('[data-testid="agent-budget-notice-top-up"]').trigger('click');
		expect(openTopUpMock).toHaveBeenCalledWith({ source: 'agent_budget_card' });
		// The click only requests the top-up — the card keeps its action until
		// the wallet refresh confirms the balance changed.
		expect(wrapper.find('[data-testid="agent-budget-notice-top-up"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-budget-notice-dismissed"]').exists()).toBe(false);
		expect(wrapper.emitted('increase')).toBeUndefined();
	});
});
