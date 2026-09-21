/* eslint-disable import-x/no-extraneous-dependencies -- test-only pattern */
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';

import AgentWebSearchSection from '../components/AgentWebSearchSection.vue';
import AgentCredentialSelect from '../components/AgentCredentialSelect.vue';
import type { AgentJsonConfig } from '../types';

const openNewCredentialMock = vi.hoisted(() => vi.fn());

// Mutable per test so the n8n Connect gating (enabled + served credential type)
// can be exercised without touching the real gateway stores.
const aiGatewayState = vi.hoisted(() => ({
	isEnabled: false,
	servedTypes: new Set<string>(),
}));

type MockProject = { id: string; scopes: string[] };
const CREDENTIAL_CREATE_SCOPES = ['credential:create'];
// Mutable per test (reset in beforeEach) so the project → permission resolution can be exercised.
const projectsStoreState = vi.hoisted(() => ({
	currentProject: null as MockProject | null,
	personalProject: null as MockProject | null,
	myProjects: [] as MockProject[],
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

vi.mock('@/app/composables/useAiGateway', () => ({
	useAiGateway: () => ({
		isEnabled: { value: aiGatewayState.isEnabled },
		balance: { value: undefined },
		fetchConfig: vi.fn().mockResolvedValue(undefined),
		fetchWallet: vi.fn().mockResolvedValue(undefined),
		canServeCredentialType: (type: string) => aiGatewayState.servedTypes.has(type),
	}),
}));

vi.mock('@n8n/design-system', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@n8n/design-system')>();
	return {
		...actual,
		N8nDropdownMenu: {
			name: 'N8nDropdownMenu',
			props: ['items', 'disabled', 'placement'],
			emits: ['select'],
			template: '<div v-bind="$attrs"><slot name="trigger" /></div>',
		},
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
	/** Keep the select as one root and render its credential creation footer. */
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
	N8nSegmentControl: {
		props: ['modelValue', 'options', 'disabled', 'size'],
		emits: ['update:modelValue'],
		template: '<div v-bind="$attrs" />',
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
		vm: { $emit: (event: 'select', value: string) => void };
	};
	select.vm.$emit('select', value);
}

function findStubComponent(wrapper: ReturnType<typeof mount>, testId: string) {
	return wrapper.findComponent(`[data-testid="${testId}"]`) as unknown as {
		exists: () => boolean;
		props: (name: string) => unknown;
		vm: { $emit: (event: 'update:modelValue', value: string) => void };
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
	return mount(AgentWebSearchSection, {
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

describe('AgentWebSearchSection', () => {
	beforeEach(() => {
		openNewCredentialMock.mockReset();
		projectsStoreState.currentProject = { id: 'project-1', scopes: CREDENTIAL_CREATE_SCOPES };
		projectsStoreState.personalProject = null;
		projectsStoreState.myProjects = [];
		aiGatewayState.isEnabled = false;
		aiGatewayState.servedTypes = new Set();
	});

	function getManagedOption(wrapper: ReturnType<typeof mount>) {
		return wrapper.findComponent(AgentCredentialSelect).props('managedOption') as {
			value: string;
			label: string;
			pill?: { text: string; type: string };
		} | null;
	}

	it('offers the n8n Connect option when the gateway serves the Brave credential type', () => {
		aiGatewayState.isEnabled = true;
		aiGatewayState.servedTypes = new Set(['braveSearchApi']);

		const wrapper = mountWithFallbackPicker();

		expect(getManagedOption(wrapper)?.value).toBe(AI_GATEWAY_MANAGED_TAG);
	});

	it('hides the n8n Connect option for SearXNG, which the gateway does not serve', () => {
		aiGatewayState.isEnabled = true;
		aiGatewayState.servedTypes = new Set(['braveSearchApi']);

		const wrapper = mount(AgentWebSearchSection, {
			props: {
				config: makeConfig({
					model: 'deepseek/deepseek-chat',
					config: { webSearch: { enabled: true, provider: 'searxng' } },
				} as Partial<AgentJsonConfig>),
				projectId: 'project-1',
			},
			global: { stubs: globalStubs },
		});

		expect(getManagedOption(wrapper)).toBeNull();
	});

	it('emits the managed tag when the n8n Connect option is selected', async () => {
		aiGatewayState.isEnabled = true;
		aiGatewayState.servedTypes = new Set(['braveSearchApi']);

		const wrapper = mountWithFallbackPicker();

		wrapper
			.findComponent(AgentCredentialSelect)
			.vm.$emit('update:modelValue', AI_GATEWAY_MANAGED_TAG);
		await nextTick();

		const last = wrapper.emitted('update:config')?.at(-1)?.[0] as Partial<AgentJsonConfig>;
		expect(getWebSearchConfig(last)).toEqual({
			enabled: true,
			provider: 'brave',
			credential: AI_GATEWAY_MANAGED_TAG,
		});
	});

	it('treats sparse native web search config as disabled', async () => {
		const wrapper = mount(AgentWebSearchSection, {
			props: { config: makeConfig() },
			global: { stubs: globalStubs },
		});

		const method = findStubComponent(wrapper, 'agent-web-search-method');
		expect(method.exists()).toBe(true);
		expect(method.props('items')).toEqual(
			expect.arrayContaining([expect.objectContaining({ id: 'off', checked: true })]),
		);

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
		const wrapper = mount(AgentWebSearchSection, {
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

	it.each(['low', 'medium', 'high'] as const)(
		'emits the %s search context size and offers all context size options',
		async function emitsSearchContextSize(contextSize) {
			const config = makeConfig({
				model: 'openai/gpt-5',
				config: { webSearch: { enabled: true } },
				providerTools: { 'openai.web_search': {} },
			} as Partial<AgentJsonConfig>);
			const wrapper = mount(AgentWebSearchSection, {
				props: { config },
				global: { stubs: globalStubs },
			});
			const contextSizeControl = wrapper.findComponent({ name: 'SegmentControl' });

			expect(contextSizeControl.props('options')).toEqual([
				{
					label: 'agents.builder.advanced.webSearch.contextSize.low',
					value: 'low',
				},
				{
					label: 'agents.builder.advanced.webSearch.contextSize.medium',
					value: 'medium',
				},
				{
					label: 'agents.builder.advanced.webSearch.contextSize.high',
					value: 'high',
				},
			]);

			contextSizeControl.vm.$emit('update:modelValue', contextSize);
			await nextTick();

			const last = wrapper.emitted('update:config')?.at(-1)?.[0] as Partial<AgentJsonConfig>;
			expect(last.providerTools).toEqual({
				'openai.web_search': {
					externalWebAccess: true,
					searchContextSize: contextSize,
				},
			});
		},
	);

	it('strips native web search provider tools when native web search is disabled', async () => {
		const config = makeConfig({
			config: { webSearch: { enabled: true } },
			providerTools: {
				'anthropic.web_search': { maxUses: 5 },
				'openai.image_generation': {},
			},
		} as Partial<AgentJsonConfig>);
		const wrapper = mount(AgentWebSearchSection, {
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
		const wrapper = mount(AgentWebSearchSection, {
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
		const wrapper = mount(AgentWebSearchSection, {
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
			const wrapper = mount(AgentWebSearchSection, {
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
		const wrapper = mount(AgentWebSearchSection, {
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
		const wrapper = mount(AgentWebSearchSection, {
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
		const wrapper = mount(AgentWebSearchSection, {
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
		const wrapper = mount(AgentWebSearchSection, {
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
});
