import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { N8nInputNumber, N8nSwitch2 } from '@n8n/design-system';
import { ElSlider } from 'element-plus';
import { describe, expect, it, vi } from 'vitest';

import AgentBudgetMonthlyModal from '../components/AgentBudgetMonthlyModal.vue';
import AgentBudgetSessionModal from '../components/AgentBudgetSessionModal.vue';
import type { AgentJsonConfig } from '../types';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string | number> }) => {
			if (key === 'agents.builder.budget.alert.percent') {
				return `${options?.interpolate?.percent}% of budget`;
			}
			return key;
		},
	}),
}));

const AgentModalStub = defineComponent({
	name: 'AgentModal',
	props: { open: Boolean, title: String, size: String },
	emits: ['update:open'],
	template: `<section v-if="open"><slot /><slot name="footerActions" /></section>`,
});

function config(): AgentJsonConfig {
	return {
		name: 'Agent',
		model: 'openai/gpt-4o-mini',
		instructions: 'You are a test agent',
		config: {
			reasoning: 'low',
			guardrails: {
				budget: {
					enabled: true,
					monthlyBudgetUsd: 200,
					sessionCostCapUsd: 5,
					alertThresholdPercent: 80,
				},
			},
		},
	};
}

describe('AgentBudgetMonthlyModal', () => {
	function mountModal() {
		return mount(AgentBudgetMonthlyModal, {
			props: { open: true, config: config() },
			global: { stubs: { AgentModal: AgentModalStub } },
		});
	}

	it('uses a slider that moves in steps of 10', () => {
		const wrapper = mountModal();
		const slider = wrapper.getComponent(ElSlider);
		expect(slider.props('min')).toBe(10);
		expect(slider.props('max')).toBe(100);
		expect(slider.props('step')).toBe(10);
		expect(slider.props('showStops')).toBe(true);
	});

	it('snaps a saved percent to the nearest step of 10', () => {
		const saved = config();
		saved.config!.guardrails!.budget!.alertThresholdPercent = 74;
		const wrapper = mount(AgentBudgetMonthlyModal, {
			props: { open: true, config: saved },
			global: { stubs: { AgentModal: AgentModalStub } },
		});
		expect(wrapper.getComponent(ElSlider).props('modelValue')).toBe(70);
	});

	it('drops a monthly budget of 0 and its alert', async () => {
		const wrapper = mountModal();
		wrapper.getComponent(N8nInputNumber).vm.$emit('update:modelValue', 0);
		await wrapper.get('[data-testid="agent-budget-monthly-save"]').trigger('click');

		const saved = wrapper.emitted('save')?.[0]?.[0] as Partial<AgentJsonConfig>;
		expect(saved.config?.guardrails?.budget).toEqual({
			enabled: true,
			sessionCostCapUsd: 5,
		});
	});

	it('turns the guardrail off when the only remaining amount is cleared', async () => {
		const withoutSessionCap = config();
		delete withoutSessionCap.config?.guardrails?.budget?.sessionCostCapUsd;
		const wrapper = mount(AgentBudgetMonthlyModal, {
			props: { open: true, config: withoutSessionCap },
			global: { stubs: { AgentModal: AgentModalStub } },
		});
		wrapper.getComponent(N8nInputNumber).vm.$emit('update:modelValue', undefined);
		await wrapper.get('[data-testid="agent-budget-monthly-save"]').trigger('click');

		const saved = wrapper.emitted('save')?.[0]?.[0] as Partial<AgentJsonConfig>;
		expect(saved.config?.guardrails?.budget).toEqual({ enabled: false });
	});

	it('omits the percent when the alert switch is off', async () => {
		const wrapper = mountModal();
		const toggle = wrapper.getComponent(N8nSwitch2);
		toggle.vm.$emit('update:modelValue', false);
		await wrapper.get('[data-testid="agent-budget-monthly-save"]').trigger('click');

		const saved = wrapper.emitted('save')?.[0]?.[0] as Partial<AgentJsonConfig>;
		expect(saved.config?.reasoning).toBe('low');
		expect(saved.config?.guardrails?.budget).toEqual({
			enabled: true,
			monthlyBudgetUsd: 200,
			sessionCostCapUsd: 5,
		});
		expect(saved.config?.guardrails?.budget?.alertThresholdPercent).toBeUndefined();
	});

	it('disables the amount, the alert controls, and Save while editing is locked', () => {
		const wrapper = mount(AgentBudgetMonthlyModal, {
			props: { open: true, config: config(), disabled: true },
			global: { stubs: { AgentModal: AgentModalStub } },
		});

		expect(wrapper.getComponent(N8nInputNumber).props('disabled')).toBe(true);
		expect(wrapper.getComponent(N8nSwitch2).props('disabled')).toBe(true);
		expect(wrapper.getComponent(ElSlider).props('disabled')).toBe(true);
		expect(
			wrapper.get('[data-testid="agent-budget-monthly-save"]').attributes('disabled'),
		).toBeDefined();
	});
});

describe('AgentBudgetSessionModal', () => {
	function mountModal() {
		return mount(AgentBudgetSessionModal, {
			props: { open: true, config: config() },
			global: { stubs: { AgentModal: AgentModalStub } },
		});
	}

	it('removes the cap when the amount is cleared', async () => {
		const wrapper = mountModal();
		wrapper.getComponent(N8nInputNumber).vm.$emit('update:modelValue', undefined);
		await wrapper.get('[data-testid="agent-budget-session-save"]').trigger('click');

		const saved = wrapper.emitted('save')?.[0]?.[0] as Partial<AgentJsonConfig>;
		expect(saved.config?.guardrails?.budget).toEqual({
			enabled: true,
			monthlyBudgetUsd: 200,
			alertThresholdPercent: 80,
		});
		expect(saved.config?.guardrails?.budget?.sessionCostCapUsd).toBeUndefined();
	});

	it('drops a cap of 0', async () => {
		const wrapper = mountModal();
		wrapper.getComponent(N8nInputNumber).vm.$emit('update:modelValue', 0);
		await wrapper.get('[data-testid="agent-budget-session-save"]').trigger('click');

		const saved = wrapper.emitted('save')?.[0]?.[0] as Partial<AgentJsonConfig>;
		expect(saved.config?.guardrails?.budget?.sessionCostCapUsd).toBeUndefined();
		expect(saved.config?.guardrails?.budget?.monthlyBudgetUsd).toBe(200);
		expect(saved.config?.guardrails?.budget?.enabled).toBe(true);
	});

	it('disables the amount and Save while editing is locked', () => {
		const wrapper = mount(AgentBudgetSessionModal, {
			props: { open: true, config: config(), disabled: true },
			global: { stubs: { AgentModal: AgentModalStub } },
		});

		expect(wrapper.getComponent(N8nInputNumber).props('disabled')).toBe(true);
		expect(
			wrapper.get('[data-testid="agent-budget-session-save"]').attributes('disabled'),
		).toBeDefined();
	});
});
