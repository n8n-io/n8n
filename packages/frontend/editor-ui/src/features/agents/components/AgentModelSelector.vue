<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
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
import { useModelCatalog } from '../composables/useModelCatalog';
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
	boundCredentialId = null,
	disabled = false,
	credentialModalAppendToBody = false,
} = defineProps<{
	selectedModel: AgentModelOption | null;
	credentials: AgentCredentialsByProvider | null;
	modelsByProvider: AgentModelsByProvider;
	isLoading: boolean;
	projectId: string;
	warnMissingCredentials?: boolean;
	/**
	 * The credential the host has actually persisted for this model. The picker
	 * falls back to any credential of the provider, so only this tells us
	 * whether the saved config can run.
	 */
	boundCredentialId?: string | null;
	disabled?: boolean;
	/** Append credential modals to body (needed when embedded in the Memory dialog). */
	credentialModalAppendToBody?: boolean;
}>();

const emit = defineEmits<{
	change: [AgentModelSelection];
	selectCredential: [provider: AgentModelProvider, credentialId: string | null];
	configureCredential: [provider: AgentModelProvider];
}>();

const i18n = useI18n();
const dropdownRef = useTemplateRef('dropdownRef');
const credentialsStore = useCredentialsStore();
const projectsStore = useProjectsStore();
const uiStore = useUIStore();
const aiGateway = useAiGateway();
const { ensureLoaded, getDefaultModelForPicker, getVerificationStatus } = useModelCatalog();
const pendingDefaultCredential = ref<{
	provider: AgentModelProvider;
	credentialId: string;
} | null>(null);
const forceModelOptionsDisabled = ref(false);
const isResolvingDefaultModel = computed(
	() => pendingDefaultCredential.value !== null || forceModelOptionsDisabled.value,
);

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

// Derived rather than passed in: the selection is already in `credentials`, and a
// prop duplicating it drifted — the memory panel never passed it, and the
// sub-agents panel derived it from the persisted mapping, which is stale while a
// per-difficulty choice is still pending.
const isManagedCredential = computed(() => selectedCredentialId.value === AI_GATEWAY_MANAGED_TAG);

const selectedCredentialName = computed(() =>
	isManagedCredential.value
		? i18n.baseText('aiGateway.credentialMode.n8nConnect.title')
		: selectedCredential.value?.name,
);

const isCredentialsMissing = computed(
	() =>
		!isManagedCredential.value &&
		warnMissingCredentials &&
		Boolean(selectedModel?.provider) &&
		!(boundCredentialId && credentialsStore.getCredentialById(boundCredentialId)),
);

const selectedLabel = computed(
	() => selectedModel?.name ?? i18n.baseText('agents.modelSelector.defaultLabel'),
);

const triggerCredentialTypeName = computed(() =>
	selectedModel ? getProviderCredentialTypes(selectedModel.provider)[0] : null,
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
	const modelsUnavailable = modelsByProvider[provider]?.unavailable === true;
	const credentialTypes = getProviderCredentialTypes(provider);
	const isAiGatewayManagedSelected = selectedProviderCredentialId === AI_GATEWAY_MANAGED_TAG;
	const hasProviderCredential =
		isAiGatewayManagedSelected ||
		(selectedProviderCredentialId !== null &&
			credentialOptions.some((credential) => credential.id === selectedProviderCredentialId));

	// Existing credentials as selectable rows; `keepOpen` lets a model be picked next.
	const credentialItems: MenuItem[] = credentialOptions.map<MenuItem>((credential) => ({
		id: buildMenuItemId(provider, 'select', credential.id),
		label: credential.name,
		disabled: false,
		checked: selectedModel?.provider === provider && selectedProviderCredentialId === credential.id,
		keepOpen: true,
		data: { provider },
	}));

	const createCredentialItems: MenuItem[] = canCreateCredentials.value
		? credentialTypes.length === 1
			? [
					{
						id: buildMenuItemId(provider, 'configure', credentialTypes[0]),
						label: i18n.baseText('agents.modelSelector.configureCredentials'),
						disabled: false,
						data: { provider, leadingIcon: 'plus' },
					},
				]
			: [
					{
						id: `${provider}::configure`,
						label: i18n.baseText('agents.modelSelector.configureCredentials'),
						disabled: false,
						data: { provider, leadingIcon: 'plus' },
						children: credentialTypes.map<MenuItem>((credentialType) => ({
							id: buildMenuItemId(provider, 'configure', credentialType),
							label: getCredentialTypeDisplayName(credentialType),
							disabled: false,
							data: { provider, leadingIcon: 'plus' },
						})),
					},
				]
		: [];

	// The type the gateway actually serves, which for a multi-credential-type
	// provider need not be the first one listed.
	const gatewayServedCredentialType = aiGateway.isEnabled.value
		? credentialTypes.find((credentialType) => aiGateway.canServeCredentialType(credentialType))
		: undefined;
	const isAiGatewayManagedAvailable =
		isAiGatewayManagedSelected || gatewayServedCredentialType !== undefined;

	const n8nCreditsItems: MenuItem[] = isAiGatewayManagedAvailable
		? [
				{
					// `parseMenuItemId` requires a value segment, so this cannot be dropped.
					id: buildMenuItemId(
						provider,
						'n8nConnect',
						gatewayServedCredentialType ?? credentialTypes[0],
					),
					label: i18n.baseText('aiGateway.credentialMode.n8nConnect.title'),
					disabled: false,
					checked: isAiGatewayManagedSelected,
					keepOpen: true,
					data: {
						provider,
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
				disabled: isResolvingDefaultModel.value,
				checked: selectedModel?.provider === provider && selectedModel.model === model.model,
				data: {
					provider,
					loading: isResolvingDefaultModel.value,
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
							label: i18n.baseText(
								modelsUnavailable
									? 'agents.modelSelector.modelsUnavailable'
									: 'agents.modelSelector.noModels',
							),
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
			// Two independent offers, and an instance can have either: n8n Connect is
			// licensed separately from the one-time free OpenAI credits, which most
			// plans get instead of the gateway.
			badgeLabel:
				provider === FREE_OPENAI_CREDITS_PROVIDER && canUseFreeOpenAiCredits.value
					? i18n.baseText('agents.modelSelector.freeCredits.badge')
					: undefined,
			actionPill: isAiGatewayManagedAvailable
				? {
						text: i18n.baseText(aiGateway.creditsLabelKey.value),
						type:
							aiGateway.creditsLabelKey.value === 'generic.freeCredits'
								? ('default' as const)
								: ('info' as const),
					}
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
				// The provider's offer badges belong on the provider row, not on an
				// overflow row that just holds the rest of the search results.
				data: { ...providerItem.data, badgeLabel: undefined, actionPill: undefined },
			},
		];
	});
});

function selectCredentialAndResolveDefaultModel(
	provider: AgentModelProvider,
	credentialId: string,
) {
	void ensureLoaded(projectId);
	emit('selectCredential', provider, credentialId);
	pendingDefaultCredential.value = { provider, credentialId };
}

function getPendingDefaultModelResolution() {
	const pending = pendingDefaultCredential.value;
	if (!pending) return null;

	const pendingCredentials: AgentCredentialsByProvider = {
		...(credentials ?? {}),
		[pending.provider]: pending.credentialId,
	};
	const defaultModel = getDefaultModelForPicker(pendingCredentials, pending.provider);
	const status = getVerificationStatus(projectId, pending.provider, pending.credentialId);
	return { pending, defaultModel, status };
}

function handleDefaultModelResolution(result: ReturnType<typeof getPendingDefaultModelResolution>) {
	if (!result || result.status === 'idle' || result.status === 'loading') return;
	if (
		pendingDefaultCredential.value?.provider !== result.pending.provider ||
		pendingDefaultCredential.value.credentialId !== result.pending.credentialId
	) {
		return;
	}

	pendingDefaultCredential.value = null;
	if (result.status === 'resolved' && result.defaultModel) {
		emit('change', {
			provider: result.defaultModel.provider,
			model: result.defaultModel.model,
		});
	}
}

watch(getPendingDefaultModelResolution, handleDefaultModelResolution);

function openNewCredential(provider: AgentModelProvider, credentialType: string) {
	if (!disabled && canCreateCredentials.value) {
		uiStore.openNewCredential(
			credentialType,
			false,
			false,
			createCredentialProjectId.value,
			undefined,
			undefined,
			undefined,
			{
				hideAskAssistant: true,
				onCredentialCreated: function selectCreatedCredential(credential) {
					selectCredentialAndResolveDefaultModel(provider, credential.id);
				},
				...(credentialModalAppendToBody ? { appendToBody: true } : {}),
			},
		);
	}
}

async function onSelect(id: string) {
	if (disabled) return;

	const parsed = parseMenuItemId(id);
	if (!parsed || !isAgentModelProvider(parsed.provider)) return;
	const { provider: providerId, action, value } = parsed;

	if (action === 'configure') {
		emit('configureCredential', providerId);
		openNewCredential(providerId, value);
		return;
	}

	if (action === 'select') {
		selectCredentialAndResolveDefaultModel(providerId, value);
		return;
	}

	if (action === 'n8nConnect') {
		// Radio-style: selecting n8n credits always picks the managed tag. There's no
		// toggle-off — you switch away by choosing another credential.
		selectCredentialAndResolveDefaultModel(providerId, AI_GATEWAY_MANAGED_TAG);
		return;
	}

	if (action === 'freeCredits' && providerId === FREE_OPENAI_CREDITS_PROVIDER) {
		if (!canUseFreeOpenAiCredits.value) return;

		const credential = await claimCreditsAndGetCredential(
			'agentBuilderModelSelector',
			createCredentialProjectId.value,
		);

		if (!credential) return;

		selectCredentialAndResolveDefaultModel(providerId, credential.id);
		return;
	}

	if (action === 'model') {
		pendingDefaultCredential.value = null;
		emit('change', { provider: providerId, model: value });
	}
}

function openDropdown() {
	if (!disabled) dropdownRef.value?.open();
}

function setModelOptionsDisabled(disabled: boolean) {
	if (import.meta.env.DEV) forceModelOptionsDisabled.value = disabled;
}

defineExpose({
	open: openDropdown,
	setModelOptionsDisabled,
});
</script>

<template>
	<N8nAiModelSelectorDropdown
		ref="dropdownRef"
		:items="filteredMenu"
		:is-loading="isLoading || isResolvingDefaultModel"
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
