<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue';
import { N8nNavigationDropdown, N8nIcon, N8nButton, N8nText, N8nAvatar } from '@n8n/design-system';
import { type ComponentProps } from 'vue-component-type-helpers';
import { PROVIDER_CREDENTIAL_TYPE_MAP, chatHubProviderSchema } from '@n8n/api-types';
import type {
	ChatHubProvider,
	ChatHubConversationModel,
	ChatHubLLMProvider,
	ChatHubCustomAgentModel,
} from '@n8n/api-types';
import { providerDisplayNames } from '@/features/ai/chatHub/constants';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { onClickOutside } from '@vueuse/core';
import { useI18n } from '@n8n/i18n';

import type { CredentialsMap } from '../chat.types';
import CredentialSelectorModal from './CredentialSelectorModal.vue';
import { useUIStore } from '@/stores/ui.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useChatStore } from '@/features/ai/chatHub/chat.store';
import ChatAgentAvatar from '@/features/ai/chatHub/components/ChatAgentAvatar.vue';

const props = withDefaults(
	defineProps<{
		selectedModel: ChatHubConversationModel | null;
		includeCustomAgents?: boolean;
		credentials: CredentialsMap;
	}>(),
	{
		includeCustomAgents: true,
	},
);

const emit = defineEmits<{
	change: [ChatHubConversationModel];
	createAgent: [];
	selectCredential: [provider: ChatHubProvider, credentialId: string];
}>();

function handleSelectCredentials(provider: ChatHubProvider, id: string) {
	emit('selectCredential', provider, id);
}

const i18n = useI18n();
const chatStore = useChatStore();
const dropdownRef = useTemplateRef('dropdownRef');
const credentialSelectorProvider = ref<Exclude<ChatHubProvider, 'n8n' | 'custom-agent'> | null>(
	null,
);
const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();

const selectedModelDto = computed(() => {
	if (!props.selectedModel || !chatStore.models) return null;
	return chatStore.getModel(props.selectedModel) ?? null;
});

const credentialsName = computed(() =>
	props.selectedModel
		? credentialsStore.getCredentialById(props.credentials[props.selectedModel.provider] ?? '')
				?.name
		: undefined,
);

const menu = computed(() => {
	const agents = chatStore.models?.['custom-agent'].models;
	const agentOptions = (agents ?? []).map<
		ComponentProps<typeof N8nNavigationDropdown>['menu'][number]
	>((agent) => ({
		id: `agent::${(agent.model as ChatHubCustomAgentModel).agentId}`,
		title: agent.name,
		disabled: false,
	}));

	const agentMenu: ComponentProps<typeof N8nNavigationDropdown>['menu'][number] = {
		id: 'custom-agents',
		title: i18n.baseText('chatHub.agent.customAgents'),
		icon: 'robot',
		iconSize: 'large',
		iconMargin: false,
		submenu: [
			...agentOptions,
			...(agentOptions.length > 0 ? [{ isDivider: true as const, id: 'divider' }] : []),
			{
				id: 'agent::new',
				icon: 'plus',
				title: i18n.baseText('chatHub.agent.newAgent'),
				disabled: false,
			},
		],
	};

	const providerMenus = chatHubProviderSchema.options
		.filter(
			(provider) =>
				provider !== 'custom-agent' && (!props.includeCustomAgents ? provider !== 'n8n' : true),
		) // hide n8n agent for now
		.map((provider) => {
			const models = chatStore.models?.[provider].models ?? [];
			const error = chatStore.models?.[provider].error;

			const modelOptions =
				models.length > 0
					? models
							.filter((model) => model.model.provider !== 'custom-agent')
							.map<ComponentProps<typeof N8nNavigationDropdown>['menu'][number]>((model) => {
								const identifier =
									model.model.provider === 'n8n'
										? model.model.workflowId
										: model.model.provider !== 'custom-agent'
											? model.model.model
											: model.model.agentId;

								return {
									id: `${provider}::${identifier}`,
									title: model.name,
									disabled: false,
								};
							})
					: error
						? [{ id: `${provider}::error`, value: null, disabled: true, title: error }]
						: [];

			const submenu = modelOptions.concat([
				...(provider !== 'n8n' && modelOptions.length > 0
					? [{ isDivider: true as const, id: 'divider' }]
					: []),
			]);

			if (provider !== 'n8n') {
				submenu.push({
					id: `${provider}::configure`,
					icon: 'settings',
					title: 'Configure credentials...',
					disabled: false,
				});
			}

			return {
				id: provider,
				title: providerDisplayNames[provider],
				submenu,
			};
		});

	return props.includeCustomAgents ? [agentMenu, ...providerMenus] : providerMenus;
});

const selectedLabel = computed(() => {
	if (!selectedModelDto.value) return 'Select model';
	return selectedModelDto.value.name;
});

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
	// Format is "provider::model" or "agent::id"
	const [type, value] = id.split('::');

	if (type === 'agent') {
		if (value === 'new') {
			emit('createAgent');
		} else {
			const agents = chatStore.models?.['custom-agent'].models;
			const selected = agents?.find(
				(agent) => agent.model.provider === 'custom-agent' && agent.model.agentId === value,
			);

			if (selected) {
				emit('change', selected.model);
			}
		}
		return;
	}

	// Format is "provider::identifier", where identifier is either "configure", model name, or workflow ID for n8n
	const [provider, identifier] = id.split('::');
	const parsedProvider = chatHubProviderSchema.safeParse(provider).data;

	if (!parsedProvider) {
		return;
	}

	if (identifier === 'configure' && parsedProvider !== 'n8n' && parsedProvider !== 'custom-agent') {
		openCredentialsSelectorOrCreate(parsedProvider);
		return;
	}

	const model = parsedProvider === 'n8n' ? null : identifier;
	const workflowId = parsedProvider === 'n8n' ? identifier : null;
	const selected = chatStore.models?.[parsedProvider].models
		.filter((m) => m.model.provider !== 'custom-agent')
		.find((m) =>
			m.model.provider === 'n8n'
				? m.model.workflowId === workflowId
				: m.model.provider !== 'custom-agent' && m.model.model === model,
		);

	if (!selected) {
		return;
	}

	emit('change', selected.model);
}

function handleCreateNewCredential(provider: ChatHubLLMProvider) {
	uiStore.openNewCredential(PROVIDER_CREDENTIAL_TYPE_MAP[provider]);
}

onClickOutside(
	computed(() => dropdownRef.value?.$el),
	() => dropdownRef.value?.close(),
);

// Reload models when credentials are updated
// TODO: fix duplicate requests
watch(
	() => props.credentials,
	(credentials) => {
		void chatStore.fetchChatModels(credentials);
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
				v-else-if="item.id.startsWith('agent::') && item.id !== 'agent::new'"
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
				:initial-value="credentials[credentialSelectorProvider] ?? null"
				@select="handleSelectCredentials"
				@create-new="handleCreateNewCredential"
			/>

			<ChatAgentAvatar
				v-if="selectedModelDto"
				:model="selectedModelDto.model"
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
