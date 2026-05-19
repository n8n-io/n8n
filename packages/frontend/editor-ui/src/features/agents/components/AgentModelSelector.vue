<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import {
	N8nButton,
	N8nDropdownMenu,
	N8nIcon,
	N8nText,
	N8nTooltip,
	type DropdownMenuItemProps,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { truncateBeforeLast } from '@n8n/utils';
import { getResourcePermissions } from '@n8n/permissions';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useUIStore } from '@/app/stores/ui.store';
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

const MAX_MODEL_NAME_CHARS = 45;
const MAX_SELECTED_NAME_CHARS = 30;
const MAX_SEARCH_RESULTS_PER_PROVIDER = 10;

type MenuItemData = {
	provider?: AgentModelProvider;
	description?: string;
	fullName?: string;
	parts?: string[];
	credentialType?: string;
};

type MenuItem = DropdownMenuItemProps<string, MenuItemData>;

const {
	selectedModel,
	credentials,
	modelsByProvider,
	isLoading,
	horizontal = false,
	warnMissingCredentials = false,
} = defineProps<{
	selectedModel: AgentModelOption | null;
	credentials: AgentCredentialsByProvider | null;
	modelsByProvider: AgentModelsByProvider;
	isLoading: boolean;
	horizontal?: boolean;
	warnMissingCredentials?: boolean;
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
const searchQuery = ref('');

const selectedCredentialId = computed(() =>
	selectedModel ? credentials?.[selectedModel.provider] : undefined,
);

const selectedCredentialName = computed(() =>
	selectedCredentialId.value
		? credentialsStore.getCredentialById(selectedCredentialId.value)?.name
		: undefined,
);

const isCredentialsMissing = computed(
	() => warnMissingCredentials && selectedModel?.provider && !selectedCredentialId.value,
);

const selectedLabel = computed(
	() => selectedModel?.name ?? i18n.baseText('agents.modelSelector.defaultLabel'),
);

const canCreateCredentials = computed(() => {
	return getResourcePermissions(projectsStore.personalProject?.scopes).credential.create;
});

function getProviderCredentialTypes(provider: AgentModelProvider): readonly string[] {
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

function credentialItemId(provider: AgentModelProvider, credentialId: string): string {
	return `${provider}::credential::${encodeURIComponent(credentialId)}`;
}

function createCredentialItemId(provider: AgentModelProvider, credentialType: string): string {
	return `${provider}::create::${encodeURIComponent(credentialType)}`;
}

function providerToMenuItem(provider: AgentModelProvider): MenuItem {
	const definition = AGENT_MODEL_PROVIDER_DEFINITIONS[provider];
	const credentialOptions = getCredentialsForProvider(provider);
	const selectedProviderCredentialId = credentials?.[provider] ?? null;
	const models = modelsByProvider[provider]?.models ?? [];
	const credentialTypes = getProviderCredentialTypes(provider);

	const credentialItems = credentialOptions.map<MenuItem>((credential) => ({
		id: credentialItemId(provider, credential.id),
		label: credential.name,
		icon: { type: 'icon', value: 'key-round' },
		checked: credential.id === selectedProviderCredentialId,
		data: { provider, credentialType: credential.type },
	}));

	const createCredentialItems = credentialTypes.flatMap<MenuItem>((credentialType) =>
		canCreateCredentials.value
			? [
					{
						id: createCredentialItemId(provider, credentialType),
						icon: { type: 'icon', value: 'plus' },
						label: i18n.baseText('agents.modelSelector.createCredential', {
							interpolate: { credential: getCredentialTypeDisplayName(credentialType) },
						}),
						disabled: false,
						data: { provider, credentialType },
					},
				]
			: [],
	);

	const modelItems = models.map<MenuItem>((model, index) => ({
		id: modelItemId(provider, model.model),
		label: truncateBeforeLast(model.name, MAX_MODEL_NAME_CHARS),
		disabled: false,
		divided: index === 0,
		data: {
			provider,
			description: model.description ?? undefined,
			fullName: `${model.name} ${model.model}`,
			credentialType: credentialTypes[0],
		},
	}));

	const statusItems: MenuItem[] = isLoading
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
		data: { provider, credentialType: credentialTypes[0] },
		children: [...credentialItems, ...createCredentialItems, ...modelItems, ...statusItems],
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

function isSearchableModelItem(item: MenuItem): boolean {
	return item.id.includes('::model::') && !item.disabled;
}

function collectMatchingModelItems(
	item: MenuItem,
	query: string,
	parts: string[],
	parentMatched = false,
): MenuItem[] {
	const children = item.children ?? [];
	const currentParts = [...parts, item.label];
	const labelMatched = item.label.toLowerCase().includes(query);
	const isMatched = parentMatched || labelMatched;

	if (children.length === 0) {
		const searchText = `${item.data?.fullName ?? item.label}`.toLowerCase();
		if (!isSearchableModelItem(item) || (!isMatched && !searchText.includes(query))) return [];
		return [
			{
				...item,
				divided: false,
				data: item.data ? { ...item.data, parts: currentParts } : undefined,
			},
		];
	}

	return children.flatMap((child) =>
		collectMatchingModelItems(child, query, currentParts, isMatched),
	);
}

const filteredMenu = computed(() => {
	const query = searchQuery.value.trim().toLowerCase();
	if (!query) return menu.value;

	return menu.value.flatMap<MenuItem>((providerItem) => {
		const results = collectMatchingModelItems(providerItem, query, []);
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
	if (canCreateCredentials.value) {
		uiStore.openNewCredential(credentialType);
	}
}

function onSelect(id: string) {
	const [providerId, action, rawValue] = id.split('::');
	if (!isAgentModelProvider(providerId) || !rawValue) return;

	const value = decodeURIComponent(rawValue);
	if (action === 'credential') {
		emit('selectCredential', providerId, value);
		return;
	}

	if (action === 'create') {
		openNewCredential(value);
		return;
	}

	if (action === 'model') {
		emit('change', { provider: providerId, model: value });
	}
}

function handleSearch(query: string) {
	searchQuery.value = query;
}

defineExpose({
	open: () => dropdownRef.value?.open(),
});
</script>

<template>
	<N8nDropdownMenu
		ref="dropdownRef"
		:items="filteredMenu"
		teleported
		placement="bottom-start"
		:extra-popper-class="[$style.component, searchQuery ? $style.searching : ''].join(' ')"
		searchable
		:empty-text="searchQuery ? i18n.baseText('agents.modelSelector.noMatch') : undefined"
		@search="handleSearch"
		@select="onSelect"
	>
		<template #trigger>
			<N8nButton
				variant="outline"
				:class="[$style.dropdownButton, horizontal && $style.dropdownButtonHorizontal]"
				size="large"
				data-test-id="agent-model-selector"
			>
				<CredentialIcon
					v-if="selectedModel"
					:credential-type-name="
						AGENT_MODEL_PROVIDER_DEFINITIONS[selectedModel.provider].credentialTypes[0]
					"
					:size="18"
					:class="$style.icon"
				/>
				<N8nIcon v-else icon="bot" size="medium" :class="$style.icon" />
				<div :class="[$style.selected, horizontal && $style.selectedHorizontal]">
					<N8nText>
						{{ truncateBeforeLast(selectedLabel, MAX_SELECTED_NAME_CHARS) }}
					</N8nText>
					<N8nText
						v-if="selectedCredentialName"
						:size="horizontal ? 'small' : 'xsmall'"
						color="text-light"
						data-test-id="agent-model-selector-credential"
					>
						{{ truncateBeforeLast(selectedCredentialName, MAX_SELECTED_NAME_CHARS) }}
					</N8nText>
					<N8nText v-else-if="isCredentialsMissing" size="xsmall" color="danger">
						<N8nIcon
							icon="node-validation-error"
							size="xsmall"
							:class="$style.credentialsMissingIcon"
						/>
						{{ i18n.baseText('agents.modelSelector.credentialsMissing') }}
					</N8nText>
				</div>
				<N8nIcon
					:class="horizontal && $style.chevronHorizontal"
					icon="chevron-down"
					size="medium"
				/>
			</N8nButton>
		</template>

		<template #item-leading="{ item }">
			<CredentialIcon
				v-if="item.data?.credentialType"
				:credential-type-name="item.data.credentialType"
				:size="16"
				:class="$style.menuIcon"
			/>
		</template>

		<template #item-label="{ item, ui }">
			<template v-if="item.data?.parts">
				<div :class="[$style.flattenedLabel, ui.class]">
					<template v-for="(part, index) in item.data.parts" :key="index">
						<N8nText v-if="index > 0" color="text-light" :class="$style.separator">
							<N8nIcon icon="chevron-right" size="small" />
						</N8nText>
						<N8nText
							size="medium"
							:color="index === item.data.parts.length - 1 ? 'text-dark' : 'text-base'"
						>
							{{ part }}
						</N8nText>
					</template>
				</div>
			</template>
			<N8nText v-else :class="ui.class" size="medium" color="text-dark">
				{{ item.label }}
			</N8nText>
		</template>

		<template #item-trailing="{ item, ui }">
			<N8nTooltip
				v-if="item.data?.description"
				:content="truncateBeforeLast(item.data.description, 200, 0)"
				:class="ui.class"
				:content-class="$style.tooltip"
				placement="right"
			>
				<N8nIcon icon="info" size="medium" color="text-light" :class="$style.infoIcon" />
			</N8nTooltip>
		</template>
	</N8nDropdownMenu>
</template>

<style lang="scss" module>
.component {
	z-index: var(--floating-ui--z);
	width: auto !important;
}

.dropdownButton {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	width: fit-content;
	padding-block: var(--spacing--2xs);
	text-decoration: none !important;
}

.credentialsMissingIcon {
	display: inline-block;
	margin-bottom: calc(-1 * var(--border-width));
}

.selected {
	display: flex;
	flex-direction: column;
	align-items: start;
	gap: var(--spacing--4xs);
}

.dropdownButtonHorizontal {
	width: 100%;
	display: flex;
	justify-content: stretch;
	background-color: light-dark(var(--color--neutral-white), var(--color--neutral-950));
	border-radius: var(--radius--2xs);

	> div {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	&:hover {
		border-color: var(--border-color--strong);
	}
}

.selectedHorizontal {
	flex-direction: row;
	align-items: center;
	gap: var(--spacing--xs);
	flex: 1;
	min-width: 0;
	overflow: hidden;

	> div {
		font-weight: var(--font-weight--bold);
		white-space: nowrap;
		text-overflow: ellipsis;
	}
}

.chevronHorizontal {
	align-self: flex-end;
	margin-bottom: var(--spacing--5xs);
}

.icon {
	flex-shrink: 0;
	margin-block: calc(-1 * var(--spacing--5xs));
}

.infoIcon,
.menuIcon {
	flex-shrink: 0;
}

.infoIcon {
	margin-inline: var(--spacing--5xs);
}

.tooltip {
	z-index: calc(var(--floating-ui--z) + 1) !important;
}

.flattenedLabel {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	overflow: hidden;
	flex-grow: 1;
	white-space: nowrap;
}

.separator {
	flex-shrink: 0;
	display: inline-flex;
	align-items: center;
}
</style>
