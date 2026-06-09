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

// Numeric/thinking sub-controls debounce — execute synchronously in the test.
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
		template:
			'<select v-bind="$attrs" :value="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /></select>',
	},
	N8nOption: { props: ['value', 'label'], template: '<option :value="value">{{ label }}</option>' },
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

function emitSelectValue(wrapper: ReturnType<typeof mount>, testId: string, value: string) {
	const select = wrapper.findComponent(`[data-testid="${testId}"]`) as unknown as {
		vm: { $emit: (event: 'update:modelValue', value: string) => void };
	};
	select.vm.$emit('update:modelValue', value);
}

function findStubComponent(wrapper: ReturnType<typeof mount>, testId: string) {
	return wrapper.findComponent(`[data-testid="${testId}"]`) as unknown as {
		exists: () => boolean;
		props: (name: string) => unknown;
	};
}

type WebSearchConfig = {
	enabled: boolean;
	provider?: string;
	credential?: string;
};

function getWebSearchConfig(changes: Partial<AgentJsonConfig>): WebSearchConfig | undefined {
	return (
		changes.config as
			| (NonNullable<AgentJsonConfig['config']> & { webSearch?: WebSearchConfig })
			| undefined
	)?.webSearch;
}

describe('AgentAdvancedPanel', () => {
	it('treats sparse native web search config as disabled', async () => {
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config: makeConfig() },
			global: { stubs: globalStubs },
		});

		const method = findStubComponent(wrapper, 'agent-web-search-method');
		expect(method.exists()).toBe(true);
		expect(method.props('modelValue')).toBe('off');

		emitSelectValue(wrapper, 'agent-web-search-method', 'native');
		await nextTick();
		const events = wrapper.emitted('update:config') ?? [];
		const last = events[events.length - 1][0] as Partial<AgentJsonConfig>;
		expect(getWebSearchConfig(last)).toEqual({ enabled: true, provider: 'native' });
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

		emitSelectValue(wrapper, 'agent-web-search-method', 'off');
		await nextTick();

		const events = wrapper.emitted('update:config') ?? [];
		const last = events[events.length - 1][0] as Partial<AgentJsonConfig>;
		expect(getWebSearchConfig(last)).toEqual({ enabled: false });
		expect(last.providerTools).toEqual({ 'openai.image_generation': {} });
	});

	it('enables fallback web search for providers without native web search', async () => {
		const config = makeConfig({ model: 'deepseek/deepseek-chat' });
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config },
			global: { stubs: globalStubs },
		});

		emitSelectValue(wrapper, 'agent-web-search-method', 'brave');
		await nextTick();

		const events = wrapper.emitted('update:config') ?? [];
		const last = events[events.length - 1][0] as Partial<AgentJsonConfig>;
		expect(getWebSearchConfig(last)).toEqual({ enabled: true, provider: 'brave' });
	});

	it('keeps fallback controls visible on native-capable models', async () => {
		const config = makeConfig({
			config: { webSearch: { enabled: true, provider: 'brave', credential: 'brave-1' } },
			providerTools: { 'anthropic.web_search': { maxUses: 5 } },
		} as Partial<AgentJsonConfig>);
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config },
			global: { stubs: globalStubs },
		});

		expect(wrapper.find('[data-testid="agent-web-search-method"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-web-search-fallback-credential"]').exists()).toBe(
			true,
		);
		expect(wrapper.find('[data-testid="agent-web-search-max-uses"]').exists()).toBe(false);
	});

	it('switches fallback web search to native and emits native provider tools', async () => {
		const config = makeConfig({
			config: { webSearch: { enabled: true, provider: 'brave', credential: 'brave-1' } },
		} as Partial<AgentJsonConfig>);
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config },
			global: { stubs: globalStubs },
		});

		emitSelectValue(wrapper, 'agent-web-search-method', 'native');
		await nextTick();

		const events = wrapper.emitted('update:config') ?? [];
		const last = events[events.length - 1][0] as Partial<AgentJsonConfig>;
		expect(getWebSearchConfig(last)).toEqual({ enabled: true, provider: 'native' });
		expect(last.providerTools).toEqual({ 'anthropic.web_search': { maxUses: 5 } });
	});

	it('preserves fallback web search credential when switching away and back to the same fallback provider', async () => {
		const config = makeConfig({
			config: { webSearch: { enabled: true, provider: 'brave', credential: 'brave-1' } },
		} as Partial<AgentJsonConfig>);
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config },
			global: { stubs: globalStubs },
		});

		emitSelectValue(wrapper, 'agent-web-search-method', 'native');
		await nextTick();
		emitSelectValue(wrapper, 'agent-web-search-method', 'brave');
		await nextTick();

		const events = wrapper.emitted('update:config') ?? [];
		const last = events[events.length - 1][0] as Partial<AgentJsonConfig>;
		expect(getWebSearchConfig(last)).toEqual({
			enabled: true,
			provider: 'brave',
			credential: 'brave-1',
		});
	});

	it('clears fallback web search credential when switching fallback providers', async () => {
		const config = makeConfig({
			config: { webSearch: { enabled: true, provider: 'brave', credential: 'brave-1' } },
		} as Partial<AgentJsonConfig>);
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config },
			global: { stubs: globalStubs },
		});

		emitSelectValue(wrapper, 'agent-web-search-method', 'searxng');
		await nextTick();

		const events = wrapper.emitted('update:config') ?? [];
		const last = events[events.length - 1][0] as Partial<AgentJsonConfig>;
		expect(getWebSearchConfig(last)).toEqual({ enabled: true, provider: 'searxng' });
	});

	it('switches native web search to fallback and strips native provider tools', async () => {
		const config = makeConfig({
			config: { webSearch: { enabled: true, provider: 'native' } },
			providerTools: {
				'anthropic.web_search': { maxUses: 5 },
				'openai.image_generation': {},
			},
		} as Partial<AgentJsonConfig>);
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config },
			global: { stubs: globalStubs },
		});

		emitSelectValue(wrapper, 'agent-web-search-method', 'brave');
		await nextTick();

		const events = wrapper.emitted('update:config') ?? [];
		const last = events[events.length - 1][0] as Partial<AgentJsonConfig>;
		expect(getWebSearchConfig(last)).toEqual({ enabled: true, provider: 'brave' });
		expect(last.providerTools).toEqual({ 'openai.image_generation': {} });
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
		const webSearchMethod = findStubComponent(wrapper, 'agent-web-search-method');
		expect(webSearchMethod.props('disabled')).toBe(true);
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

	it('initialises max-iterations input to the default when unset in config', () => {
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config: makeConfig() },
			global: { stubs: globalStubs },
		});
		const input = wrapper.find('[data-testid="agent-max-iterations-input"]');
		expect(Number(input.element.getAttribute('value'))).toBe(30);
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
