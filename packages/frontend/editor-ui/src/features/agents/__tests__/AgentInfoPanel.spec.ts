import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import { mount } from '@vue/test-utils';
import type * as VueUse from '@vueuse/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import AgentInfoPanel from '../components/AgentInfoPanel.vue';
import type { ProviderCatalog } from '../composables/useAgentApi';
import type { AgentJsonConfig } from '../types';

const ensureLoadedMock = vi.fn();
const selectCredentialMock = vi.fn();
// Reactive holder mirroring the real composable, whose verified-default cache
// is a ref that updates when the backend response lands — watch getters that
// call the mock must re-run when tests change the value.
const defaultModelHolder = ref<Record<string, unknown> | null>(null);
const getDefaultModelForPickerMock = vi.fn(() => defaultModelHolder.value);

function makeCatalog(): ProviderCatalog {
	return {
		anthropic: {
			id: 'anthropic',
			name: 'Anthropic',
			models: {
				'claude-sonnet-4-5': {
					id: 'claude-sonnet-4-5',
					name: 'Claude Sonnet 4.5',
					reasoning: true,
					toolCall: true,
				},
				'claude-3-haiku': {
					id: 'claude-3-haiku',
					name: 'Claude 3 Haiku',
					reasoning: false,
					toolCall: true,
				},
				'claude-unknown': {
					id: 'claude-unknown',
					name: 'Claude Unknown',
					toolCall: true,
				},
			},
		},
	};
}

const modelCatalog = ref<ProviderCatalog>(makeCatalog());

// Mutable holder so tests can vary the composable's (localStorage-backed) selection state.
const { credsHolder } = vi.hoisted(() => ({
	credsHolder: { value: { anthropic: 'credential-1' } as Record<string, string | null> },
}));

vi.mock('@vueuse/core', async (importOriginal) => {
	const actual = await importOriginal<typeof VueUse>();
	return {
		...actual,
		useDebounceFn: (fn: (...args: unknown[]) => unknown) => fn,
	};
});

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText: (key: string, options?: { interpolate?: Record<string, string> }) =>
			({
				'agents.builder.agent.instructions.label': 'Instructions',
				'agents.builder.agent.instructions.placeholder': 'Enter instructions here',
				'agents.builder.agent.instructions.characterCount': `${options?.interpolate?.count ?? '0'} characters`,
				'agents.builder.agent.model.defaultSelected.title': 'Default model selected',
				'agents.builder.agent.model.defaultSelected.description':
					'A sensible default has been chosen for you. You can change it anytime.',
				'agents.builder.agent.model.defaultSelected.dismiss': 'Got it',
			})[key] ?? key,
	}),
}));

vi.mock('@n8n/design-system', () => ({
	N8nMarkdownEditor: {
		name: 'N8nMarkdownEditor',
		props: ['modelValue', 'variant', 'showToolbar', 'placeholder', 'readonly', 'maxHeight'],
		emits: ['update:modelValue'],
		template:
			'<div v-bind="$attrs" data-testid="markdown-editor">{{ modelValue }} {{ placeholder }}</div>',
	},
	N8nText: { template: '<span><slot /></span>', props: ['tag', 'bold', 'size', 'color'] },
	N8nInput: {
		name: 'N8nInput',
		props: ['modelValue', 'placeholder', 'disabled'],
		emits: ['update:modelValue', 'focus', 'blur'],
		template: '<input v-bind="$attrs" />',
	},
	N8nCallout: {
		name: 'N8nCallout',
		props: ['theme', 'slim', 'icon'],
		template: '<div v-bind="$attrs" data-testid="n8n-callout"><slot /></div>',
	},
	N8nIconButton: {
		name: 'N8nIconButton',
		props: ['icon', 'size', 'variant', 'title', 'text'],
		emits: ['click'],
		template: '<button v-bind="$attrs" data-testid="n8n-icon-button" @click="$emit(\'click\')" />',
	},
}));

vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError: vi.fn() }),
}));

vi.mock('@n8n/stores/users.store', () => ({
	useUsersStore: () => ({ currentUserId: 'user-1' }),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		getCredentialById: () => undefined,
		getCredentialData: async () => undefined,
	}),
}));

vi.mock('../composables/useAgentProjectId', () => ({
	useAgentProjectId: () => ref('project-1'),
}));

vi.mock('../composables/useAgentModelCredentials', () => ({
	useAgentModelCredentials: () => ({
		credentialsByProvider: credsHolder,
		selectCredential: selectCredentialMock,
	}),
}));

vi.mock('../composables/useModelCatalog', () => ({
	useModelCatalog: () => ({
		catalog: modelCatalog,
		ensureLoaded: ensureLoadedMock,
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
					{
						provider: 'anthropic',
						model: 'claude-3-haiku',
						name: 'Claude 3 Haiku',
						description: null,
						createdAt: null,
						metadata: { functionCalling: true, available: true },
					},
				],
			},
		}),
		getDefaultModelForPicker: getDefaultModelForPickerMock,
		isLoading: ref(false),
	}),
}));

vi.mock('../components/AgentModelSelector.vue', () => ({
	default: {
		name: 'AgentModelSelector',
		template: '<div data-testid="agent-model-selector" />',
		props: ['selectedModel', 'credentials', 'warnMissingCredentials', 'modelsByProvider'],
		emits: ['change', 'select-credential', 'configure-credential'],
	},
}));

function mountPanel(
	instructions = '# Role\nHelp users.',
	overrides: Partial<{
		showModel: boolean;
		config: Record<string, unknown>;
	}> = {},
) {
	const { config: configOverride, ...propOverrides } = overrides;
	return mount(AgentInfoPanel, {
		props: {
			config: {
				name: 'Support agent',
				model: 'anthropic/claude-sonnet-4-5',
				credential: 'credential-1',
				instructions,
				...configOverride,
			},
			projectId: 'project-1',
			showModel: false,
			embedded: true,
			...propOverrides,
		},
	});
}

function mountModelPanel(config: AgentJsonConfig) {
	return mount(AgentInfoPanel, {
		props: {
			config,
			projectId: 'project-1',
			showInstructions: false,
			embedded: true,
		},
	});
}

function selectorProps(wrapper: ReturnType<typeof mountPanel>) {
	return wrapper.findComponent({ name: 'AgentModelSelector' }).props();
}

describe('AgentInfoPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		modelCatalog.value = makeCatalog();
		credsHolder.value = { anthropic: 'credential-1' };
		defaultModelHolder.value = null;
	});

	it('renders instructions as a ghost markdown editor with a floating toolbar', () => {
		const wrapper = mountPanel();

		const editor = wrapper.findComponent({ name: 'N8nMarkdownEditor' });
		expect(editor.props()).toMatchObject({
			modelValue: '# Role\nHelp users.',
			variant: 'ghost',
			showToolbar: 'floating',
			maxHeight: '360px',
		});
		expect(editor.props('placeholder')).toBeUndefined();
		expect(wrapper.find('[data-testid="agent-instructions-document"]').exists()).toBe(true);
		expect(wrapper.text()).not.toContain('characters');
		expect(wrapper.text()).not.toContain('Enter instructions here');
	});

	it('does not pass placeholder text to the instructions editor', () => {
		const wrapper = mountPanel('');

		const editor = wrapper.findComponent({ name: 'N8nMarkdownEditor' });
		expect(editor.props('modelValue')).toBe('');
		expect(editor.props('placeholder')).toBeUndefined();
		expect(wrapper.text()).not.toContain('Enter instructions here');
	});

	it('removes reasoning immediately when selecting a model that does not support it', async () => {
		const config: AgentJsonConfig = {
			name: 'Support agent',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'credential-1',
			instructions: 'Help users.',
			config: { reasoning: 'high', toolCallConcurrency: 2 },
		};
		const wrapper = mountModelPanel(config);

		wrapper.findComponent({ name: 'AgentModelSelector' }).vm.$emit('change', {
			provider: 'anthropic',
			model: 'claude-3-haiku',
		});
		await wrapper.vm.$nextTick();

		const events = wrapper.emitted('update:config') ?? [];
		expect(events).toHaveLength(1);
		const last = events.at(-1)?.[0] as Partial<AgentJsonConfig>;
		expect(last.model).toBe('anthropic/claude-3-haiku');
		expect(last.config).toEqual({
			toolCallConcurrency: 2,
			promptCaching: { enabled: true },
		});
	});

	it('preserves reasoning when selecting a model that supports it', async () => {
		const config: AgentJsonConfig = {
			name: 'Support agent',
			model: 'anthropic/claude-sonnet-4-5',
			credential: 'credential-1',
			instructions: 'Help users.',
			config: { reasoning: 'high' },
		};
		const wrapper = mountModelPanel(config);

		wrapper.findComponent({ name: 'AgentModelSelector' }).vm.$emit('change', {
			provider: 'anthropic',
			model: 'claude-sonnet-4-5',
		});
		await wrapper.vm.$nextTick();

		const events = wrapper.emitted('update:config') ?? [];
		expect(events).toHaveLength(1);
		const last = events[0][0] as Partial<AgentJsonConfig>;
		expect(last.config?.reasoning).toBe('high');
	});

	it.each(['model-missing-from-catalog', 'claude-unknown'])(
		'preserves reasoning when support metadata is unavailable for %s',
		async (model) => {
			const config: AgentJsonConfig = {
				name: 'Support agent',
				model: 'anthropic/claude-sonnet-4-5',
				credential: 'credential-1',
				instructions: 'Help users.',
				config: { reasoning: 'high' },
			};
			const wrapper = mountModelPanel(config);

			wrapper.findComponent({ name: 'AgentModelSelector' }).vm.$emit('change', {
				provider: 'anthropic',
				model,
			});
			await wrapper.vm.$nextTick();

			const events = wrapper.emitted('update:config') ?? [];
			expect(events).toHaveLength(1);
			const last = events[0][0] as Partial<AgentJsonConfig>;
			expect(last.config?.reasoning).toBe('high');
		},
	);

	describe('model credential resolution', () => {
		it('persists the verified default after selecting a credential for an empty draft', async () => {
			const wrapper = mountModelPanel({
				name: 'Support agent',
				model: '',
				instructions: 'Help users.',
			});
			defaultModelHolder.value = {
				provider: 'anthropic',
				model: 'claude-sonnet-4-5',
				name: 'Claude Sonnet 4.5',
				description: null,
				createdAt: null,
				metadata: { functionCalling: true, available: true },
			};

			wrapper
				.findComponent({ name: 'AgentModelSelector' })
				.vm.$emit('select-credential', 'anthropic', 'credential-1');
			await wrapper.vm.$nextTick();

			expect(wrapper.emitted('update:config')).toContainEqual([
				expect.objectContaining({
					model: 'anthropic/claude-sonnet-4-5',
					credential: 'credential-1',
				}),
			]);
		});

		it('applies the verified default on mount when a credential is already available', async () => {
			defaultModelHolder.value = {
				provider: 'anthropic',
				model: 'claude-sonnet-4-5',
				name: 'Claude Sonnet 4.5',
				description: null,
				createdAt: null,
				metadata: { functionCalling: true, available: true },
			};

			// No picker interaction at all: the initial credentials seed resolution.
			const wrapper = mountModelPanel({
				name: 'Support agent',
				model: '',
				instructions: 'Help users.',
			});
			await wrapper.vm.$nextTick();
			await wrapper.vm.$nextTick();

			expect(wrapper.emitted('update:config')).toContainEqual([
				expect.objectContaining({
					model: 'anthropic/claude-sonnet-4-5',
					credential: 'credential-1',
				}),
			]);
			expect(wrapper.find('[data-testid="agent-default-model-hint"]').exists()).toBe(true);
		});

		it('seeds the managed openai fallback on mount when only n8n credits are available', async () => {
			credsHolder.value = { openai: AI_GATEWAY_MANAGED_TAG };
			defaultModelHolder.value = {
				provider: 'openai',
				model: 'gpt-5-mini',
				name: 'GPT-5 mini',
				description: null,
				createdAt: null,
				metadata: { functionCalling: true, available: true },
			};

			const wrapper = mountModelPanel({
				name: 'Support agent',
				model: '',
				instructions: 'Help users.',
			});
			await wrapper.vm.$nextTick();
			await wrapper.vm.$nextTick();

			expect(wrapper.emitted('update:config')).toContainEqual([
				expect.objectContaining({
					model: 'openai/gpt-5-mini',
					credential: AI_GATEWAY_MANAGED_TAG,
				}),
			]);
		});

		it('does not seed a managed non-openai provider on mount (creation resolver falls back to openai only)', async () => {
			credsHolder.value = { anthropic: AI_GATEWAY_MANAGED_TAG };
			defaultModelHolder.value = {
				provider: 'anthropic',
				model: 'claude-sonnet-4-5',
				name: 'Claude Sonnet 4.5',
				description: null,
				createdAt: null,
				metadata: { functionCalling: true, available: true },
			};

			const wrapper = mountModelPanel({
				name: 'Support agent',
				model: '',
				instructions: 'Help users.',
			});
			await wrapper.vm.$nextTick();
			await wrapper.vm.$nextTick();

			expect(wrapper.emitted('update:config')).toBeUndefined();
		});

		it('does not touch a draft that already has a model on mount', async () => {
			defaultModelHolder.value = {
				provider: 'anthropic',
				model: 'claude-sonnet-4-5',
				name: 'Claude Sonnet 4.5',
				description: null,
				createdAt: null,
				metadata: { functionCalling: true, available: true },
			};

			const wrapper = mountModelPanel({
				name: 'Support agent',
				model: 'anthropic/claude-3-haiku',
				credential: 'credential-1',
				instructions: 'Help users.',
			});
			await wrapper.vm.$nextTick();
			await wrapper.vm.$nextTick();

			expect(wrapper.emitted('update:config')).toBeUndefined();
			expect(wrapper.find('[data-testid="agent-default-model-hint"]').exists()).toBe(false);
		});

		it('shows the default-model hint after a default is auto-applied, and clears it on a manual pick', async () => {
			const wrapper = mountModelPanel({
				name: 'Support agent',
				model: '',
				instructions: 'Help users.',
			});
			expect(wrapper.find('[data-testid="agent-default-model-hint"]').exists()).toBe(false);

			defaultModelHolder.value = {
				provider: 'anthropic',
				model: 'claude-sonnet-4-5',
				name: 'Claude Sonnet 4.5',
				description: null,
				createdAt: null,
				metadata: { functionCalling: true, available: true },
			};

			wrapper
				.findComponent({ name: 'AgentModelSelector' })
				.vm.$emit('select-credential', 'anthropic', 'credential-1');
			await wrapper.vm.$nextTick();

			expect(wrapper.find('[data-testid="agent-default-model-hint"]').exists()).toBe(true);

			// A manual model pick clears the hint.
			wrapper.findComponent({ name: 'AgentModelSelector' }).vm.$emit('change', {
				provider: 'anthropic',
				model: 'claude-3-haiku',
			});
			await wrapper.vm.$nextTick();

			expect(wrapper.find('[data-testid="agent-default-model-hint"]').exists()).toBe(false);
		});

		it('dismisses the default-model hint via the close button', async () => {
			const wrapper = mountModelPanel({
				name: 'Support agent',
				model: '',
				instructions: 'Help users.',
			});
			defaultModelHolder.value = {
				provider: 'anthropic',
				model: 'claude-sonnet-4-5',
				name: 'Claude Sonnet 4.5',
				description: null,
				createdAt: null,
				metadata: { functionCalling: true, available: true },
			};

			wrapper
				.findComponent({ name: 'AgentModelSelector' })
				.vm.$emit('select-credential', 'anthropic', 'credential-1');
			await wrapper.vm.$nextTick();

			await wrapper.find('[data-testid="agent-default-model-hint-dismiss"]').trigger('click');

			expect(wrapper.find('[data-testid="agent-default-model-hint"]').exists()).toBe(false);
		});

		it("overlays the agent config's credential for the model provider (builder-created agent)", () => {
			// Builder writes config.credential but not localStorage, so the manual-selection
			// state falls back to the managed default — the overlay must still surface the real
			// credential so the selector does not read as "credentials missing".
			credsHolder.value = { anthropic: AI_GATEWAY_MANAGED_TAG };

			const wrapper = mountPanel('# Role', {
				showModel: true,
				config: { credential: 'real-cred-x' },
			});

			const props = selectorProps(wrapper);
			expect((props.credentials as Record<string, string>).anthropic).toBe('real-cred-x');
		});

		it('marks the selection as managed when config uses the n8n Connect tag', () => {
			credsHolder.value = { anthropic: 'some-stored-cred' };

			const wrapper = mountPanel('# Role', {
				showModel: true,
				config: { credential: AI_GATEWAY_MANAGED_TAG },
			});

			const props = selectorProps(wrapper);
			expect((props.credentials as Record<string, string>).anthropic).toBe(AI_GATEWAY_MANAGED_TAG);
		});

		it('leaves the manual-selection state untouched when config has no credential', () => {
			credsHolder.value = { anthropic: 'credential-1' };

			const wrapper = mountPanel('# Role', {
				showModel: true,
				config: { credential: undefined },
			});

			const props = selectorProps(wrapper);
			expect((props.credentials as Record<string, string>).anthropic).toBe('credential-1');
		});
	});
});
