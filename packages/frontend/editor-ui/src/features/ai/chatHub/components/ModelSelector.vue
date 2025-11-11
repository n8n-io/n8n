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
} from '@n8n/api-types';
import { providerDisplayNames } from '@/features/ai/chatHub/constants';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { onClickOutside } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';

import type { CredentialsMap } from '../chat.types';
import CredentialSelectorModal from './CredentialSelectorModal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import ChatAgentAvatar from '@/features/ai/chatHub/components/ChatAgentAvatar.vue';
import {
	flattenModel,
	fromStringToModel,
	isMatchedAgent,
	stringifyModel,
} from '@/features/ai/chatHub/chat.utils';
import { fetchChatModelsApi } from '@/features/ai/chatHub/chat.api';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useTelemetry } from '@/app/composables/useTelemetry';

const NEW_AGENT_MENU_ID = 'agent::new';

const {
	selectedAgent,
	includeCustomAgents = true,
	credentials,
} = defineProps<{
	selectedAgent: ChatModelDto | null;
	includeCustomAgents?: boolean;
	credentials: CredentialsMap | null;
}>();

const emit = defineEmits<{
	change: [ChatModelDto];
	createCustomAgent: [];
	selectCredential: [provider: ChatHubProvider, credentialId: string];
}>();

function handleSelectCredentials(provider: ChatHubProvider, id: string) {
	emit('selectCredential', provider, id);
}

const i18n = useI18n();
const agents = ref<ChatModelsResponse>(emptyChatModelsResponse);
const dropdownRef = useTemplateRef('dropdownRef');
const credentialSelectorProvider = ref<ChatHubLLMProvider | null>(null);
const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();
const telemetry = useTelemetry();

const credentialsName = computed(() =>
	selectedAgent
		? credentialsStore.getCredentialById(credentials?.[selectedAgent.model.provider] ?? '')?.name
		: undefined,
);

const menu = computed(() => {
	const menuItems: (typeof N8nNavigationDropdown)['menu'] = [];

	if (includeCustomAgents) {
		const customAgents = [
			...agents.value['custom-agent'].models,
			...agents.value['n8n'].models,
		].map((agent) => ({
			id: stringifyModel(agent.model),
			title: agent.name,
			disabled: false,
		}));

		menuItems.push({
			id: 'custom-agents',
			title: i18n.baseText('chatHub.agent.customAgents'),
			icon: 'robot',
			iconSize: 'large',
			iconMargin: false,
			submenu: [
				...customAgents,
				...(customAgents.length > 0 ? [{ isDivider: true as const, id: 'divider' }] : []),
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
		const theAgents = agents.value[provider].models;
		const error = agents.value[provider].error;
		const agentOptions =
			theAgents.length > 0
				? theAgents
						.filter((agent) => agent.model.provider !== 'custom-agent')
						.map<ComponentProps<typeof N8nNavigationDropdown>['menu'][number]>((agent) => ({
							id: stringifyModel(agent.model),
							title: agent.name,
							disabled: false,
						}))
				: error
					? [{ id: `${provider}::error`, value: null, disabled: true, title: error }]
					: [];

		const submenu = agentOptions.concat([
			...(agentOptions.length > 0 ? [{ isDivider: true as const, id: 'divider' }] : []),
			{
				id: `${provider}::configure`,
				icon: 'settings',
				title: 'Configure credentials...',
				disabled: false,
			},
		]);

		menuItems.push({
			id: provider,
			title: providerDisplayNames[provider],
			submenu,
		});
	}

	return menuItems;
});

const selectedLabel = computed(() => selectedAgent?.name ?? 'Select model');

function openCredentialsSelectorOrCreate(provider: ChatHubLLMProvider) {
	const credentialType = PROVIDER_CREDENTIAL_TYPE_MAP[provider];
	const existingCredentials = credentialsStore.getCredentialsByType(credentialType);

	if (existingCredentials.length === 0) {
		uiStore.openNewCredential(credentialType);
		return;
	}

	credentialSelectorProvider.value = provider;
	uiStore.openModal('chatCredentialSelector');
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

	if (
		identifier === 'configure' &&
		parsedModel.provider !== 'n8n' &&
		parsedModel.provider !== 'custom-agent'
	) {
		openCredentialsSelectorOrCreate(parsedModel.provider);
		return;
	}

	const selected = agents.value[parsedModel.provider].models.find((a) =>
		isMatchedAgent(a, parsedModel),
	);

	if (!selected) {
		return;
	}

	telemetry.track('User selected model or agent', {
		...flattenModel(selected.model),
		is_custom: selected.model.provider === 'custom-agent',
	});

	emit('change', selected);
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
			agents.value = await fetchChatModelsApi(useRootStore().restApiContext, { credentials });
		}
	},
	{ immediate: true },
);

defineExpose({
	open: () => dropdownRef.value?.open(),
});
</script>

<template>
	<N8nNavigationDropdown ref="dropdownRef" :menu="menu" @select="onSelect">
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
				:first-name="item.title"
				size="xsmall"
			/>
		</template>

		<N8nButton :class="$style.dropdownButton" type="secondary" text>
			<CredentialSelectorModal
				v-if="credentialSelectorProvider"
				:key="credentialSelectorProvider"
				:provider="credentialSelectorProvider"
				:initial-value="credentials?.[credentialSelectorProvider] ?? null"
				@select="handleSelectCredentials"
				@create-new="handleCreateNewCredential"
			/>

			<ChatAgentAvatar
				v-if="selectedAgent"
				:agent="selectedAgent"
				:size="credentialsName ? 'md' : 'sm'"
				:class="$style.icon"
			/>
			<div :class="$style.selected">
				<div>
					{{ selectedLabel }}
				</div>
				<N8nText v-if="credentialsName" size="xsmall" color="text-light">
					{{ credentialsName }}
				</N8nText>
			</div>
			<N8nIcon icon="chevron-down" size="medium" />
		</N8nButton>
	</N8nNavigationDropdown>
</template>

<style lang="scss" module>
.dropdownButton {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);

	/* disable underline */
	text-decoration: none !important;
}

.selected {
	display: flex;
	flex-direction: column;
	align-items: start;
	gap: var(--spacing--4xs);
	max-width: 200px;

	& > div {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
	}
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
