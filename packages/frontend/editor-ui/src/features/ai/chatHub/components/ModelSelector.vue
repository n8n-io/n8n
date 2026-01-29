<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { N8nDropdownMenu, N8nIcon, N8nButton, N8nText, N8nTooltip } from '@n8n/design-system';
import { PROVIDER_CREDENTIAL_TYPE_MAP } from '@n8n/api-types';
import type {
	ChatHubProvider,
	ChatHubLLMProvider,
	ChatModelDto,
	ChatHubConversationModel,
	ChatModelsResponse,
} from '@n8n/api-types';
import {
	CHAT_CREDENTIAL_SELECTOR_MODAL_KEY,
	CHAT_MODEL_BY_ID_SELECTOR_MODAL_KEY,
	MAX_AGENT_NAME_CHARS,
	NEW_AGENT_MENU_ID,
} from '@/features/ai/chatHub/constants';
import { useI18n } from '@n8n/i18n';

import type { CredentialsMap } from '../chat.types';
import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import ChatAgentAvatar from '@/features/ai/chatHub/components/ChatAgentAvatar.vue';
import {
	flattenModel,
	fromStringToModel,
	isLlmProviderModel,
} from '@/features/ai/chatHub/chat.utils';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useSettingsStore } from '@/app/stores/settings.store';
import { getResourcePermissions } from '@n8n/permissions';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { truncateBeforeLast } from '@n8n/utils';
import ChatProviderAvatar from './ChatProviderAvatar.vue';
import { applySearch, buildModelSelectorMenuItems } from '../model-selector.utils';

const {
	selectedAgent,
	includeCustomAgents = true,
	credentials,
	text,
	warnMissingCredentials = false,
	agents,
	isLoading,
} = defineProps<{
	selectedAgent: ChatModelDto | null;
	includeCustomAgents?: boolean;
	credentials: CredentialsMap | null;
	text?: boolean;
	warnMissingCredentials?: boolean;
	agents: ChatModelsResponse;
	isLoading: boolean;
}>();

const emit = defineEmits<{
	change: [ChatHubConversationModel];
	createCustomAgent: [];
	selectCredential: [provider: ChatHubProvider, credentialId: string | null];
}>();

function handleSelectCredentials(provider: ChatHubProvider, id: string | null) {
	emit('selectCredential', provider, id);
}

function handleSelectModelById(provider: ChatHubLLMProvider, modelId: string) {
	emit('change', { provider, model: modelId });
}

const i18n = useI18n();
const dropdownRef = useTemplateRef('dropdownRef');
const uiStore = useUIStore();
const settingStore = useSettingsStore();
const credentialsStore = useCredentialsStore();
const projectStore = useProjectsStore();
const telemetry = useTelemetry();

const searchQuery = ref('');

const credentialsName = computed(() =>
	selectedAgent
		? credentialsStore.getCredentialById(credentials?.[selectedAgent.model.provider] ?? '')?.name
		: undefined,
);

const isCredentialsRequired = computed(() => isLlmProviderModel(selectedAgent?.model));
const isCredentialsMissing = computed(
	() =>
		warnMissingCredentials &&
		isCredentialsRequired.value &&
		selectedAgent?.model.provider &&
		!credentials?.[selectedAgent?.model.provider],
);

const menu = computed(() =>
	buildModelSelectorMenuItems(agents, {
		includeCustomAgents,
		isLoading,
		i18n,
		settings: settingStore.moduleSettings?.['chat-hub']?.providers ?? {},
	}),
);

const filteredMenu = computed(() => applySearch(menu.value, searchQuery.value, i18n));

const selectedLabel = computed(
	() => selectedAgent?.name ?? i18n.baseText('chatHub.models.selector.defaultLabel'),
);

const canCreateCredentials = computed(() => {
	return getResourcePermissions(projectStore.personalProject?.scopes).credential.create;
});

function openCredentialsSelectorOrCreate(provider: ChatHubLLMProvider) {
	const credentialType = PROVIDER_CREDENTIAL_TYPE_MAP[provider];
	const existingCredentials = credentialsStore.getCredentialsByType(credentialType);

	if (existingCredentials.length === 0 && canCreateCredentials.value) {
		uiStore.openNewCredential(credentialType);
		return;
	}

	uiStore.openModalWithData({
		name: CHAT_CREDENTIAL_SELECTOR_MODAL_KEY,
		data: {
			provider,
			initialValue: credentials?.[provider] ?? null,
			onSelect: handleSelectCredentials,
		},
	});
}

function openModelByIdSelector(provider: ChatHubLLMProvider) {
	uiStore.openModalWithData({
		name: CHAT_MODEL_BY_ID_SELECTOR_MODAL_KEY,
		data: {
			provider,
			initialValue: null,
			onSelect: handleSelectModelById,
		},
	});
}

function onSelect(id: string) {
	if (id === NEW_AGENT_MENU_ID) {
		emit('createCustomAgent');
		return;
	}

	const [, identifier] = id.split('::');
	const parsedModel = fromStringToModel(id);

	if (!parsedModel) {
		return;
	}

	if (identifier === 'configure' && isLlmProviderModel(parsedModel)) {
		openCredentialsSelectorOrCreate(parsedModel.provider);
		return;
	}

	if (identifier === 'add-model' && isLlmProviderModel(parsedModel)) {
		openModelByIdSelector(parsedModel.provider);
		return;
	}

	telemetry.track('User selected model or agent', {
		...flattenModel(parsedModel),
		is_custom: parsedModel.provider === 'custom-agent',
	});

	emit('change', parsedModel);
}

function handleSearch(query: string) {
	searchQuery.value = query.toLowerCase();
}

defineExpose({
	open: () => dropdownRef.value?.open(),
	openCredentialSelector: (provider: ChatHubLLMProvider) =>
		openCredentialsSelectorOrCreate(provider),
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
		:emptyText="searchQuery ? i18n.baseText('chatHub.models.selector.noMatch') : undefined"
		@search="handleSearch"
		@select="onSelect"
	>
		<template #trigger>
			<N8nButton
				:class="$style.dropdownButton"
				type="secondary"
				:text="text"
				data-test-id="chat-model-selector"
			>
				<ChatAgentAvatar
					:agent="selectedAgent"
					:size="credentialsName || !isCredentialsRequired ? 'md' : 'sm'"
					:class="$style.icon"
				/>
				<div :class="$style.selected">
					<div>
						{{ truncateBeforeLast(selectedLabel, MAX_AGENT_NAME_CHARS) }}
					</div>
					<N8nText v-if="credentialsName" size="xsmall" color="text-light">
						{{ truncateBeforeLast(credentialsName, MAX_AGENT_NAME_CHARS) }}
					</N8nText>
					<N8nText v-else-if="isCredentialsMissing" size="xsmall" color="danger">
						<N8nIcon
							icon="node-validation-error"
							size="xsmall"
							:class="$style.credentialsMissingIcon"
						/>
						{{ i18n.baseText('chatHub.agent.credentialsMissing') }}
					</N8nText>
				</div>
				<N8nIcon icon="chevron-down" size="medium" />
			</N8nButton>
		</template>

		<template #item-leading="{ item }">
			<ChatProviderAvatar
				v-if="item.data?.provider"
				:provider="item.data?.provider"
				:icon="item.icon"
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
				:popper-class="$style.tooltip"
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

	/* disable underline */
	text-decoration: none !important;
}

.credentialsMissingIcon {
	display: inline-block;
	margin-bottom: -1px;
}

.selected {
	display: flex;
	flex-direction: column;
	align-items: start;
	gap: var(--spacing--4xs);
}

.icon {
	flex-shrink: 0;
	margin-block: -4px;
}

.infoIcon,
.menuIcon {
	flex-shrink: 0;
}

.infoIcon {
	margin-inline: var(--spacing--5xs);
}

.avatarIcon {
	margin-right: var(--spacing--2xs);
}

.tooltip {
	/* higher than dropdown submenu */
	z-index: calc(999999 + 1000) !important;
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
