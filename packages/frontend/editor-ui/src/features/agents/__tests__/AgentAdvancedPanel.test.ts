/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import type * as VueUse from '@vueuse/core';

import AgentAdvancedPanel from '../components/AgentAdvancedPanel.vue';
import AgentCredentialSelect from '../components/AgentCredentialSelect.vue';
import type { ProviderCatalog } from '../composables/useAgentApi';
import type { AgentJsonConfig } from '../types';

const ensureLoadedMock = vi.fn();
const openNewCredentialMock = vi.hoisted(() => vi.fn());
const modelCatalog = ref<ProviderCatalog>({});

type MockProject = { id: string; scopes: string[] };
const CREDENTIAL_CREATE_SCOPES = ['credential:create'];
// Mutable per test (reset in beforeEach) so the project → permission resolution can be exercised.
const projectsStoreState = vi.hoisted(() => ({
	currentProject: null as MockProject | null,
	personalProject: null as MockProject | null,
	myProjects: [] as MockProject[],
}));

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
				'nodeCredentials.createNew': 'Create new credential',
				'nodeCredentials.createNew.permissionDenied':
					'Your current role does not allow you to create credentials',
			})[key] ?? key,
	}),
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		allCredentials: [
			{ id: 'brave-1', name: 'Brave Key', type: 'braveSearchApi' },
			{ id: 'searxng-1', name: 'SearXNG', type: 'searXngApi' },
		],
		getCredentialTypeByName: (type: string) => ({ displayName: type }),
	}),
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => projectsStoreState,
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ openNewCredential: openNewCredentialMock }),
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
	// Keep <select> as the single root so `findComponent('[data-testid=…]')` matches the stub;
	// the footer slot is where CredentialsDropdown renders "Create new credential".
	N8nSelect: {
		props: ['modelValue', 'disabled'],
		emits: ['update:modelValue'],
		template:
			'<select v-bind="$attrs" :value="modelValue" :disabled="disabled" @change="$emit(\'update:modelValue\', $event.target.value)"><slot /><slot name="footer" /></select>',
	},
	N8nTooltip: {
		props: ['disabled', 'content'],
		template:
			'<span :data-tooltip-disabled="String(disabled)" :data-tooltip-content="content"><slot /></span>',
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

/** Mounts the panel with the Brave fallback picker visible for `projectId`. */
function mountWithFallbackPicker({
	projectId = 'project-1',
	disabled = false,
}: { projectId?: string; disabled?: boolean } = {}) {
	return mount(AgentAdvancedPanel, {
		props: {
			config: makeConfig({
				model: 'deepseek/deepseek-chat',
				config: { webSearch: { enabled: true, provider: 'brave' } },
			} as Partial<AgentJsonConfig>),
			projectId,
			disabled,
		},
		global: { stubs: globalStubs },
	});
}

function findCreateCredentialButton(wrapper: ReturnType<typeof mount>) {
	return wrapper.find('[data-test-id="node-credentials-select-item-new"]');
}

function getCreateCredentialTooltip(wrapper: ReturnType<typeof mount>) {
	const tooltip = findCreateCredentialButton(wrapper).element.closest('[data-tooltip-disabled]');
	return {
		disabled: tooltip?.getAttribute('data-tooltip-disabled'),
		content: tooltip?.getAttribute('data-tooltip-content'),
	};
}

describe('AgentAdvancedPanel', () => {
	beforeEach(() => {
		ensureLoadedMock.mockReset();
		openNewCredentialMock.mockReset();
		modelCatalog.value = makeCatalog();
		projectsStoreState.currentProject = { id: 'project-1', scopes: CREDENTIAL_CREATE_SCOPES };
		projectsStoreState.personalProject = null;
		projectsStoreState.myProjects = [];
	});

	it('renders both advanced sections without a collapsible heading', () => {
		const wrapper = mount(AgentAdvancedPanel, {
			props: { config: makeConfig() },
			global: { stubs: globalStubs },
		});

		expect(wrapper.text()).toContain('agents.builder.advanced.webSearch.label');
		expect(wrapper.text()).toContain('agents.builder.advanced.title');
		expect(wrapper.find('[data-testid="agent-advanced-trigger"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-advanced-chevron"]').exists()).toBe(false);
		expect(wrapper.find('[data-testid="agent-advanced-content"]').isVisible()).toBe(true);
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
		expect(wrapper.find('[data-test-id="agent-web-search-fallback-credential"]').exists()).toBe(
			true,
		);
		expect(wrapper.find('[data-testid="agent-web-search-max-uses"]').exists()).toBe(false);
	});

	it.each([
		['brave', 'braveSearchApi'],
		['searxng', 'searXngApi'],
	] as const)(
		"creating a credential from the fallback picker opens the credential modal for the provider's type in the panel's project and selects the created credential",
		async (provider, credentialType) => {
			const wrapper = mount(AgentAdvancedPanel, {
				props: {
					config: makeConfig({
						model: 'deepseek/deepseek-chat',
						config: { webSearch: { enabled: true, provider } },
					} as Partial<AgentJsonConfig>),
					projectId: 'project-1',
				},
				global: { stubs: globalStubs },
			});

			wrapper.findComponent(AgentCredentialSelect).vm.$emit('create');

			expect(openNewCredentialMock).toHaveBeenCalledWith(
				credentialType,
				false,
				false,
				'project-1',
				undefined,
				undefined,
				undefined,
				expect.objectContaining({ hideAskAssistant: true }),
			);

			const onCredentialCreated = openNewCredentialMock.mock.calls.at(-1)?.[7]?.onCredentialCreated;
			expect(onCredentialCreated).toBeTypeOf('function');
			onCredentialCreated?.({ id: 'new-cred' });

			const last = wrapper.emitted('update:config')?.at(-1)?.[0] as Partial<AgentJsonConfig>;
			expect(getWebSearchConfig(last)).toEqual({
				enabled: true,
				provider,
				credential: 'new-cred',
			});
		},
	);

	it('offers an enabled "Create new credential" action without the permission tooltip when the user can create credentials in the project', () => {
		const wrapper = mountWithFallbackPicker();

		const createButton = findCreateCredentialButton(wrapper);
		expect(createButton.text()).toBe('Create new credential');
		expect(createButton.attributes()).not.toHaveProperty('disabled');
		expect(getCreateCredentialTooltip(wrapper).disabled).toBe('true');
	});

	it('disables "Create new credential" with the permission tooltip and does not open the credential modal when the user cannot create credentials in the project', () => {
		projectsStoreState.currentProject = { id: 'project-1', scopes: ['credential:read'] };

		const wrapper = mountWithFallbackPicker();

		expect(
			wrapper.findComponent(AgentCredentialSelect).props('credentialPermissions'),
		).toMatchObject({ create: false });
		expect(findCreateCredentialButton(wrapper).attributes()).toHaveProperty('disabled');
		expect(getCreateCredentialTooltip(wrapper)).toEqual({
			disabled: 'false',
			content: 'Your current role does not allow you to create credentials',
		});

		// Even if the dropdown emits `create` anyway, the panel must not open the modal.
		wrapper.findComponent(AgentCredentialSelect).vm.$emit('create');
		expect(openNewCredentialMock).not.toHaveBeenCalled();
		expect(wrapper.emitted('update:config')).toBeUndefined();
	});

	it('does not open the credential modal from the fallback picker while the panel is disabled', () => {
		const wrapper = mountWithFallbackPicker({ disabled: true });

		wrapper.findComponent(AgentCredentialSelect).vm.$emit('create');

		expect(openNewCredentialMock).not.toHaveBeenCalled();
		expect(wrapper.emitted('update:config')).toBeUndefined();
	});

	describe('resolving the project whose scopes decide whether a credential can be created', () => {
		const canCreate = CREDENTIAL_CREATE_SCOPES;
		const cannotCreate = ['credential:read'];

		it.each<{
			name: string;
			projectId: string;
			currentProject: MockProject;
			personalProject: MockProject;
			myProjects: MockProject[];
			expectedCreate: boolean;
		}>([
			{
				name: 'uses the current project when it matches the panel project',
				projectId: 'project-1',
				currentProject: { id: 'project-1', scopes: canCreate },
				personalProject: { id: 'project-2', scopes: cannotCreate },
				myProjects: [{ id: 'project-3', scopes: cannotCreate }],
				expectedCreate: true,
			},
			{
				name: 'falls back to the personal project when the current project does not match',
				projectId: 'project-2',
				currentProject: { id: 'project-1', scopes: cannotCreate },
				personalProject: { id: 'project-2', scopes: canCreate },
				myProjects: [{ id: 'project-3', scopes: cannotCreate }],
				expectedCreate: true,
			},
			{
				name: 'falls back to the matching entry in myProjects when neither the current nor the personal project match',
				projectId: 'project-3',
				currentProject: { id: 'project-1', scopes: cannotCreate },
				personalProject: { id: 'project-2', scopes: cannotCreate },
				myProjects: [{ id: 'project-3', scopes: canCreate }],
				expectedCreate: true,
			},
			{
				name: 'denies creating credentials when no known project matches the panel project',
				projectId: 'project-unknown',
				currentProject: { id: 'project-1', scopes: canCreate },
				personalProject: { id: 'project-2', scopes: canCreate },
				myProjects: [{ id: 'project-3', scopes: canCreate }],
				expectedCreate: false,
			},
		])('$name', ({ projectId, currentProject, personalProject, myProjects, expectedCreate }) => {
			projectsStoreState.currentProject = currentProject;
			projectsStoreState.personalProject = personalProject;
			projectsStoreState.myProjects = myProjects;

			const wrapper = mountWithFallbackPicker({ projectId });

			expect(
				wrapper.findComponent(AgentCredentialSelect).props('credentialPermissions'),
			).toMatchObject({ create: expectedCreate });

			wrapper.findComponent(AgentCredentialSelect).vm.$emit('create');
			if (expectedCreate) {
				expect(openNewCredentialMock).toHaveBeenCalledWith(
					'braveSearchApi',
					false,
					false,
					projectId,
					undefined,
					undefined,
					undefined,
					expect.objectContaining({ hideAskAssistant: true }),
				);
			} else {
				expect(openNewCredentialMock).not.toHaveBeenCalled();
			}
		});
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
