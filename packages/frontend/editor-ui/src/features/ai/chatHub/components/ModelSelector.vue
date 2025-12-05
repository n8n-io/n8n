<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue';
import { N8nNavigationDropdown, N8nIcon, N8nButton, N8nText, N8nAvatar } from '@n8n/design-system';
import { type ComponentProps } from 'vue-component-type-helpers';
import {
	PROVIDER_CREDENTIAL_TYPE_MAP,
	chatHubLLMProviderSchema,
	emptyChatModelsResponse,
} from '@n8n/api-types';
import type {
	ChatHubProvider,
	ChatHubLLMProvider,
	ChatModelDto,
	ChatModelsResponse,
	ChatHubConversationModel,
} from '@n8n/api-types';
import {
	CHAT_CREDENTIAL_SELECTOR_MODAL_KEY,
	CHAT_MODEL_BY_ID_SELECTOR_MODAL_KEY,
	providerDisplayNames,
} from '@/features/ai/chatHub/constants';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { onClickOutside } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';

import type { CredentialsMap } from '../chat.types';
import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import ChatAgentAvatar from '@/features/ai/chatHub/components/ChatAgentAvatar.vue';
import {
	flattenModel,
	fromStringToModel,
	isLlmProviderModel,
	stringifyModel,
} from '@/features/ai/chatHub/chat.utils';
import { fetchChatModelsApi } from '@/features/ai/chatHub/chat.api';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useSettingsStore } from '@/app/stores/settings.store';
import { getResourcePermissions } from '@n8n/permissions';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { truncateBeforeLast } from '@n8n/utils';

const NEW_AGENT_MENU_ID = 'agent::new';
const MAX_AGENT_NAME_CHARS = 30;
const MAX_AGENT_NAME_CHARS_MENU = 45;

const {
	selectedAgent,
	includeCustomAgents = true,
	credentials,
	text,
	warnMissingCredentials = false,
} = defineProps<{
	selectedAgent: ChatModelDto | null;
	includeCustomAgents?: boolean;
	credentials: CredentialsMap | null;
	text?: boolean;
	warnMissingCredentials?: boolean;
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
const agents = ref<ChatModelsResponse>(emptyChatModelsResponse);
const isLoading = ref(false);
const dropdownRef = useTemplateRef('dropdownRef');
const uiStore = useUIStore();
const settingStore = useSettingsStore();
const credentialsStore = useCredentialsStore();
const projectStore = useProjectsStore();
const telemetry = useTelemetry();

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

const menu = computed(() => {
	const menuItems: (typeof N8nNavigationDropdown)['menu'] = [];
	const fullNamesMap: Record<string, string> = {};

	if (includeCustomAgents) {
		const customAgents = isLoading.value
			? []
			: [...agents.value['custom-agent'].models, ...agents.value['n8n'].models].map((agent) => {
					const id = stringifyModel(agent.model);
					fullNamesMap[id] = agent.name;
					return {
						id,
						title: truncateBeforeLast(agent.name, MAX_AGENT_NAME_CHARS_MENU),
						disabled: false,
					};
				});

		menuItems.push({
			id: 'custom-agents',
			title: i18n.baseText('chatHub.agent.customAgents'),
			icon: 'robot',
			iconSize: 'large',
			iconMargin: false,
			submenu: [
				...(isLoading.value
					? [
							{ id: 'loading', title: i18n.baseText('generic.loadingEllipsis'), disabled: true },
							{ isDivider: true as const, id: 'divider' },
						]
					: customAgents.length > 0
						? [...customAgents, { isDivider: true as const, id: 'divider' }]
						: []),
				{
					id: NEW_AGENT_MENU_ID,
					icon: 'plus',
					title: i18n.baseText('chatHub.agent.newAgent'),
					disabled: false,
				},
			],
		});
	}

	for (const provider of chatHubLLMProviderSchema.options) {
		const settings = settingStore.moduleSettings?.['chat-hub']?.providers[provider];

		// Filter out disabled providers from the menu
		if (settings && !settings.enabled) continue;
		const configureMenu = {
			id: `${provider}::configure`,
			icon: 'settings' as const,
			title: i18n.baseText('chatHub.agent.configureCredentials'),
			disabled: false,
		};

		if (isLoading.value) {
			menuItems.push({
				id: provider,
				title: providerDisplayNames[provider],
				submenu: [
					configureMenu,
					{ isDivider: true as const, id: 'divider' },
					{
						id: `${provider}::loading`,
						title: i18n.baseText('generic.loadingEllipsis'),
						disabled: true,
					},
				],
			});
			continue;
		}

		const theAgents = [...agents.value[provider].models];

		// Add any manually defined models in settings
		for (const model of settings?.allowedModels ?? []) {
			if (model.isManual) {
				theAgents.push({
					name: model.displayName,
					description: '',
					model: {
						provider,
						model: model.model,
					},
					createdAt: '',
					updatedAt: null,
					// Assume file attachment and tools are supported
					metadata: {
						inputModalities: ['text', 'image', 'audio', 'video', 'file'],
						capabilities: {
							functionCalling: true,
						},
					},
				});
			}
		}

		const error = agents.value[provider].error;
		const agentOptions =
			theAgents.length > 0
				? theAgents
						.filter(
							(agent) =>
								agent.model.provider === 'n8n' ||
								// Filter out models not allowed in settings
								!settings ||
								settings.allowedModels.length === 0 ||
								settings.allowedModels.some(
									(m) => 'model' in agent.model && m.model === agent.model.model,
								),
						)
						.map<ComponentProps<typeof N8nNavigationDropdown>['menu'][number]>((agent) => {
							const id = stringifyModel(agent.model);
							fullNamesMap[id] = agent.name;
							return {
								id,
								title: truncateBeforeLast(agent.name, MAX_AGENT_NAME_CHARS_MENU),
								disabled: false,
							};
						})
						.filter((item, index, self) => self.findIndex((i) => i.id === item.id) === index)
				: error
					? [{ id: `${provider}::error`, value: null, disabled: true, title: error }]
					: [];

		const submenu = agentOptions.concat([
			...(agentOptions.length > 0 ? [{ isDivider: true as const, id: 'divider' }] : []),
			...(settings?.allowedModels.length === 0
				? [
						// Disallow "Add model" if models are limited in settings
						{
							id: `${provider}::add-model`,
							icon: 'plus',
							title: i18n.baseText('chatHub.agent.addModel'),
							disabled: false,
						} as const,
					]
				: []),
		]);

		submenu.unshift(
			configureMenu,
			...(submenu.length > 1 ? [{ isDivider: true as const, id: 'divider' }] : []),
		);

		menuItems.push({
			id: provider,
			title: providerDisplayNames[provider],
			submenu,
		});
	}

	return { items: menuItems, fullNames: fullNamesMap };
});

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
			onCreateNew: handleCreateNewCredential,
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

function handleCreateNewCredential(provider: ChatHubLLMProvider) {
	const credentialType = PROVIDER_CREDENTIAL_TYPE_MAP[provider];

	telemetry.track('User opened Credential modal', {
		credential_type: credentialType,
		source: 'chat',
		new_credential: true,
		workflow_id: null,
	});

	uiStore.openNewCredential(credentialType);
}

onClickOutside(
	computed(() => dropdownRef.value?.$el),
	() => dropdownRef.value?.close(),
);

// Update agents when credentials are updated
watch(
	() => credentials,
	async (credentials) => {
		if (credentials) {
			isLoading.value = true;
			try {
				agents.value = await fetchChatModelsApi(useRootStore().restApiContext, { credentials });
			} finally {
				isLoading.value = false;
			}
		}
	},
	{ immediate: true },
);

defineExpose({
	open: () => dropdownRef.value?.open(),
	openCredentialSelector: (provider: ChatHubLLMProvider) =>
		openCredentialsSelectorOrCreate(provider),
});
</script>

<template>
	<N8nNavigationDropdown
		ref="dropdownRef"
		:submenu-class="$style.component"
		:menu="menu.items"
		teleport
		@select="onSelect"
	>
		<template #item-icon="{ item }">
			<CredentialIcon
				v-if="item.id in PROVIDER_CREDENTIAL_TYPE_MAP"
				:credential-type-name="PROVIDER_CREDENTIAL_TYPE_MAP[item.id as ChatHubLLMProvider]"
				:size="16"
				:class="$style.menuIcon"
			/>
			<N8nAvatar
				v-else-if="item.id.startsWith('n8n::') || item.id.startsWith('custom-agent::')"
				:class="$style.avatarIcon"
				:first-name="menu.fullNames[item.id] || item.title"
				size="xsmall"
			/>
		</template>

		<N8nButton :class="$style.dropdownButton" type="secondary" :text="text">
			<ChatAgentAvatar
				v-if="selectedAgent"
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
	</N8nNavigationDropdown>
</template>

<style lang="scss" module>
.component {
	& :global(.el-popper) {
		/* Enforce via text truncation instead */
		max-width: unset !important;
	}
}

.dropdownButton {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);

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

.menuIcon {
	flex-shrink: 0;
}

.avatarIcon {
	margin-right: var(--spacing--2xs);
}
</style>
