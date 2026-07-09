<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import {
	N8nAiModelSelectorDropdown,
	N8nIcon,
	useDropdownSearch,
	type AiModelSelectorMenuItem,
	type AiModelSelectorMenuItemData,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { truncateBeforeLast } from '@n8n/utils/string/truncate';
import { getResourcePermissions } from '@n8n/permissions';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useFreeAiCredits } from '@/app/composables/useFreeAiCredits';
import {
	AGENT_MODEL_PROVIDER_DEFINITIONS,
	AGENT_MODEL_PROVIDERS,
	isAgentModelProvider,
	type AgentCredentialsByProvider,
	type AgentModelOption,
	type AgentModelProvider,
	type AgentModelSelection,
	type AgentModelsByProvider,
} from '../model-providers';
import { AGENT_MODEL_CREDENTIAL_MODAL_KEY } from '../constants';

const MAX_MODEL_NAME_CHARS = 45;
const MAX_SEARCH_RESULTS_PER_PROVIDER = 10;
const FREE_OPENAI_CREDITS_PROVIDER = 'openai';
const FREE_OPENAI_CREDITS_MODEL = 'gpt-5-mini';

type MenuItemData = AiModelSelectorMenuItemData & {
	provider?: AgentModelProvider;
	credentialType?: string;
	leadingIcon?: 'settings' | 'sparkles';
};

type MenuItem = AiModelSelectorMenuItem<MenuItemData>;

const {
	selectedModel,
	credentials,
	modelsByProvider,
	isLoading,
	projectId,
	warnMissingCredentials = false,
	disabled = false,
} = defineProps<{
	selectedModel: AgentModelOption | null;
	credentials: AgentCredentialsByProvider | null;
	modelsByProvider: AgentModelsByProvider;
	isLoading: boolean;
	projectId: string;
	warnMissingCredentials?: boolean;
	disabled?: boolean;
}>();

const emit = defineEmits<{
	change: [AgentModelSelection];
	selectCredential: [provider: AgentModelProvider, credentialId: string | null];
}>();

const i18n = useI18n();
const dropdownRef = useTemplateRef('dropdownRef');
const credentialsStore = useCredentialsStore();
const projectsStore = useProjectsStore();
const uiStore = useUIStore();
const selectedCredentialId = computed(() =>
	selectedModel ? credentials?.[selectedModel.provider] : undefined,
);

const projectHasOpenAiCredential = computed(() =>
	Boolean(credentials?.[FREE_OPENAI_CREDITS_PROVIDER]),
);

const { aiCreditsQuota, userCanClaimOpenAiCredits, claimingCredits, claimCreditsAndGetCredential } =
	useFreeAiCredits({ hasOpenAiCredential: projectHasOpenAiCredential });

const selectedCredential = computed(() =>
	selectedCredentialId.value
		? credentialsStore.getCredentialById(selectedCredentialId.value)
		: null,
);

const selectedCredentialName = computed(() => selectedCredential.value?.name);

const isCredentialsMissing = computed(
	() => warnMissingCredentials && selectedModel?.provider && !selectedCredential.value,
);

const selectedLabel = computed(
	() => selectedModel?.name ?? i18n.baseText('agents.modelSelector.defaultLabel'),
);

const projectForPermissions = computed(() => {
	if (projectId) {
		if (projectsStore.currentProject?.id === projectId) return projectsStore.currentProject;
		if (projectsStore.personalProject?.id === projectId) return projectsStore.personalProject;
		return projectsStore.myProjects.find((project) => project.id === projectId) ?? null;
	}

	return projectsStore.currentProject ?? projectsStore.personalProject;
});

const createCredentialProjectId = computed(
	() => projectForPermissions.value?.id ?? projectId ?? projectsStore.personalProject?.id,
);

const canCreateCredentials = computed(() => {
	return !!getResourcePermissions(projectForPermissions.value?.scopes).credential.create;
});

function getProviderCredentialTypes(provider: AgentModelProvider): readonly [string, ...string[]] {
	return AGENT_MODEL_PROVIDER_DEFINITIONS[provider].credentialTypes;
}

function getCredentialTypeDisplayName(credentialType: string): string {
	return credentialsStore.getCredentialTypeByName(credentialType)?.displayName ?? credentialType;
}

function getCredentialsForProvider(provider: AgentModelProvider) {
	const credentialsById = new Map<
		string,
		ReturnType<typeof credentialsStore.getCredentialsByType>[number]
	>();

	for (const credentialType of getProviderCredentialTypes(provider)) {
		for (const credential of credentialsStore.getCredentialsByType(credentialType)) {
			if (!credentialsById.has(credential.id)) {
				credentialsById.set(credential.id, credential);
			}
		}
	}

	return [...credentialsById.values()].toSorted((a, b) => a.name.localeCompare(b.name));
}

function modelItemId(provider: AgentModelProvider, model: string): string {
	return `${provider}::model::${encodeURIComponent(model)}`;
}

function configureCredentialItemId(provider: AgentModelProvider, credentialType: string): string {
	return `${provider}::configure::${encodeURIComponent(credentialType)}`;
}

function freeOpenAiCreditsItemId(): string {
	return `${FREE_OPENAI_CREDITS_PROVIDER}::freeCredits::${encodeURIComponent(FREE_OPENAI_CREDITS_MODEL)}`;
}

const canUseFreeOpenAiCredits = computed(
	() => credentials !== null && canCreateCredentials.value && userCanClaimOpenAiCredits.value,
);

const freeOpenAiCreditsDescription = computed(() =>
	i18n.baseText('agents.modelSelector.freeCredits.description', {
		interpolate: { credits: aiCreditsQuota.value },
	}),
);

function providerToMenuItem(provider: AgentModelProvider): MenuItem {
	const definition = AGENT_MODEL_PROVIDER_DEFINITIONS[provider];
	const credentialOptions = getCredentialsForProvider(provider);
	const selectedProviderCredentialId = credentials?.[provider] ?? null;
	const models = modelsByProvider[provider]?.models ?? [];
	const credentialTypes = getProviderCredentialTypes(provider);
	const hasProviderCredential =
		selectedProviderCredentialId !== null &&
		credentialOptions.some((credential) => credential.id === selectedProviderCredentialId);

	const configureCredentialItems: MenuItem[] = canCreateCredentials.value
		? credentialTypes.length === 1
			? [
					{
						id: configureCredentialItemId(provider, credentialTypes[0]),
						icon: { type: 'icon', value: 'settings' },
						label: i18n.baseText('agents.modelSelector.configureCredentials'),
						disabled: false,
						data: { provider, credentialType: credentialTypes[0], leadingIcon: 'settings' },
					},
				]
			: [
					{
						id: `${provider}::configure`,
						icon: { type: 'icon', value: 'settings' },
						label: i18n.baseText('agents.modelSelector.configureCredentials'),
						disabled: false,
						data: { provider, leadingIcon: 'settings' },
						children: credentialTypes.map<MenuItem>((credentialType) => ({
							id: configureCredentialItemId(provider, credentialType),
							label: getCredentialTypeDisplayName(credentialType),
							disabled: false,
							data: { provider, credentialType },
						})),
					},
				]
		: [];

	const freeOpenAiCreditsItems: MenuItem[] =
		provider === FREE_OPENAI_CREDITS_PROVIDER && canUseFreeOpenAiCredits.value
			? [
					{
						id: freeOpenAiCreditsItemId(),
						icon: { type: 'icon', value: 'sparkles' },
						label: i18n.baseText('agents.modelSelector.freeCredits.label'),
						disabled: claimingCredits.value,
						data: {
							provider,
							credentialType: credentialTypes[0],
							leadingIcon: 'sparkles',
							description: freeOpenAiCreditsDescription.value,
							descriptionTooltipTeleported: false,
						},
					},
				]
			: [];

	const modelItems = hasProviderCredential
		? models.map<MenuItem>((model, index) => ({
				id: modelItemId(provider, model.model),
				label: truncateBeforeLast(model.name, MAX_MODEL_NAME_CHARS),
				disabled: false,
				divided: index === 0,
				checked: selectedModel?.provider === provider && selectedModel.model === model.model,
				data: {
					provider,
					description: model.description ?? undefined,
					descriptionTooltipTeleported: false,
					fullName: `${model.name} ${model.model}`,
					credentialType: credentialTypes[0],
				},
			}))
		: [];

	const statusItems: MenuItem[] = !hasProviderCredential
		? []
		: isLoading
			? [
					{
						id: `${provider}::loading`,
						label: i18n.baseText('generic.loadingEllipsis'),
						disabled: true,
					},
				]
			: modelItems.length === 0
				? [
						{
							id: `${provider}::empty`,
							label: i18n.baseText('agents.modelSelector.noModels'),
							disabled: true,
							divided: true,
						},
					]
				: [];

	return {
		id: provider,
		label: definition.displayName,
		data: {
			provider,
			credentialType: credentialTypes[0],
			badgeLabel:
				provider === FREE_OPENAI_CREDITS_PROVIDER && canUseFreeOpenAiCredits.value
					? i18n.baseText('agents.modelSelector.freeCredits.badge')
					: undefined,
		},
		children: [
			...freeOpenAiCreditsItems,
			...configureCredentialItems,
			...modelItems,
			...statusItems,
		],
	};
}

function isAggregatorProvider(provider: AgentModelProvider): boolean {
	return 'isAggregator' in AGENT_MODEL_PROVIDER_DEFINITIONS[provider];
}

const menu = computed(() => {
	const providers = AGENT_MODEL_PROVIDERS.toSorted((a, b) => {
		const aIsAggregator = isAggregatorProvider(a) ? 1 : -1;
		const bIsAggregator = isAggregatorProvider(b) ? 1 : -1;
		return aIsAggregator - bIsAggregator;
	});

	let dividerInserted = false;
	return providers.map<MenuItem>((provider) => {
		const item = providerToMenuItem(provider);
		if (dividerInserted) return item;
		dividerInserted = true;
		return { ...item, divided: true };
	});
});

function isSearchableItem(item: MenuItem): boolean {
	return (item.id.includes('::model::') || item.id.includes('::freeCredits::')) && !item.disabled;
}

const {
	search: searchQuery,
	filteredItems: matchingModelItems,
	handleSearch,
} = useDropdownSearch(menu, {
	flatList: true,
	isSearchable: isSearchableItem,
	searchFields: (item) => [item.label, item.data?.fullName],
	mapResult: (item, path) => ({
		...item,
		divided: false,
		data: item.data
			? {
					...item.data,
					parts: path.map((pathItem) => pathItem.label),
					descriptionTooltipTeleported: true,
				}
			: undefined,
	}),
});

const filteredMenu = computed(() => {
	if (!searchQuery.value.trim()) return menu.value;

	return menu.value.flatMap<MenuItem>((providerItem) => {
		const results = matchingModelItems.value.filter(
			(item) => item.data?.provider === providerItem.id,
		);
		if (results.length <= MAX_SEARCH_RESULTS_PER_PROVIDER) return results;

		return [
			...results.slice(0, MAX_SEARCH_RESULTS_PER_PROVIDER),
			{
				...providerItem,
				label: i18n.baseText('agents.modelSelector.moreModels', {
					interpolate: { provider: providerItem.label },
				}),
				children: results.slice(MAX_SEARCH_RESULTS_PER_PROVIDER),
				divided: false,
			},
		];
	});
});

function openNewCredential(credentialType: string) {
	if (!disabled && canCreateCredentials.value) {
		uiStore.openNewCredential(
			credentialType,
			false,
			false,
			createCredentialProjectId.value,
			undefined,
			undefined,
			undefined,
			{ hideAskAssistant: true },
		);
	}
}

function openCredentialsSelectorOrCreate(provider: AgentModelProvider, credentialType: string) {
	if (disabled) return;

	const existingCredentials = credentialsStore.getCredentialsByType(credentialType);

	if (existingCredentials.length === 0 && canCreateCredentials.value) {
		openNewCredential(credentialType);
		return;
	}

	uiStore.openModalWithData({
		name: AGENT_MODEL_CREDENTIAL_MODAL_KEY,
		data: {
			credentialType,
			displayName: getCredentialTypeDisplayName(credentialType),
			initialValue: credentials?.[provider] ?? null,
			onSelect: (credentialId: string | null) => emit('selectCredential', provider, credentialId),
		},
	});
}

async function onSelect(id: string) {
	if (disabled) return;

	const [providerId, action, rawValue] = id.split('::');
	if (!isAgentModelProvider(providerId) || !rawValue) return;

	const value = decodeURIComponent(rawValue);
	if (action === 'configure') {
		openCredentialsSelectorOrCreate(providerId, value);
		return;
	}

	if (action === 'freeCredits' && providerId === FREE_OPENAI_CREDITS_PROVIDER) {
		if (!canUseFreeOpenAiCredits.value) return;

		const credential = await claimCreditsAndGetCredential(
			'agentBuilderModelSelector',
			createCredentialProjectId.value,
		);

		if (!credential) return;

		emit('selectCredential', providerId, credential.id);
		emit('change', { provider: providerId, model: value });
		return;
	}

	if (action === 'model') {
		emit('change', { provider: providerId, model: value });
	}
}

defineExpose({
	open: () => {
		if (!disabled) dropdownRef.value?.open();
	},
});
</script>

<template>
	<N8nAiModelSelectorDropdown
		ref="dropdownRef"
		:items="filteredMenu"
		:selected-label="selectedLabel"
		:selected-credential-name="selectedCredentialName"
		:credentials-missing="isCredentialsMissing"
		:no-match-label="i18n.baseText('agents.modelSelector.noMatch')"
		:disabled="disabled"
		data-test-id="agent-model-selector"
		credential-data-test-id="agent-model-selector-credential"
		@search="handleSearch"
		@select="onSelect"
	>
		<template #trigger-leading="{ ui }">
			<CredentialIcon
				v-if="selectedModel"
				:credential-type-name="
					AGENT_MODEL_PROVIDER_DEFINITIONS[selectedModel.provider].credentialTypes[0]
				"
				:size="18"
				:class="ui.class"
			/>
			<N8nIcon v-else icon="bot" size="medium" :class="ui.class" />
		</template>

		<template #item-leading="{ item, ui }">
			<N8nIcon
				v-if="item.data?.leadingIcon"
				:icon="item.data.leadingIcon"
				size="large"
				:class="ui.class"
			/>
			<CredentialIcon
				v-else-if="item.data?.credentialType"
				:credential-type-name="item.data.credentialType"
				:size="16"
				:class="ui.class"
			/>
		</template>
	</N8nAiModelSelectorDropdown>
</template>
