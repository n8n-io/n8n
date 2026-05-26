/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import type * as VueUse from '@vueuse/core';

import AgentAdvancedPanel from '../components/AgentAdvancedPanel.vue';
import type { AgentJsonConfig } from '../types';

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (k: string) => k }),
}));

// Sub-control flips depend on debouncing — execute synchronously in the test.
vi.mock('@vueuse/core', async (importOriginal) => {
	const actual = await importOriginal<typeof VueUse>();
	return {
		...actual,
		useDebounceFn: (fn: (...args: unknown[]) => unknown) => fn,
	};
});

const globalStubs = {
	N8nCollapsiblePanel: {
		props: ['modelValue', 'title', 'disabled'],
		emits: ['update:modelValue'],
		template: `
			<section>
				<button :disabled="disabled" @click="$emit('update:modelValue', !modelValue)">
					{{ title }}
				</button>
				<div v-show="modelValue"><slot /></div>
			</section>
		`,
	},
	N8nText: { template: '<span><slot /></span>' },
	N8nTooltip: { template: '<div><slot /></div>' },
	N8nInputNumber2: {
		props: ['modelValue', 'disabled', 'min', 'max', 'precision', 'placeholder'],
		emits: ['update:modelValue'],
		template:
			'<input :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
	},
	N8nSelect: {
		props: ['modelValue', 'disabled'],
		emits: ['update:modelValue'],
		template: '<select :disabled="disabled"><slot /></select>',
	},
	N8nOption: { template: '<option><slot /></option>' },
	N8nSwitch2: {
		props: ['modelValue', 'disabled'],
		emits: ['update:modelValue'],
		template:
			'<button :disabled="disabled" :data-checked="modelValue" @click="$emit(\'update:modelValue\', !modelValue)" />',
	},
};

function makeConfig(overrides: Partial<AgentJsonConfig> = {}): AgentJsonConfig {
	return {
		name: 'A',
		instructions: 'i',
		model: 'anthropic/claude-sonnet-4-6',
		credential: 'c',
		...overrides,
	} as AgentJsonConfig;
}

describe('AgentAdvancedPanel', () => {
	it('shows the budget-tokens sub-control for Anthropic when thinking is on', async () => {
		const config = makeConfig({
			config: { thinking: { provider: 'anthropic', budgetTokens: 1024 } },
		} as Partial<AgentJsonConfig>);
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config },
			global: { stubs: globalStubs },
		});
		await nextTick();
		expect(wrapper.find('[data-testid="agent-budget-tokens-input"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-reasoning-effort-select"]').exists()).toBe(false);
	});

	it('shows the reasoning-effort sub-control for OpenAI when thinking is on', async () => {
		const config = makeConfig({
			model: 'openai/gpt-4o',
			config: { thinking: { provider: 'openai', reasoningEffort: 'high' } },
		} as Partial<AgentJsonConfig>);
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config },
			global: { stubs: globalStubs },
		});
		await nextTick();
		expect(wrapper.find('[data-testid="agent-reasoning-effort-select"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-budget-tokens-input"]').exists()).toBe(false);
	});

	it('disables the thinking toggle for providers that do not support it', () => {
		const config = makeConfig({ model: 'google/gemini-pro' });
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config },
			global: { stubs: globalStubs },
		});
		const toggle = wrapper.find('[data-testid="agent-thinking-toggle"]');
		expect(toggle.exists()).toBe(true);
		expect(toggle.attributes('disabled')).toBeDefined();
	});

	it('emits update:config with the thinking subtree when the toggle flips on', async () => {
		const config = makeConfig();
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config },
			global: { stubs: globalStubs },
		});
		await wrapper.find('[data-testid="agent-thinking-toggle"]').trigger('click');
		const events = wrapper.emitted('update:config') ?? [];
		expect(events.length).toBeGreaterThan(0);
		const last = events[events.length - 1][0] as Partial<AgentJsonConfig>;
		expect((last.config as { thinking: { provider: string } }).thinking.provider).toBe('anthropic');
	});

	it('disables every control when the disabled prop is true', () => {
		const config = makeConfig();
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config, disabled: true },
			global: { stubs: globalStubs },
		});
		expect(
			wrapper.find('[data-testid="agent-thinking-toggle"]').attributes('disabled'),
		).toBeDefined();
		expect(
			wrapper.find('[data-testid="agent-concurrency-input"]').attributes('disabled'),
		).toBeDefined();
		expect(
			wrapper.find('[data-testid="agent-max-iterations-input"]').attributes('disabled'),
		).toBeDefined();
	});

	it('renders the max-iterations input', () => {
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config: makeConfig() },
			global: { stubs: globalStubs },
		});
		expect(wrapper.find('[data-testid="agent-max-iterations-input"]').exists()).toBe(true);
	});

	it('initialises max-iterations input from config', () => {
		const config = makeConfig({ config: { maxIterations: 42 } } as Partial<AgentJsonConfig>);
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config },
			global: { stubs: globalStubs },
		});
		const input = wrapper.find('[data-testid="agent-max-iterations-input"]');
		expect(Number(input.element.getAttribute('value'))).toBe(42);
	});

	it('emits update:config with maxIterations when the field changes', async () => {
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config: makeConfig() },
			global: { stubs: globalStubs },
		});
		const input = wrapper.find('[data-testid="agent-max-iterations-input"]');
		await input.setValue('15');
		const events = wrapper.emitted('update:config') ?? [];
		expect(events.length).toBeGreaterThan(0);
		const last = events[events.length - 1][0] as Partial<AgentJsonConfig>;
		expect(last.config?.maxIterations).toBe(15);
	});

	it('removes maxIterations from config when the field is cleared (NaN)', async () => {
		const config = makeConfig({ config: { maxIterations: 10 } } as Partial<AgentJsonConfig>);
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config },
			global: { stubs: globalStubs },
		});
		const input = wrapper.find('[data-testid="agent-max-iterations-input"]');
		// Non-numeric input produces NaN — treated as "clear" → key removed from config
		await input.setValue('abc');
		const events = wrapper.emitted('update:config') ?? [];
		expect(events.length).toBeGreaterThan(0);
		const last = events[events.length - 1][0] as Partial<AgentJsonConfig>;
		expect(last.config).not.toHaveProperty('maxIterations');
	});

	it('emits update:config with toolCallConcurrency when the concurrency field changes', async () => {
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config: makeConfig() },
			global: { stubs: globalStubs },
		});
		const input = wrapper.find('[data-testid="agent-concurrency-input"]');
		await input.setValue('5');
		const events = wrapper.emitted('update:config') ?? [];
		expect(events.length).toBeGreaterThan(0);
		const last = events[events.length - 1][0] as Partial<AgentJsonConfig>;
		expect(last.config?.toolCallConcurrency).toBe(5);
	});
});
