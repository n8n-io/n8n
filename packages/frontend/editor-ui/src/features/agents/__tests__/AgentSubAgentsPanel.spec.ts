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

import { AGENT_SUB_AGENTS_MODAL_KEY } from '../constants';
import type { AgentJsonConfig, AgentResource } from '../types';
import type { AgentModelSelection } from '../model-providers';

const ensureLoadedMock = vi.fn();
const projectAgentsListRef = ref<AgentResource[] | null>([]);
const openModalWithDataMock = vi.fn();
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
				'agents.builder.subAgents.add': 'Add agent',
				'agents.builder.subAgents.loadError': 'Could not load project agents',
				'agents.builder.subAgents.remove': 'Remove {name}',
				'agents.builder.subAgents.maxChildren.label': 'Max parallel sub-agents',
				'agents.builder.subAgents.maxChildren.hint': 'Max children hint',
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

vi.mock('../composables/useProjectAgentsList', () => ({
	useProjectAgentsList: () => ({
		list: projectAgentsListRef,
		ensureLoaded: ensureLoadedMock,
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

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ openModalWithData: openModalWithDataMock }),
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
			'horizontal',
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
	N8nCard: {
		template: '<div><slot name="prepend" /><slot /><slot name="append" /></div>',
		props: ['variant'],
	},
	N8nIcon: { template: '<span />', props: ['icon', 'size'] },
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
	N8nScrollArea: { template: '<div><slot /></div>', props: ['maxHeight', 'type'] },
	N8nText: { template: '<span><slot /></span>', props: ['tag', 'bold', 'size', 'color'] },
	N8nTooltip: { template: '<div><slot /><slot name="content" /></div>' },
}));

const publishedSubAgent: AgentResource = {
	id: 'agent-2',
	name: 'Helper Agent',
	description: 'Helps with tasks',
	activeVersionId: 'version-2',
} as AgentResource;

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

describe('AgentSubAgentsPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		agentModelSelectorChangeHandlers.clear();
		agentModelSelectorCredentialHandlers.clear();
		projectAgentsListRef.value = [];
		credentialsByProviderRef.value = {
			anthropic: 'anthropic-cred',
			openai: 'openai-cred',
		};
		ensureLoadedMock.mockResolvedValue([]);
		ensureModelCatalogLoadedMock.mockResolvedValue(undefined);
	});

	it('preloads project agents on mount without surfacing rejection', async () => {
		const loadError = new Error('boom');
		ensureLoadedMock.mockRejectedValueOnce(loadError);

		await mountPanel();
		await flushPromises();

		expect(ensureLoadedMock).toHaveBeenCalledTimes(1);
		expect(showErrorMock).not.toHaveBeenCalled();
	});

	it('renders the max-children input and inline difficulty model selectors', async () => {
		const wrapper = await mountPanel();
		expect(wrapper.find('[data-testid="agent-sub-agents-max-children-input"]').exists()).toBe(true);
		expect(wrapper.find('[data-testid="agent-sub-agents-inline-models"]').exists()).toBe(true);
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
				agents: [{ agentId: 'agent-2' }],
			},
		});
		const input = wrapper.find('[data-testid="agent-sub-agents-max-children-input"]');
		await input.setValue('4');

		expect(wrapper.emitted('update:config')?.[0]).toEqual([
			{
				subAgents: {
					maxChildren: 4,
					agents: [{ agentId: 'agent-2' }],
				},
			},
		]);
	});

	it('removes maxChildren from config when the field is cleared', async () => {
		const wrapper = await mountPanel({
			...defaultConfig,
			subAgents: {
				maxChildren: SUB_AGENT_MAX_CHILDREN_DEFAULT,
				agents: [{ agentId: 'agent-2' }],
			},
		});
		const input = wrapper.find('[data-testid="agent-sub-agents-max-children-input"]');
		await input.setValue('abc');

		const last = wrapper.emitted('update:config')?.at(-1)?.[0] as Partial<AgentJsonConfig>;
		expect(last.subAgents?.agents).toEqual([{ agentId: 'agent-2' }]);
		expect(last.subAgents).not.toHaveProperty('maxChildren');
	});

	it('emits modelsByDifficulty when a difficulty model is selected', async () => {
		const wrapper = await mountPanel({
			...defaultConfig,
			subAgents: {
				maxChildren: 5,
				agents: [{ agentId: 'agent-2' }],
			},
		});
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
					agents: [{ agentId: 'agent-2' }],
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

	it('opens the sub-agents modal after project agents load successfully', async () => {
		projectAgentsListRef.value = [publishedSubAgent];
		const wrapper = await mountPanel();
		await flushPromises();
		const callsAfterMount = ensureLoadedMock.mock.calls.length;

		await wrapper.find('[data-testid="agent-sub-agents-open-add-modal"]').trigger('click');
		await flushPromises();

		expect(ensureLoadedMock.mock.calls.length).toBe(callsAfterMount + 1);
		expect(openModalWithDataMock).toHaveBeenCalledWith(
			expect.objectContaining({
				name: AGENT_SUB_AGENTS_MODAL_KEY,
				data: expect.objectContaining({
					agents: [{ id: 'agent-2', name: 'Helper Agent', description: 'Helps with tasks' }],
				}),
			}),
		);
		expect(showErrorMock).not.toHaveBeenCalled();
	});

	it('shows an error toast and does not open the modal when project agents fail to load', async () => {
		const wrapper = await mountPanel();
		await flushPromises();
		const callsAfterMount = ensureLoadedMock.mock.calls.length;

		const loadError = new Error('network');
		ensureLoadedMock.mockRejectedValueOnce(loadError);

		await wrapper.find('[data-testid="agent-sub-agents-open-add-modal"]').trigger('click');
		await flushPromises();

		expect(ensureLoadedMock.mock.calls.length).toBe(callsAfterMount + 1);
		expect(showErrorMock).toHaveBeenCalledWith(loadError, 'Could not load project agents');
		expect(openModalWithDataMock).not.toHaveBeenCalled();
	});

	it('emits update:config when the modal confirms added agent IDs', async () => {
		projectAgentsListRef.value = [publishedSubAgent];
		const wrapper = await mountPanel({
			...defaultConfig,
			subAgents: { maxChildren: 7 },
		});
		await flushPromises();

		await wrapper.find('[data-testid="agent-sub-agents-open-add-modal"]').trigger('click');
		await flushPromises();

		const modalCall = openModalWithDataMock.mock.calls[0]?.[0] as {
			data: { onConfirm: (agentIds: string[]) => void };
		};
		modalCall.data.onConfirm(['agent-2']);

		expect(wrapper.emitted('update:config')?.[0]).toEqual([
			{
				subAgents: {
					maxChildren: 7,
					agents: [{ agentId: 'agent-2' }],
				},
			},
		]);
	});

	it('removes a selected sub-agent and preserves the remaining refs and maxChildren', async () => {
		projectAgentsListRef.value = [
			publishedSubAgent,
			{
				id: 'agent-3',
				name: 'Other Agent',
				description: null,
				activeVersionId: 'version-3',
			} as AgentResource,
		];
		const wrapper = await mountPanel({
			...defaultConfig,
			subAgents: {
				maxChildren: 6,
				agents: [{ agentId: 'agent-2' }, { agentId: 'agent-3' }],
			},
		});
		await flushPromises();

		const rows = wrapper.findAll('[data-testid="agent-sub-agent-row"]');
		expect(rows).toHaveLength(2);

		const removeButtons = wrapper.findAll('[data-testid="agent-sub-agent-remove"]');
		expect(removeButtons).toHaveLength(2);
		await removeButtons[0].trigger('click');

		expect(wrapper.emitted('update:config')?.[0]).toEqual([
			{
				subAgents: {
					maxChildren: 6,
					agents: [{ agentId: 'agent-3' }],
				},
			},
		]);
	});
});
