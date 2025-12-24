<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { N8nDropdownMenu, N8nIcon, N8nButton, N8nText, N8nTooltip } from '@n8n/design-system';
import type { DropdownMenuItemProps, IconOrEmoji } from '@n8n/design-system';
import { PROVIDER_CREDENTIAL_TYPE_MAP, chatHubLLMProviderSchema } from '@n8n/api-types';
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
	providerDisplayNames,
} from '@/features/ai/chatHub/constants';
import CredentialIcon from '@/features/credentials/components/CredentialIcon.vue';
import { useI18n } from '@n8n/i18n';

import type { CredentialsMap } from '../chat.types';
import { useUIStore } from '@/app/stores/ui.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import ChatAgentAvatar from '@/features/ai/chatHub/components/ChatAgentAvatar.vue';
import {
	personalAgentDefaultIcon,
	flattenModel,
	fromStringToModel,
	isLlmProviderModel,
	stringifyModel,
	workflowAgentDefaultIcon,
} from '@/features/ai/chatHub/chat.utils';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useSettingsStore } from '@/app/stores/settings.store';
import { getResourcePermissions } from '@n8n/permissions';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { truncateBeforeLast } from '@n8n/utils';

type MenuItem = DropdownMenuItemProps<string, string>;

const NEW_AGENT_MENU_ID = 'agent::new';
const MAX_AGENT_NAME_CHARS = 30;
const MAX_AGENT_NAME_CHARS_MENU = 45;

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
	const menuItems: MenuItem[] = [];

	if (includeCustomAgents) {
		// Create submenu items for each project
		const n8nAgentsSubmenu: MenuItem[] = [];

		if (isLoading) {
			n8nAgentsSubmenu.push({
				id: 'loading',
				label: i18n.baseText('generic.loadingEllipsis'),
				disabled: true,
			});
		} else if (agents.n8n.models.length === 0) {
			n8nAgentsSubmenu.push({
				id: 'no-agents',
				label: i18n.baseText('chatHub.workflowAgents.empty.noAgents'),
				disabled: true,
			});
		} else {
			n8nAgentsSubmenu.push(
				...agents.n8n.models.map<MenuItem>((agent) => ({
					id: stringifyModel(agent.model),
					icon: (agent.icon ?? workflowAgentDefaultIcon) as IconOrEmoji,
					label: truncateBeforeLast(agent.name, MAX_AGENT_NAME_CHARS_MENU),
					disabled: false,
					data: agent.description ?? undefined,
				})),
			);
		}

		const customAgents = isLoading
			? []
			: agents['custom-agent'].models.map<MenuItem>((agent) => ({
					id: stringifyModel(agent.model),
					icon: (agent.icon ?? personalAgentDefaultIcon) as IconOrEmoji,
					label: truncateBeforeLast(agent.name, MAX_AGENT_NAME_CHARS_MENU),
					disabled: false,
					data: agent.description ?? undefined,
				}));

		menuItems.push({
			id: 'custom-agents',
			label: i18n.baseText('chatHub.agent.personalAgents'),
			icon: personalAgentDefaultIcon as IconOrEmoji,
			children: [
				...(isLoading
					? [
							{
								id: 'loading',
								label: i18n.baseText('generic.loadingEllipsis'),
								disabled: true,
							},
						]
					: customAgents),
				{
					id: NEW_AGENT_MENU_ID,
					icon: { type: 'icon' as const, value: 'plus' as const },
					label: i18n.baseText('chatHub.agent.newAgent'),
					disabled: false,
					divided: isLoading || customAgents.length > 0,
				},
			],
		});

		menuItems.push({
			id: 'n8n-agents',
			label: i18n.baseText('chatHub.agent.workflowAgents'),
			icon: { type: 'icon' as const, value: 'robot' as const },
			children: n8nAgentsSubmenu,
		});
	}

	for (let i = 0; i < chatHubLLMProviderSchema.options.length; i++) {
		const provider = chatHubLLMProviderSchema.options[i];
		const settings = settingStore.moduleSettings?.['chat-hub']?.providers[provider];

		// Filter out disabled providers from the menu
		if (settings && !settings.enabled) continue;
		const configureMenu = {
			id: `${provider}::configure`,
			icon: { type: 'icon' as const, value: 'settings' as const },
			label: i18n.baseText('chatHub.agent.configureCredentials'),
			disabled: false,
		};

		if (isLoading) {
			menuItems.push({
				id: provider,
				label: providerDisplayNames[provider],
				divided: i === 0,
				children: [
					configureMenu,
					{
						id: `${provider}::loading`,
						label: i18n.baseText('generic.loadingEllipsis'),
						disabled: true,
						divided: true,
					},
				],
			});
			continue;
		}

		const theAgents = [...agents[provider].models];

		// Add any manually defined models in settings
		for (const model of settings?.allowedModels ?? []) {
			if (model.isManual) {
				theAgents.push({
					name: model.displayName,
					description: '',
					icon: null,
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
						available: true,
					},
				});
			}
		}

		const error = agents[provider].error;
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
						.map<MenuItem>((agent) => ({
							id: stringifyModel(agent.model),
							label: truncateBeforeLast(agent.name, MAX_AGENT_NAME_CHARS_MENU),
							disabled: false,
						}))
						.filter((item, index, self) => self.findIndex((i) => i.id === item.id) === index)
				: error
					? [{ id: `${provider}::error`, disabled: true, label: error }]
					: [];

		const children = [
			configureMenu,
			...agentOptions.map((option, index) => (index === 0 ? { ...option, divided: true } : option)),
			...(agentOptions.length > 0 && settings?.allowedModels.length === 0
				? [
						{
							id: `${provider}::add-model`,
							icon: { type: 'icon' as const, value: 'plus' as const },
							label: i18n.baseText('chatHub.agent.addModel'),
							disabled: false,
							divided: true,
						},
					]
				: []),
		];

		menuItems.push({
			id: provider,
			label: providerDisplayNames[provider],
			divided: i === 0,
			children,
		});
	}

	return menuItems;
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

defineExpose({
	open: () => dropdownRef.value?.open(),
	openCredentialSelector: (provider: ChatHubLLMProvider) =>
		openCredentialsSelectorOrCreate(provider),
});
</script>

<template>
	<N8nDropdownMenu
		ref="dropdownRef"
		:items="menu"
		teleported
		placement="bottom-start"
		:extra-popper-class="$style.component"
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
			<CredentialIcon
				v-if="item.id in PROVIDER_CREDENTIAL_TYPE_MAP"
				:credential-type-name="PROVIDER_CREDENTIAL_TYPE_MAP[item.id as ChatHubLLMProvider]"
				:size="16"
				:class="$style.menuIcon"
			/>
		</template>

		<template #item-trailing="{ item, ui }">
			<N8nTooltip
				v-if="item.data"
				:content="truncateBeforeLast(item.data, 200, 0)"
				:class="ui.class"
				:popper-class="$style.tooltip"
			>
				<N8nIcon icon="info" size="small" color="text-light" />
			</N8nTooltip>
		</template>
	</N8nDropdownMenu>
</template>

<style lang="scss" module>
.component {
	z-index: var(--floating-ui--z);
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

.menuIcon {
	flex-shrink: 0;
}

.avatarIcon {
	margin-right: var(--spacing--2xs);
}

.tooltip {
	/* higher than dropdown submenu */
	z-index: calc(999999 + 1000) !important;
}
</style>
