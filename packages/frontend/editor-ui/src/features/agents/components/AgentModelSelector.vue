<script setup lang="ts">
import { computed, onMounted, useTemplateRef } from 'vue';
import {
	N8nAiModelSelectorDropdown,
	useDropdownSearch,
	type AiModelSelectorMenuItem,
	type AiModelSelectorMenuItemData,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { truncateBeforeLast } from '@n8n/utils/string/truncate';
import { getResourcePermissions } from '@n8n/permissions';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useFreeAiCredits } from '@/app/composables/useFreeAiCredits';
import { useAiGateway } from '@/app/composables/useAiGateway';
import { AI_GATEWAY_MANAGED_TAG } from '@n8n/api-types';
import ModelSelectorTriggerIcon from './model-selector/ModelSelectorTriggerIcon.vue';
import ModelSelectorItemLeadingIcon from './model-selector/ModelSelectorItemLeadingIcon.vue';
import { buildMenuItemId, parseMenuItemId } from './model-selector/menuItemId';
import {
	AGENT_MODEL_PROVIDER_DEFINITIONS,
	AGENT_MODEL_PROVIDERS,
	getProviderCredentialTypes,
	isAgentModelProvider,
	type AgentCredentialsByProvider,
	type AgentModelOption,
	type AgentModelProvider,
	type AgentModelSelection,
	type AgentModelsByProvider,
} from '../model-providers';

const MAX_MODEL_NAME_CHARS = 45;
const MAX_SEARCH_RESULTS_PER_PROVIDER = 10;
const FREE_OPENAI_CREDITS_PROVIDER = 'openai';
const FREE_OPENAI_CREDITS_MODEL = 'gpt-5-mini';

type MenuItemData = AiModelSelectorMenuItemData & {
	provider?: AgentModelProvider;
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
	isManagedCredential = false,
} = defineProps<{
	selectedModel: AgentModelOption | null;
	credentials: AgentCredentialsByProvider | null;
	modelsByProvider: AgentModelsByProvider;
	isLoading: boolean;
	projectId: string;
	warnMissingCredentials?: boolean;
	disabled?: boolean;
	/** The selected model uses the n8n Connect (AI Gateway) managed credential. */
	isManagedCredential?: boolean;
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
const aiGateway = useAiGateway();

// Reflect available n8n credits as a pill on the managed option; refresh on mount.
const aiGatewayBalancePill = computed(() => {
	const balance = aiGateway.balance.value;
	if (balance === undefined) return undefined;
	const depleted = balance <= 0;
	return {
		text: depleted
			? i18n.baseText('aiGateway.wallet.noCredits')
			: i18n.baseText('aiGateway.wallet.balanceRemaining', {
					interpolate: { balance: `$${Number(balance).toFixed(2)}` },
				}),
		type: depleted ? ('danger' as const) : ('default' as const),
	};
});

onMounted(() => {
	// Load the gateway config so `isCredentialTypeSupported` can gate the managed
	// option, and the wallet for the balance. Both self-guard when disabled.
	void aiGateway.fetchConfig();
	if (aiGateway.isEnabled.value) void aiGateway.fetchWallet();
});
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

const selectedCredentialName = computed(() =>
	isManagedCredential
		? i18n.baseText('aiGateway.credentialMode.n8nConnect.title')
		: selectedCredential.value?.name,
);

const isCredentialsMissing = computed(
	() =>
		!isManagedCredential &&
		warnMissingCredentials &&
		selectedModel?.provider &&
		!selectedCredential.value,
);

const selectedLabel = computed(
	() => selectedModel?.name ?? i18n.baseText('agents.modelSelector.defaultLabel'),
);

const triggerCredentialTypeName = computed(() =>
	selectedModel
		? AGENT_MODEL_PROVIDER_DEFINITIONS[selectedModel.provider].credentialTypes[0]
		: null,
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
	const isAiGatewayManagedSelected = selectedProviderCredentialId === AI_GATEWAY_MANAGED_TAG;
	const hasProviderCredential =
		isAiGatewayManagedSelected ||
		(selectedProviderCredentialId !== null &&
			credentialOptions.some((credential) => credential.id === selectedProviderCredentialId));

	// Flat list of the project's existing credentials for this provider; selecting
	// one activates it and keeps the dropdown open so a model can be picked next.
	// Credentials render without a leading icon — only models carry one.
	const credentialItems: MenuItem[] = credentialOptions.map<MenuItem>((credential) => ({
		id: buildMenuItemId(provider, 'select', credential.id),
		label: credential.name,
		disabled: false,
		checked: selectedProviderCredentialId === credential.id,
		keepOpen: true,
		data: { provider },
	}));

	// "+ Create credential" — the plus sits on the right (trailing), no leading icon.
	const createCredentialItems: MenuItem[] = canCreateCredentials.value
		? credentialTypes.length === 1
			? [
					{
						id: buildMenuItemId(provider, 'configure', credentialTypes[0]),
						label: i18n.baseText('agents.modelSelector.configureCredentials'),
						disabled: false,
						data: { provider, trailingIcon: 'plus' },
					},
				]
			: [
					{
						id: `${provider}::configure`,
						label: i18n.baseText('agents.modelSelector.configureCredentials'),
						disabled: false,
						data: { provider },
						children: credentialTypes.map<MenuItem>((credentialType) => ({
							id: buildMenuItemId(provider, 'configure', credentialType),
							label: getCredentialTypeDisplayName(credentialType),
							disabled: false,
							data: { provider, trailingIcon: 'plus' },
						})),
					},
				]
		: [];

	const isAiGatewayManagedAvailable =
		isAiGatewayManagedSelected ||
		(aiGateway.isEnabled.value && aiGateway.isCredentialTypeSupported(credentialTypes[0]));

	const n8nCreditsItems: MenuItem[] = isAiGatewayManagedAvailable
		? [
				{
					id: buildMenuItemId(provider, 'n8nConnect', credentialTypes[0]),
					label: i18n.baseText('aiGateway.credentialMode.n8nConnect.title'),
					disabled: false,
					// Active state shows as the native right-aligned checkmark; the row
					// toggles the managed tag and keeps the dropdown open. No leading icon.
					checked: isAiGatewayManagedSelected,
					keepOpen: true,
					data: {
						provider,
						// Green "remaining" pill (N8nActionPill), matching the workflow node.
						actionPill: aiGatewayBalancePill.value,
					},
				},
			]
		: [];

	const freeOpenAiCreditsItems: MenuItem[] =
		provider === FREE_OPENAI_CREDITS_PROVIDER && canUseFreeOpenAiCredits.value
			? [
					{
						id: buildMenuItemId(
							FREE_OPENAI_CREDITS_PROVIDER,
							'freeCredits',
							FREE_OPENAI_CREDITS_MODEL,
						),
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
		? models.map<MenuItem>((model) => ({
				id: buildMenuItemId(provider, 'model', model.model),
				label: truncateBeforeLast(model.name, MAX_MODEL_NAME_CHARS),
				disabled: false,
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
						},
					]
				: [];

	// Group the submenu into a "Connect to <provider>" credentials section and a
	// "Models" section, each introduced by a non-interactive header row.
	const connectItems: MenuItem[] = [
		...freeOpenAiCreditsItems,
		...n8nCreditsItems,
		...credentialItems,
		...createCredentialItems,
	];
	const connectHeader: MenuItem[] = connectItems.length
		? [
				{
					id: `${provider}::header::connect`,
					label: i18n.baseText('agents.modelSelector.connectTo', {
						interpolate: { provider: definition.displayName },
					}),
					header: true,
					disabled: true,
				},
			]
		: [];

	const modelsSection: MenuItem[] = [...modelItems, ...statusItems];
	const modelsHeader: MenuItem[] = modelsSection.length
		? [
				{
					id: `${provider}::header::models`,
					label: i18n.baseText('agents.modelSelector.models'),
					header: true,
					disabled: true,
					// Separator above the models section when a connect section precedes it.
					divided: connectItems.length > 0,
				},
			]
		: [];

	return {
		id: provider,
		label: definition.displayName,
		data: {
			provider,
			credentialType: credentialTypes[0],
			// Providers covered by n8n Connect get the same green "Free credits" N8nActionPill
			// as the node creator.
			actionPill: isAiGatewayManagedAvailable
				? { text: i18n.baseText('generic.freeCredits'), type: 'default' as const }
				: undefined,
		},
		children: [...connectHeader, ...connectItems, ...modelsHeader, ...modelsSection],
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

async function onSelect(id: string) {
	if (disabled) return;

	const parsed = parseMenuItemId(id);
	if (!parsed || !isAgentModelProvider(parsed.provider)) return;
	const { provider: providerId, action, value } = parsed;

	if (action === 'configure') {
		openNewCredential(value);
		return;
	}

	if (action === 'select') {
		emit('selectCredential', providerId, value);
		return;
	}

	if (action === 'n8nConnect') {
		toggleN8nCredits(providerId, credentials?.[providerId] !== AI_GATEWAY_MANAGED_TAG);
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

function toggleN8nCredits(provider: AgentModelProvider, enabled: boolean) {
	if (disabled) return;
	emit('selectCredential', provider, enabled ? AI_GATEWAY_MANAGED_TAG : null);
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
			<ModelSelectorTriggerIcon
				:credential-type-name="triggerCredentialTypeName"
				:class="ui.class"
			/>
		</template>

		<template #item-leading="{ item, ui }">
			<ModelSelectorItemLeadingIcon :item="item" :class="ui.class" />
		</template>
	</N8nAiModelSelectorDropdown>
</template>
