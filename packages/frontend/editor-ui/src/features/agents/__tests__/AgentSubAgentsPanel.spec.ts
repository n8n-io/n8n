/* eslint-disable import-x/no-extraneous-dependencies -- test-only Vue mounting */
import { createTestingPinia } from '@pinia/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { ref } from 'vue';
import {
	SUB_AGENT_MAX_CHILDREN_DEFAULT,
	SUB_AGENT_MAX_CHILDREN_MAX,
	SUB_AGENT_MAX_CHILDREN_MIN,
} from '@n8n/api-types';

import type { AgentJsonConfig } from '../types';
import type { AgentModelSelection } from '../model-providers';

const showErrorMock = vi.fn();
const ensureModelCatalogLoadedMock = vi.fn();
const selectCredentialMock = vi.fn();

const credentialsByProviderRef = ref<Record<string, string | null>>({
	anthropic: 'anthropic-cred',
	openai: 'openai-cred',
});

const agentModelSelectorChangeHandlers = new Map<
	string,
	(selection: AgentModelSelection) => void
>();
const agentModelSelectorCredentialHandlers = new Map<
	string,
	(provider: string, credentialId: string | null) => void
>();

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string) =>
			({
				'agents.builder.subAgents.title': 'Sub-agents',
				'agents.builder.subAgents.description': 'Sub-agents description',
				'agents.builder.subAgents.maxChildren.label': 'Max parallel sub-agents',
				'agents.builder.subAgents.maxChildren.hint': 'Max children hint',
				'agents.builder.subAgents.customModelRouting.label': 'Custom model routing',
				'agents.builder.subAgents.customModelRouting.hint': 'Custom model routing hint',
				'agents.builder.subAgents.modelsByDifficulty.title': 'Inline sub-agent models',
				'agents.builder.subAgents.modelsByDifficulty.hint': 'Inline models hint',
				'agents.builder.subAgents.modelsByDifficulty.low.label': 'Low difficulty',
				'agents.builder.subAgents.modelsByDifficulty.low.description': 'Low difficulty description',
				'agents.builder.subAgents.modelsByDifficulty.medium.label': 'Medium difficulty',
				'agents.builder.subAgents.modelsByDifficulty.medium.description':
					'Medium difficulty description',
				'agents.builder.subAgents.modelsByDifficulty.high.label': 'High difficulty',
				'agents.builder.subAgents.modelsByDifficulty.high.description':
					'High difficulty description',
				'agents.builder.subAgents.modelsByDifficulty.clear': 'Use parent model',
				'credentials.noResults': 'No credentials',
				error: 'Error',
			})[key] ?? key,
	}),
}));

vi.mock('../composables/useModelCatalog', () => ({
	useModelCatalog: () => ({
		ensureLoaded: ensureModelCatalogLoadedMock,
		getModelsForPicker: () => ({
			anthropic: {
				models: [
					{
						provider: 'anthropic',
						model: 'claude-sonnet-4-5',
						name: 'Claude Sonnet 4.5',
						description: null,
						createdAt: null,
						metadata: { functionCalling: true, available: true },
					},
				],
			},
			openai: {
				models: [
					{
						provider: 'openai',
						model: 'gpt-4o-mini',
						name: 'GPT-4o mini',
						description: null,
						createdAt: null,
						metadata: { functionCalling: true, available: true },
					},
				],
			},
		}),
		isLoading: ref(false),
	}),
}));

vi.mock('../composables/useAgentModelCredentials', () => ({
	useAgentModelCredentials: () => ({
		credentialsByProvider: credentialsByProviderRef,
		selectCredential: selectCredentialMock,
	}),
}));

vi.mock('@/features/settings/users/users.store', () => ({
	useUsersStore: () => ({ currentUserId: 'user-1' }),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showError: showErrorMock }),
}));

vi.mock('../components/AgentModelSelector.vue', () => ({
	default: {
		name: 'AgentModelSelector',
		props: [
			'selectedModel',
			'credentials',
			'modelsByProvider',
			'isLoading',
			'projectId',
			'warnMissingCredentials',
			'disabled',
		],
		emits: ['change', 'selectCredential'],
		template: '<div data-testid="agent-model-selector-stub" :data-disabled="disabled" />',
		mounted(this: { $attrs: Record<string, unknown>; $emit: (...args: unknown[]) => void }) {
			const testId = String(this.$attrs['data-testid'] ?? '');
			agentModelSelectorChangeHandlers.set(testId, (selection) => this.$emit('change', selection));
			agentModelSelectorCredentialHandlers.set(testId, (provider, credentialId) =>
				this.$emit('selectCredential', provider, credentialId),
			);
		},
	},
}));

vi.mock('@n8n/design-system', () => ({
	N8nIconButton: {
		template: '<button :disabled="disabled" v-bind="$attrs"><slot /></button>',
		props: ['disabled', 'ariaLabel', 'icon', 'variant', 'size', 'iconSize'],
	},
	N8nInputNumber2: {
		props: ['modelValue', 'disabled', 'min', 'max', 'precision'],
		emits: ['update:modelValue'],
		template:
			'<input :value="modelValue" :disabled="disabled" :min="min" :max="max" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
	},
	N8nSwitch2: {
		props: ['modelValue', 'disabled'],
		emits: ['update:modelValue'],
		template:
			'<button type="button" data-testid="agent-sub-agents-custom-model-routing-toggle" :disabled="disabled" :data-checked="String(modelValue)" @click="$emit(\'update:modelValue\', !modelValue)" />',
	},
	N8nText: { template: '<span><slot /></span>', props: ['tag', 'bold', 'size', 'color'] },
	N8nTooltip: { template: '<div><slot /><slot name="content" /></div>' },
}));

const defaultConfig: AgentJsonConfig = {
	name: 'Agent',
	model: 'anthropic/claude-sonnet-4-5',
	instructions: 'Help the user.',
};

async function mountPanel(
	config: AgentJsonConfig | null = defaultConfig,
	options: { disabled?: boolean } = {},
) {
	const { default: AgentSubAgentsPanel } = await import('../components/AgentSubAgentsPanel.vue');
	return mount(AgentSubAgentsPanel, {
		props: {
			config,
			disabled: options.disabled ?? false,
			projectId: 'project-1',
			agentId: 'agent-1',
		},
		global: {
			plugins: [createTestingPinia({ createSpy: vi.fn })],
		},
	});
}

function emitDifficultyModelChange(testId: string, selection: AgentModelSelection) {
	const handler = agentModelSelectorChangeHandlers.get(testId);
	if (!handler) throw new Error(`Missing model selector handler for ${testId}`);
	handler(selection);
}

function emitDifficultyCredentialChange(
	testId: string,
	provider: string,
	credentialId: string | null,
) {
	const handler = agentModelSelectorCredentialHandlers.get(testId);
	if (!handler) throw new Error(`Missing credential handler for ${testId}`);
	handler(provider, credentialId);
}

async function enableCustomModelRouting(wrapper: Awaited<ReturnType<typeof mountPanel>>) {
	await wrapper
		.find('[data-testid="agent-sub-agents-custom-model-routing-toggle"]')
		.trigger('click');
	await flushPromises();
}

describe('AgentSubAgentsPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		agentModelSelectorChangeHandlers.clear();
		agentModelSelectorCredentialHandlers.clear();
		credentialsByProviderRef.value = {
			anthropic: 'anthropic-cred',
			openai: 'openai-cred',
		};
		ensureModelCatalogLoadedMock.mockResolvedValue(undefined);
	});

	it('renders the max-children input and custom model routing toggle', async () => {
		const wrapper = await mountPanel();

		expect(wrapper.find('[data-testid="agent-sub-agents-max-children-input"]').exists()).toBe(true);
		expect(
			wrapper.find('[data-testid="agent-sub-agents-custom-model-routing-toggle"]').exists(),
		).toBe(true);
		expect(wrapper.find('[data-testid="agent-sub-agents-inline-models"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-sub-agents-difficulty-low-model"]').exists()).toBe(
			false,
		);
	});

	it('does not render a standalone settings section heading', async () => {
		const wrapper = await mountPanel();

		expect(wrapper.text()).not.toContain('Sub-agents');
		expect(wrapper.text()).not.toContain('Sub-agents description');
	});

	it('shows inline difficulty model selectors when custom routing is enabled', async () => {
		const wrapper = await mountPanel();
		await enableCustomModelRouting(wrapper);

		expect(wrapper.find('[data-testid="agent-sub-agents-inline-models"]').exists()).toBe(true);
		expect(wrapper.text()).not.toContain('Inline sub-agent models');
		expect(wrapper.text()).not.toContain('Inline models hint');
		expect(wrapper.find('[data-testid="agent-sub-agents-difficulty-low-model"]').exists()).toBe(
			true,
		);
		expect(wrapper.find('[data-testid="agent-sub-agents-difficulty-medium-model"]').exists()).toBe(
			true,
		);
		expect(wrapper.find('[data-testid="agent-sub-agents-difficulty-high-model"]').exists()).toBe(
			true,
		);
	});

	it('shows inline difficulty model selectors when config has difficulty mappings', async () => {
		const wrapper = await mountPanel({
			...defaultConfig,
			subAgents: {
				modelsByDifficulty: {
					high: { model: 'anthropic/claude-sonnet-4-5', credential: 'anthropic-cred' },
				},
			},
		});

		expect(
			wrapper
				.find('[data-testid="agent-sub-agents-custom-model-routing-toggle"]')
				.attributes('data-checked'),
		).toBe('true');
		expect(wrapper.find('[data-testid="agent-sub-agents-inline-models"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-sub-agents-difficulty-high-model"]').exists()).toBe(
			true,
		);
	});

	it('resets custom model routing when switching to an agent without difficulty mappings', async () => {
		const wrapper = await mountPanel({
			...defaultConfig,
			subAgents: {
				modelsByDifficulty: {
					high: { model: 'anthropic/claude-sonnet-4-5', credential: 'anthropic-cred' },
				},
			},
		});

		expect(
			wrapper
				.find('[data-testid="agent-sub-agents-custom-model-routing-toggle"]')
				.attributes('data-checked'),
		).toBe('true');

		await wrapper.setProps({ agentId: 'agent-2' });
		await wrapper.setProps({
			config: {
				...defaultConfig,
				subAgents: {},
			},
		});
		await flushPromises();

		expect(
			wrapper
				.find('[data-testid="agent-sub-agents-custom-model-routing-toggle"]')
				.attributes('data-checked'),
		).toBe('false');
		expect(wrapper.find('[data-testid="agent-sub-agents-inline-models"]').exists()).toBe(false);
	});

	it('initialises max-children input to the default when unset in config', async () => {
		const wrapper = await mountPanel();
		const input = wrapper.find('[data-testid="agent-sub-agents-max-children-input"]');
		expect(Number(input.element.getAttribute('value'))).toBe(SUB_AGENT_MAX_CHILDREN_DEFAULT);
	});

	it('passes the shared min and max bounds to the max-children input', async () => {
		const wrapper = await mountPanel();
		const input = wrapper.find('[data-testid="agent-sub-agents-max-children-input"]');

		expect(Number(input.attributes('min'))).toBe(SUB_AGENT_MAX_CHILDREN_MIN);
		expect(Number(input.attributes('max'))).toBe(SUB_AGENT_MAX_CHILDREN_MAX);
	});

	it('initialises max-children input from config', async () => {
		const wrapper = await mountPanel({
			...defaultConfig,
			subAgents: { maxChildren: 3, agents: [] },
		});
		const input = wrapper.find('[data-testid="agent-sub-agents-max-children-input"]');
		expect(Number(input.element.getAttribute('value'))).toBe(3);
	});

	it('emits update:config with maxChildren while preserving agents', async () => {
		const wrapper = await mountPanel({
			...defaultConfig,
			subAgents: {
				maxChildren: 2,
				agents: [{ agentId: 'agent-2', useWhen: 'Use for billing escalations.' }],
			},
		});
		const input = wrapper.find('[data-testid="agent-sub-agents-max-children-input"]');
		await input.setValue('4');

		expect(wrapper.emitted('update:config')?.[0]).toEqual([
			{
				subAgents: {
					maxChildren: 4,
					agents: [{ agentId: 'agent-2', useWhen: 'Use for billing escalations.' }],
				},
			},
		]);
	});

	it('removes maxChildren from config when the field is cleared', async () => {
		const wrapper = await mountPanel({
			...defaultConfig,
			subAgents: {
				maxChildren: SUB_AGENT_MAX_CHILDREN_DEFAULT,
				agents: [{ agentId: 'agent-2', useWhen: 'Use for billing escalations.' }],
			},
		});
		const input = wrapper.find('[data-testid="agent-sub-agents-max-children-input"]');
		await input.setValue('abc');

		const last = wrapper.emitted('update:config')?.at(-1)?.[0] as Partial<AgentJsonConfig>;
		expect(last.subAgents?.agents).toEqual([
			{ agentId: 'agent-2', useWhen: 'Use for billing escalations.' },
		]);
		expect(last.subAgents).not.toHaveProperty('maxChildren');
	});

	it('emits modelsByDifficulty when a difficulty model is selected', async () => {
		const wrapper = await mountPanel({
			...defaultConfig,
			subAgents: {
				maxChildren: 5,
				agents: [{ agentId: 'agent-2', useWhen: 'Use for billing escalations.' }],
			},
		});
		await enableCustomModelRouting(wrapper);
		await flushPromises();

		emitDifficultyModelChange('agent-sub-agents-difficulty-high-model', {
			provider: 'openai',
			model: 'gpt-4o-mini',
		});
		await flushPromises();

		expect(wrapper.emitted('update:config')?.[0]).toEqual([
			{
				subAgents: {
					maxChildren: 5,
					agents: [{ agentId: 'agent-2', useWhen: 'Use for billing escalations.' }],
					modelsByDifficulty: {
						high: {
							model: 'openai/gpt-4o-mini',
							credential: 'openai-cred',
						},
					},
				},
			},
		]);
	});

	it('turns custom model routing off and clears difficulty mappings', async () => {
		const wrapper = await mountPanel({
			...defaultConfig,
			subAgents: {
				maxChildren: 4,
				agents: [{ agentId: 'agent-2', useWhen: 'Use for billing escalations.' }],
				modelsByDifficulty: {
					low: { model: 'openai/gpt-4o-mini', credential: 'openai-cred' },
					high: { model: 'anthropic/claude-sonnet-4-5', credential: 'anthropic-cred' },
				},
			},
		});

		await wrapper
			.find('[data-testid="agent-sub-agents-custom-model-routing-toggle"]')
			.trigger('click');

		const last = wrapper.emitted('update:config')?.at(-1)?.[0] as Partial<AgentJsonConfig>;
		expect(last.subAgents).toEqual({
			maxChildren: 4,
			agents: [{ agentId: 'agent-2', useWhen: 'Use for billing escalations.' }],
		});
		expect(last.subAgents).not.toHaveProperty('modelsByDifficulty');
		expect(wrapper.find('[data-testid="agent-sub-agents-inline-models"]').exists()).toBe(false);
	});

	it('updates only the matching difficulty credential when a credential is selected', async () => {
		const wrapper = await mountPanel({
			...defaultConfig,
			subAgents: {
				modelsByDifficulty: {
					low: { model: 'openai/gpt-4o-mini', credential: 'openai-cred' },
					high: { model: 'anthropic/claude-sonnet-4-5', credential: 'anthropic-cred' },
				},
			},
		});
		await flushPromises();

		emitDifficultyCredentialChange(
			'agent-sub-agents-difficulty-high-model',
			'anthropic',
			'anthropic-cred-2',
		);
		await flushPromises();

		expect(selectCredentialMock).not.toHaveBeenCalled();
		expect(wrapper.emitted('update:config')?.[0]).toEqual([
			{
				subAgents: {
					modelsByDifficulty: {
						low: { model: 'openai/gpt-4o-mini', credential: 'openai-cred' },
						high: { model: 'anthropic/claude-sonnet-4-5', credential: 'anthropic-cred-2' },
					},
				},
			},
		]);
	});

	it('clears a difficulty mapping and removes modelsByDifficulty when none remain', async () => {
		const wrapper = await mountPanel({
			...defaultConfig,
			subAgents: {
				modelsByDifficulty: {
					high: { model: 'anthropic/claude-sonnet-4-5', credential: 'anthropic-cred' },
				},
			},
		});
		await flushPromises();

		await wrapper.find('[data-testid="agent-sub-agents-difficulty-high-clear"]').trigger('click');

		const last = wrapper.emitted('update:config')?.at(-1)?.[0] as Partial<AgentJsonConfig>;
		expect(last.subAgents).toEqual({});
		expect(last.subAgents).not.toHaveProperty('modelsByDifficulty');
	});

	it('shows clear control only for configured difficulty mappings', async () => {
		const wrapper = await mountPanel({
			...defaultConfig,
			subAgents: {
				modelsByDifficulty: {
					low: { model: 'openai/gpt-4o-mini', credential: 'openai-cred' },
				},
			},
		});

		expect(wrapper.find('[data-testid="agent-sub-agents-difficulty-low-clear"]').exists()).toBe(
			true,
		);
		expect(wrapper.find('[data-testid="agent-sub-agents-difficulty-medium-clear"]').exists()).toBe(
			false,
		);
		expect(wrapper.find('[data-testid="agent-sub-agents-difficulty-high-clear"]').exists()).toBe(
			false,
		);
	});

	it('disables difficulty model controls when the panel is disabled', async () => {
		const wrapper = await mountPanel(
			{
				...defaultConfig,
				subAgents: {
					modelsByDifficulty: {
						low: { model: 'openai/gpt-4o-mini', credential: 'openai-cred' },
					},
				},
			},
			{ disabled: true },
		);
		await flushPromises();

		const clearButton = wrapper.find('[data-testid="agent-sub-agents-difficulty-low-clear"]');
		expect(clearButton.exists()).toBe(true);
		expect(clearButton.attributes('disabled')).toBeDefined();
		expect(wrapper.findComponent({ name: 'AgentModelSelector' }).props('disabled')).toBe(true);

		emitDifficultyModelChange('agent-sub-agents-difficulty-low-model', {
			provider: 'openai',
			model: 'gpt-4o-mini',
		});
		emitDifficultyCredentialChange(
			'agent-sub-agents-difficulty-low-model',
			'openai',
			'openai-cred-2',
		);

		expect(wrapper.emitted('update:config')).toBeUndefined();
		expect(selectCredentialMock).not.toHaveBeenCalled();
	});

	it('does not render selected sub-agent rows in the settings panel', async () => {
		const wrapper = await mountPanel({
			...defaultConfig,
			subAgents: {
				maxChildren: 6,
				agents: [
					{ agentId: 'agent-2', useWhen: 'Use for billing escalations.' },
					{ agentId: 'agent-3', useWhen: 'Use for research tasks.' },
				],
			},
		});

		expect(wrapper.find('[data-testid="agent-sub-agent-row"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-sub-agents-open-add-modal"]').exists()).toBe(false);
	});
});
