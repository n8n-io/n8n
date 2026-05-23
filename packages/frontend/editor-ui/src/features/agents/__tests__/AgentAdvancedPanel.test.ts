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

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		allCredentials: [
			{ id: 'brave-1', name: 'Brave Key', type: 'braveSearchApi' },
			{ id: 'searxng-1', name: 'SearXNG', type: 'searXngApi' },
		],
	}),
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
	N8nInput: {
		props: ['modelValue', 'disabled'],
		emits: ['update:modelValue'],
		template:
			'<input :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
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
	it('treats sparse native web search config as disabled', async () => {
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config: makeConfig() },
			global: { stubs: globalStubs },
		});

		const toggle = wrapper.find('[data-testid="agent-web-search-toggle"]');
		expect(toggle.exists()).toBe(true);
		expect(toggle.attributes('disabled')).toBeUndefined();

		await toggle.trigger('click');
		const events = wrapper.emitted('update:config') ?? [];
		const last = events[events.length - 1][0] as Partial<AgentJsonConfig>;
		expect(last.config?.webSearch).toEqual({ enabled: true });
		expect(last.providerTools).toEqual({ 'anthropic.web_search': { maxUses: 5 } });
	});

	it('emits provider-specific web search options', async () => {
		const config = makeConfig({
			model: 'openai/gpt-5',
			config: { webSearch: { enabled: true } },
			providerTools: { 'openai.web_search': {} },
		} as Partial<AgentJsonConfig>);
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config },
			global: { stubs: globalStubs },
		});

		await wrapper.find('[data-testid="agent-web-search-external-access"]').trigger('click');

		const events = wrapper.emitted('update:config') ?? [];
		const last = events[events.length - 1][0] as Partial<AgentJsonConfig>;
		expect(last.providerTools).toEqual({
			'openai.web_search': {
				externalWebAccess: false,
				searchContextSize: 'medium',
			},
		});
	});

	it('strips native web search provider tools when native web search is disabled', async () => {
		const config = makeConfig({
			config: { webSearch: { enabled: true } },
			providerTools: {
				'anthropic.web_search': { maxUses: 5 },
				'openai.image_generation': {},
			},
		} as Partial<AgentJsonConfig>);
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config },
			global: { stubs: globalStubs },
		});

		await wrapper.find('[data-testid="agent-web-search-toggle"]').trigger('click');

		const events = wrapper.emitted('update:config') ?? [];
		const last = events[events.length - 1][0] as Partial<AgentJsonConfig>;
		expect(last.config?.webSearch).toEqual({ enabled: false });
		expect(last.providerTools).toEqual({ 'openai.image_generation': {} });
	});

	it('enables fallback web search for providers without native web search', async () => {
		const config = makeConfig({ model: 'deepseek/deepseek-chat' });
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config },
			global: { stubs: globalStubs },
		});

		const toggle = wrapper.find('[data-testid="agent-web-search-toggle"]');
		expect(toggle.exists()).toBe(true);
		expect(toggle.attributes('disabled')).toBeUndefined();

		await toggle.trigger('click');

		const events = wrapper.emitted('update:config') ?? [];
		const last = events[events.length - 1][0] as Partial<AgentJsonConfig>;
		expect(last.config?.webSearch).toEqual({ enabled: true, provider: 'brave' });
	});

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
		const webSearchToggle = wrapper.find('[data-testid="agent-web-search-toggle"]');
		expect(webSearchToggle.attributes('disabled')).toBeDefined();
		const toggle = wrapper.find('[data-testid="agent-thinking-toggle"]');
		expect(toggle.attributes('disabled')).toBeDefined();
		const concurrency = wrapper.find('[data-testid="agent-concurrency-input"]');
		expect(concurrency.attributes('disabled')).toBeDefined();
	});
});
