/* eslint-disable import-x/no-extraneous-dependencies -- test-only Vue mounting */
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AgentModelsByProvider } from '../model-providers';

type Credential = { id: string; name: string; type: string };
type TestMenuItem = {
	id: string;
	label: string;
	checked?: boolean;
	children?: TestMenuItem[];
	data?: { badgeLabel?: string; description?: string; descriptionTooltipTeleported?: boolean };
};

const credentialsByType = vi.hoisted(() => ({
	value: {
		anthropicApi: [{ id: 'anthropic-cred', name: 'Anthropic credential', type: 'anthropicApi' }],
	} as Record<string, Credential[]>,
}));

const freeAiCreditsState = vi.hoisted(() => ({
	aiCreditsQuota: { value: 100 },
	userCanClaimOpenAiCredits: { value: false },
	claimingCredits: { value: false },
	claimCreditsAndGetCredential: vi.fn(),
}));
const canCreateCredentials = vi.hoisted(() => ({ value: true }));
const openNewCredential = vi.hoisted(() => vi.fn());
const openModalWithData = vi.hoisted(() => vi.fn());
const baseText = vi.hoisted(() =>
	vi.fn((key: string, options?: { interpolate?: Record<string, string | number> }) => {
		const template =
			{
				'agents.modelSelector.defaultLabel': 'Choose model',
				'agents.modelSelector.configureCredentials': 'Configure credentials',
				'agents.modelSelector.credentialsMissing': 'Credentials missing',
				'agents.modelSelector.noMatch': 'No match',
				'agents.modelSelector.noModels': 'No models',
				'agents.modelSelector.moreModels': 'More models',
				'agents.modelSelector.freeCredits.label': 'Use free OpenAI credits',
				'agents.modelSelector.freeCredits.badge': 'free credits',
				'agents.modelSelector.freeCredits.description':
					'Get {credits} free OpenAI API credits. Try it with gpt-5-mini.',
				'generic.loadingEllipsis': 'Loading...',
			}[key] ?? key;

		return Object.entries(options?.interpolate ?? {}).reduce(
			(text, [name, value]) => text.replace(`{${name}}`, String(value)),
			template,
		);
	}),
);

vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({
		baseText,
	}),
}));

vi.mock('@n8n/permissions', () => ({
	getResourcePermissions: () => ({ credential: { create: canCreateCredentials.value } }),
}));

vi.mock('@n8n/design-system', async () => {
	const { computed, ref } = await import('vue');

	return {
		N8nAiModelSelectorDropdown: {
			name: 'AiModelSelectorDropdown',
			props: [
				'items',
				'selectedLabel',
				'selectedCredentialName',
				'credentialsMissing',
				'noMatchLabel',
				'disabled',
				'dataTestId',
				'credentialDataTestId',
			],
			template: '<div data-testid="ai-model-selector-dropdown" />',
		},
		N8nIcon: { template: '<span />', props: ['icon', 'size'] },
		useDropdownSearch: () => ({
			search: ref(''),
			filteredItems: computed(() => []),
			handleSearch: vi.fn(),
		}),
	};
});

vi.mock('@/features/credentials/components/CredentialIcon.vue', () => ({
	default: { template: '<span />', props: ['credentialTypeName', 'size'] },
}));

vi.mock('@/features/credentials/credentials.store', () => ({
	useCredentialsStore: () => ({
		getCredentialById: (id: string) =>
			Object.values(credentialsByType.value)
				.flat()
				.find((credential) => credential.id === id),
		getCredentialsByType: (type: string) => credentialsByType.value[type] ?? [],
		getCredentialTypeByName: (type: string) => ({ displayName: type }),
	}),
}));

vi.mock('@/app/composables/useFreeAiCredits', () => ({
	useFreeAiCredits: () => freeAiCreditsState,
}));

vi.mock('@/features/collaboration/projects/projects.store', () => ({
	useProjectsStore: () => ({
		currentProject: { id: 'project-1', scopes: [] },
		personalProject: { id: 'project-1', scopes: [] },
		myProjects: [{ id: 'project-1', scopes: [] }],
	}),
}));

vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: () => ({ openNewCredential, openModalWithData }),
}));

const modelsByProvider: AgentModelsByProvider = {
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
};

async function mountSelector(credentials: Record<string, string | null>) {
	const { default: AgentModelSelector } = await import('../components/AgentModelSelector.vue');
	return mount(AgentModelSelector, {
		props: {
			selectedModel: modelsByProvider.anthropic?.models[0] ?? null,
			credentials,
			modelsByProvider,
			isLoading: false,
			projectId: 'project-1',
			warnMissingCredentials: true,
		},
	});
}

function getDropdown(wrapper: VueWrapper) {
	return wrapper.findComponent({ name: 'AiModelSelectorDropdown' });
}

function getProviderItem(wrapper: VueWrapper, provider: string) {
	return (getDropdown(wrapper).props('items') as TestMenuItem[]).find(
		(item) => item.id === provider,
	);
}

function getMenuItemByLabel(items: TestMenuItem[], label: string): TestMenuItem | undefined {
	for (const item of items) {
		if (item.label === label) return item;
		const child = getMenuItemByLabel(item.children ?? [], label);
		if (child) return child;
	}

	return undefined;
}

function getFreeOpenAiCreditsItem(wrapper: VueWrapper) {
	return getMenuItemByLabel(
		getDropdown(wrapper).props('items') as TestMenuItem[],
		'Use free OpenAI credits',
	);
}

describe('AgentModelSelector', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		credentialsByType.value = {
			anthropicApi: [{ id: 'anthropic-cred', name: 'Anthropic credential', type: 'anthropicApi' }],
		};
		freeAiCreditsState.userCanClaimOpenAiCredits.value = false;
		freeAiCreditsState.claimingCredits.value = false;
		freeAiCreditsState.claimCreditsAndGetCredential.mockReset();
		canCreateCredentials.value = true;
	});

	it('surfaces a stale selected credential as missing', async () => {
		const wrapper = await mountSelector({ anthropic: 'deleted-credential' });
		const dropdown = getDropdown(wrapper);
		const anthropicItem = getProviderItem(wrapper, 'anthropic');

		expect(dropdown.props('credentialsMissing')).toBe(true);
		expect(dropdown.props('selectedCredentialName')).toBeUndefined();
		expect(JSON.stringify(anthropicItem?.children ?? [])).not.toContain('Claude Sonnet 4.5');
	});

	it('uses an available selected credential', async () => {
		const wrapper = await mountSelector({ anthropic: 'anthropic-cred' });
		const dropdown = getDropdown(wrapper);
		const anthropicItem = getProviderItem(wrapper, 'anthropic');

		expect(dropdown.props('credentialsMissing')).toBe(false);
		expect(dropdown.props('selectedCredentialName')).toBe('Anthropic credential');
		expect(JSON.stringify(anthropicItem?.children ?? [])).toContain('Claude Sonnet 4.5');
		expect(getMenuItemByLabel(anthropicItem?.children ?? [], 'Claude Sonnet 4.5')?.checked).toBe(
			true,
		);
	});

	it('opens the credential selector from the configure action when credentials exist', async () => {
		const wrapper = await mountSelector({ anthropic: null });
		const dropdown = wrapper.findComponent({ name: 'AiModelSelectorDropdown' });

		dropdown.vm.$emit('select', 'anthropic::configure::anthropicApi');

		expect(openModalWithData).toHaveBeenCalledWith({
			name: 'agentModelCredentialModal',
			data: expect.objectContaining({
				credentialType: 'anthropicApi',
				displayName: 'anthropicApi',
				initialValue: null,
			}),
		});
	});

	it('hides the assistant when creating credentials from configure without existing credentials', async () => {
		credentialsByType.value = {};
		const wrapper = await mountSelector({ anthropic: null });
		const dropdown = wrapper.findComponent({ name: 'AiModelSelectorDropdown' });

		dropdown.vm.$emit('select', 'anthropic::configure::anthropicApi');

		expect(openNewCredential).toHaveBeenCalledWith(
			'anthropicApi',
			false,
			false,
			'project-1',
			undefined,
			undefined,
			undefined,
			{ hideAskAssistant: true },
		);
	});

	it('offers free OpenAI credits when the user can claim and has no OpenAI credential', async () => {
		credentialsByType.value = {};
		freeAiCreditsState.userCanClaimOpenAiCredits.value = true;

		const wrapper = await mountSelector({});
		const openAiItem = getProviderItem(wrapper, 'openai');
		const freeCreditsItem = getFreeOpenAiCreditsItem(wrapper);
		const openAiChildLabels = openAiItem?.children?.map((item) => item.label) ?? [];

		expect(openAiItem?.data?.badgeLabel).toBe('free credits');
		expect(JSON.stringify(openAiItem?.children ?? [])).toContain('Use free OpenAI credits');
		expect(openAiChildLabels.indexOf('Use free OpenAI credits')).toBeLessThan(
			openAiChildLabels.indexOf('Configure credentials'),
		);
		expect(freeCreditsItem?.data?.description).toBe(
			'Get 100 free OpenAI API credits. Try it with gpt-5-mini.',
		);
		expect(freeCreditsItem?.data?.descriptionTooltipTeleported).toBe(false);
		expect(freeCreditsItem?.data?.description).not.toContain('These free credits are only for');
		expect(baseText).toHaveBeenCalledWith('agents.modelSelector.freeCredits.description', {
			interpolate: { credits: 100 },
		});
	});

	it('offers free OpenAI credits when a different model provider credential exists', async () => {
		freeAiCreditsState.userCanClaimOpenAiCredits.value = true;

		const wrapper = await mountSelector({});
		const openAiItem = getProviderItem(wrapper, 'openai');

		expect(openAiItem?.data?.badgeLabel).toBe('free credits');
		expect(JSON.stringify(openAiItem?.children ?? [])).toContain('Use free OpenAI credits');
	});

	it('does not offer free OpenAI credits when the user cannot claim credits', async () => {
		credentialsByType.value = {};

		const wrapper = await mountSelector({});
		const openAiItem = getProviderItem(wrapper, 'openai');

		expect(openAiItem?.data?.badgeLabel).toBeUndefined();
		expect(JSON.stringify(openAiItem?.children ?? [])).not.toContain('Use free OpenAI credits');
	});

	it('does not offer or claim free OpenAI credits without credential-create permission', async () => {
		credentialsByType.value = {};
		freeAiCreditsState.userCanClaimOpenAiCredits.value = true;
		canCreateCredentials.value = false;

		const wrapper = await mountSelector({});
		const openAiItem = getProviderItem(wrapper, 'openai');

		expect(openAiItem?.data?.badgeLabel).toBeUndefined();
		expect(JSON.stringify(openAiItem?.children ?? [])).not.toContain('Use free OpenAI credits');

		getDropdown(wrapper).vm.$emit('select', 'openai::freeCredits::gpt-5-mini');
		await flushPromises();

		expect(freeAiCreditsState.claimCreditsAndGetCredential).not.toHaveBeenCalled();
	});

	it('keeps free OpenAI credits searchable by provider and action label', async () => {
		credentialsByType.value = {};
		freeAiCreditsState.userCanClaimOpenAiCredits.value = true;

		const wrapper = await mountSelector({});
		const dropdown = getDropdown(wrapper);

		dropdown.vm.$emit('search', 'free');
		await wrapper.vm.$nextTick();
		expect(getFreeOpenAiCreditsItem(wrapper)?.label).toBe('Use free OpenAI credits');

		dropdown.vm.$emit('search', 'openai');
		await wrapper.vm.$nextTick();
		expect(getFreeOpenAiCreditsItem(wrapper)?.label).toBe('Use free OpenAI credits');
	});

	it('claims free OpenAI credits and selects gpt-5-mini', async () => {
		credentialsByType.value = {};
		freeAiCreditsState.userCanClaimOpenAiCredits.value = true;
		freeAiCreditsState.claimCreditsAndGetCredential.mockResolvedValueOnce({
			id: 'free-openai-credential',
			name: 'n8n free OpenAI API credits',
			type: 'openAiApi',
		});

		const wrapper = await mountSelector({});
		getDropdown(wrapper).vm.$emit('select', 'openai::freeCredits::gpt-5-mini');
		await flushPromises();

		expect(freeAiCreditsState.claimCreditsAndGetCredential).toHaveBeenCalledWith(
			'agentBuilderModelSelector',
			'project-1',
		);
		expect(wrapper.emitted('selectCredential')).toEqual([['openai', 'free-openai-credential']]);
		expect(wrapper.emitted('change')).toEqual([[{ provider: 'openai', model: 'gpt-5-mini' }]]);
	});
});
