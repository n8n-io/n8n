/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import type * as VueUse from '@vueuse/core';

import AgentAdvancedPanel from '../components/AgentAdvancedPanel.vue';
import type { ProviderCatalog } from '../composables/useAgentApi';
import type { AgentJsonConfig } from '../types';

const ensureLoadedMock = vi.fn();
const modelCatalog = ref<ProviderCatalog>({});

vi.mock('../composables/useModelCatalog', () => ({
	useModelCatalog: () => ({
		catalog: modelCatalog,
		ensureLoaded: ensureLoadedMock,
	}),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) =>
			({
				'agents.builder.advanced.reasoning.hint': 'Let the model reason before responding.',
				'agents.builder.advanced.reasoning.unsupportedHint':
					'This model does not support reasoning',
				'agents.builder.advanced.reasoning.noModelHint': 'No model selected',
			})[key] ?? key,
	}),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		allCredentials: [
			{ id: 'brave-1', name: 'Brave Key', type: 'braveSearchApi' },
			{ id: 'searxng-1', name: 'SearXNG', type: 'searXngApi' },
		],
	}),
}));

// Numeric/reasoning sub-controls debounce — execute synchronously in the test.
vi.mock('@vueuse/core', async (importOriginal) => {
	const actual = await importOriginal<typeof VueUse>();
	return {
		...actual,
		useDebounceFn: (fn: (...args: unknown[]) => unknown) => fn,
	};
});

const globalStubs = {
	N8nIcon: { template: '<span v-bind="$attrs" />', props: ['icon', 'size'] },
	N8nText: { template: '<span><slot /></span>' },
	N8nInputNumber: {
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
	N8nOption: {
		name: 'N8nOption',
		props: ['value', 'label'],
		template: '<option :value="value">{{ label }}</option>',
	},
	Option: {
		props: ['value', 'label'],
		template: '<option :value="value">{{ label }}</option>',
	},
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

function makeCatalog(): ProviderCatalog {
	return {
		anthropic: {
			id: 'anthropic',
			name: 'Anthropic',
			models: {
				'claude-sonnet-4-6': {
					id: 'claude-sonnet-4-6',
					name: 'Claude Sonnet 4.6',
					reasoning: true,
					toolCall: true,
				},
			},
		},
		google: {
			id: 'google',
			name: 'Google',
			models: {
				'gemini-pro': {
					id: 'gemini-pro',
					name: 'Gemini Pro',
					reasoning: true,
					toolCall: true,
				},
			},
		},
		openai: {
			id: 'openai',
			name: 'OpenAI',
			models: {
				'gpt-4.1-mini': {
					id: 'gpt-4.1-mini',
					name: 'GPT-4.1 mini',
					reasoning: false,
					toolCall: true,
				},
				'gpt-unknown': {
					id: 'gpt-unknown',
					name: 'GPT Unknown',
					toolCall: true,
				},
			},
		},
		'aws-bedrock': {
			id: 'aws-bedrock',
			name: 'AWS Bedrock',
			models: {
				'anthropic.claude-sonnet-4-5-v1:0': {
					id: 'anthropic.claude-sonnet-4-5-v1:0',
					name: 'Claude Sonnet 4.5',
					reasoning: true,
					toolCall: true,
				},
			},
		},
	};
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
	beforeEach(() => {
		ensureLoadedMock.mockReset();
		modelCatalog.value = makeCatalog();
	});

	it('renders the collapsible heading and toggles the advanced content', async () => {
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config: makeConfig(), collapsible: true },
			global: { stubs: globalStubs },
		});

		const title = wrapper.find('[data-testid="agent-advanced-title"]');
		const trigger = wrapper.find('[data-testid="agent-advanced-trigger"]');
		const chevron = wrapper.find('[data-testid="agent-advanced-chevron"]');
		const content = wrapper.find('[data-testid="agent-advanced-content"]');

		expect(title.text()).toContain('agents.builder.advanced.title');
		expect(chevron.exists()).toBe(true);
		expect(content.isVisible()).toBe(false);

		await trigger.trigger('click');

		expect(content.isVisible()).toBe(true);
	});

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

	it('loads the model catalog for the current project', () => {
		mount(AgentAdvancedPanel, {
			props: { config: makeConfig(), projectId: 'project-1' },
			global: { stubs: globalStubs },
		});

		expect(ensureLoadedMock).toHaveBeenCalledWith('project-1');
	});

	it('shows the configured reasoning effort when the selected model supports reasoning', async () => {
		const config = makeConfig({
			model: 'google/gemini-pro',
			config: { reasoning: 'high' },
		} as Partial<AgentJsonConfig>);
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config, projectId: 'project-1' },
			global: { stubs: globalStubs },
		});
		await nextTick();
		const effort = findStubComponent(wrapper, 'agent-reasoning-effort-select');
		expect(effort.exists()).toBe(true);
		expect(effort.props('modelValue')).toBe('high');
		expect(wrapper.find('[data-testid="agent-budget-tokens-input"]').exists()).toBe(false);
	});

	it('shows the reasoning toggle when the selected model supports reasoning', () => {
		const config = makeConfig({
			model: 'aws-bedrock/anthropic.claude-sonnet-4-5-v1:0',
		});
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config, projectId: 'project-1' },
			global: { stubs: globalStubs },
		});
		const toggle = wrapper.find('[data-testid="agent-reasoning-toggle"]');
		expect(toggle.exists()).toBe(true);
		expect(toggle.attributes('disabled')).toBeUndefined();
		expect(wrapper.find('[data-testid="agent-reasoning-hint"]').text()).toBe(
			'Let the model reason before responding.',
		);
	});

	it('enables generic medium reasoning when the toggle flips on', async () => {
		const config = makeConfig({ model: 'google/gemini-pro' });
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config, projectId: 'project-1' },
			global: { stubs: globalStubs },
		});
		await wrapper.find('[data-testid="agent-reasoning-toggle"]').trigger('click');
		const events = wrapper.emitted('update:config') ?? [];
		expect(events.length).toBeGreaterThan(0);
		const last = events[events.length - 1][0] as Partial<AgentJsonConfig>;
		expect(last.config?.reasoning).toBe('medium');
	});

	it('updates the generic reasoning effort', async () => {
		const wrapper = mount(AgentAdvancedPanel, {
			props: {
				config: makeConfig({ config: { reasoning: 'medium' } }),
				projectId: 'project-1',
			},
			global: { stubs: { ...globalStubs, Select: globalStubs.N8nSelect } },
		});

		emitSelectValue(wrapper, 'agent-reasoning-effort-select', 'low');
		await nextTick();

		const events = wrapper.emitted('update:config') ?? [];
		const last = events.at(-1)?.[0] as Partial<AgentJsonConfig>;
		expect(last.config?.reasoning).toBe('low');
	});

	it('removes reasoning when the toggle flips off', async () => {
		const wrapper = mount(AgentAdvancedPanel, {
			props: {
				config: makeConfig({ config: { reasoning: 'medium' } }),
				projectId: 'project-1',
			},
			global: { stubs: globalStubs },
		});

		await wrapper.find('[data-testid="agent-reasoning-toggle"]').trigger('click');

		const events = wrapper.emitted('update:config') ?? [];
		const last = events.at(-1)?.[0] as Partial<AgentJsonConfig>;
		expect(last.config?.reasoning).toBeUndefined();
	});

	it('disables reasoning and explains when the selected model does not support it', async () => {
		const wrapper = mount(AgentAdvancedPanel, {
			props: {
				config: makeConfig({
					model: 'openai/gpt-4.1-mini',
					config: { reasoning: 'high', toolCallConcurrency: 3 },
				}),
				projectId: 'project-1',
			},
			global: { stubs: globalStubs },
		});
		await nextTick();

		const toggle = wrapper.find('[data-testid="agent-reasoning-toggle"]');
		expect(toggle.exists()).toBe(true);
		expect(toggle.attributes('disabled')).toBeDefined();
		expect(wrapper.find('[data-testid="agent-reasoning-hint"]').text()).toBe(
			'This model does not support reasoning',
		);
		expect(findStubComponent(wrapper, 'agent-reasoning-effort-select').props('disabled')).toBe(
			true,
		);
		expect(wrapper.emitted('update:config')).toBeUndefined();
	});

	it('disables reasoning and explains when no model is selected', async () => {
		const wrapper = mount(AgentAdvancedPanel, {
			props: {
				config: makeConfig({
					model: '',
					config: { reasoning: 'medium' },
				}),
				projectId: 'project-1',
			},
			global: { stubs: globalStubs },
		});
		await nextTick();

		const toggle = wrapper.find('[data-testid="agent-reasoning-toggle"]');
		expect(toggle.exists()).toBe(true);
		expect(toggle.attributes('disabled')).toBeDefined();
		expect(wrapper.find('[data-testid="agent-reasoning-hint"]').text()).toBe('No model selected');
		expect(findStubComponent(wrapper, 'agent-reasoning-effort-select').props('disabled')).toBe(
			true,
		);
		expect(wrapper.emitted('update:config')).toBeUndefined();
	});

	it('keeps reasoning enabled while support metadata loads', async () => {
		modelCatalog.value = {};
		const wrapper = mount(AgentAdvancedPanel, {
			props: {
				config: makeConfig(),
				projectId: 'project-1',
			},
			global: { stubs: globalStubs },
		});

		const toggle = wrapper.find('[data-testid="agent-reasoning-toggle"]');
		expect(toggle.exists()).toBe(true);
		expect(toggle.attributes('disabled')).toBeUndefined();
		expect(wrapper.find('[data-testid="agent-reasoning-hint"]').text()).toBe(
			'Let the model reason before responding.',
		);

		modelCatalog.value = makeCatalog();
		await nextTick();

		expect(toggle.attributes('disabled')).toBeUndefined();
		expect(wrapper.emitted('update:config')).toBeUndefined();
	});

	it('disables reasoning when loaded metadata explicitly marks the model unsupported', async () => {
		modelCatalog.value = {};
		const wrapper = mount(AgentAdvancedPanel, {
			props: {
				config: makeConfig({ model: 'openai/gpt-4.1-mini' }),
				projectId: 'project-1',
			},
			global: { stubs: globalStubs },
		});

		const toggle = wrapper.find('[data-testid="agent-reasoning-toggle"]');
		expect(toggle.attributes('disabled')).toBeUndefined();
		expect(wrapper.find('[data-testid="agent-reasoning-hint"]').text()).toBe(
			'Let the model reason before responding.',
		);

		modelCatalog.value = makeCatalog();
		await nextTick();

		expect(toggle.attributes('disabled')).toBeDefined();
		expect(wrapper.find('[data-testid="agent-reasoning-hint"]').text()).toBe(
			'This model does not support reasoning',
		);
		expect(wrapper.emitted('update:config')).toBeUndefined();
	});

	it('keeps reasoning enabled when the catalog model omits support metadata', async () => {
		const wrapper = mount(AgentAdvancedPanel, {
			props: {
				config: makeConfig({
					model: 'openai/gpt-unknown',
					config: { reasoning: 'medium' },
				}),
				projectId: 'project-1',
			},
			global: { stubs: globalStubs },
		});
		await nextTick();

		const toggle = wrapper.find('[data-testid="agent-reasoning-toggle"]');
		expect(toggle.exists()).toBe(true);
		expect(toggle.attributes('disabled')).toBeUndefined();
		expect(wrapper.find('[data-testid="agent-reasoning-hint"]').text()).toBe(
			'Let the model reason before responding.',
		);
		expect(findStubComponent(wrapper, 'agent-reasoning-effort-select').props('disabled')).toBe(
			false,
		);
		expect(wrapper.emitted('update:config')).toBeUndefined();
	});

	it('disables reasoning when the selected model changes to an unsupported model', async () => {
		const wrapper = mount(AgentAdvancedPanel, {
			props: {
				config: makeConfig({ config: { reasoning: 'high' } }),
				projectId: 'project-1',
			},
			global: { stubs: globalStubs },
		});
		expect(wrapper.find('[data-testid="agent-reasoning-toggle"]').exists()).toBe(true);

		await wrapper.setProps({
			config: makeConfig({
				model: 'openai/gpt-4.1-mini',
				config: { reasoning: 'high' },
			}),
		});
		await nextTick();

		const toggle = wrapper.find('[data-testid="agent-reasoning-toggle"]');
		expect(toggle.exists()).toBe(true);
		expect(toggle.attributes('disabled')).toBeDefined();
		expect(wrapper.find('[data-testid="agent-reasoning-hint"]').text()).toBe(
			'This model does not support reasoning',
		);
		expect(findStubComponent(wrapper, 'agent-reasoning-effort-select').props('disabled')).toBe(
			true,
		);
		expect(wrapper.emitted('update:config')).toBeUndefined();
	});

	it('shows the Anthropic ttl dropdown, defaulting to 1h, with no on/off toggle', async () => {
		const config = makeConfig();
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config },
			global: { stubs: globalStubs },
		});
		await nextTick();
		expect(wrapper.find('[data-testid="agent-prompt-caching-toggle"]').exists()).toBe(false);
		const ttlSelect = findStubComponent(wrapper, 'agent-prompt-caching-ttl-select');
		expect(ttlSelect.exists()).toBe(true);
		expect(ttlSelect.props('modelValue')).toBe('1h');
	});

	it('hides the prompt-caching row entirely for OpenAI (mandatory, no user-facing control)', () => {
		const config = makeConfig({ model: 'openai/gpt-5.1' });
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config },
			global: { stubs: globalStubs },
		});
		expect(wrapper.find('[data-testid="agent-prompt-caching-toggle"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-prompt-caching-ttl-select"]').exists()).toBe(false);
	});

	it('hides the prompt-caching row entirely for providers that do not support it', () => {
		const config = makeConfig({ model: 'google/gemini-pro' });
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config },
			global: { stubs: globalStubs },
		});
		expect(wrapper.find('[data-testid="agent-prompt-caching-toggle"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-prompt-caching-ttl-select"]').exists()).toBe(false);
	});

	it('emits { enabled: true, anthropic: { ttl } } when the ttl dropdown changes', () => {
		const config = makeConfig();
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config },
			global: { stubs: globalStubs },
		});
		emitSelectValue(wrapper, 'agent-prompt-caching-ttl-select', '5m');
		const events = wrapper.emitted('update:config') ?? [];
		expect(events.length).toBeGreaterThan(0);
		const last = events[events.length - 1][0] as Partial<AgentJsonConfig>;
		expect(last.config?.promptCaching).toEqual({ enabled: true, anthropic: { ttl: '5m' } });
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
			wrapper.find('[data-testid="agent-reasoning-toggle"]').attributes('disabled'),
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
