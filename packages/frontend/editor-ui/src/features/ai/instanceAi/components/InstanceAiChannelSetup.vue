<script lang="ts" setup>
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import { useI18n } from '@n8n/i18n';
import type { ChatIntegrationDescriptor } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch } from 'vue';

import { getAgent } from '@/features/agents/composables/useAgentApi';
import { useAgentChannelSetup } from '@/features/agents/composables/useAgentChannelSetup';
import { useAgentIntegrationStatus } from '@/features/agents/composables/useAgentIntegrationStatus';
import { useAgentIntegrationsCatalog } from '@/features/agents/composables/useAgentIntegrationsCatalog';
import AgentChannelLinearSetup from '@/features/agents/components/AgentChannelLinearSetup.vue';
import AgentChannelSlackSetup from '@/features/agents/components/AgentChannelSlackSetup.vue';
import AgentChannelTelegramSetup from '@/features/agents/components/AgentChannelTelegramSetup.vue';
import type { AgentResource } from '@/features/agents/types';

import { useThread } from '../instanceAi.store';

const props = defineProps<{
	requestId: string;
	integrationType: string;
	agentId: string;
	projectId: string;
}>();

const thread = useThread();
const i18n = useI18n();
const rootStore = useRootStore();
const { catalog, ensureLoaded } = useAgentIntegrationsCatalog();
const {
	fetchStatus,
	connectedCredentials,
	integrationSettings,
	loadingMap,
	errorMessages,
	errorIsConflict,
	isConnected: isIntegrationConnected,
	connect,
} = useAgentIntegrationStatus(props.projectId, props.agentId);

const MAX_CONFIRM_ATTEMPTS = 2;

const submitted = ref(false);
const connectionInFlight = ref(false);
const agent = ref<AgentResource | null>(null);

const currentIntegration = computed<ChatIntegrationDescriptor | null>(() => {
	return catalog.value?.find((integration) => integration.type === props.integrationType) ?? null;
});

const {
	channelSetupRef,
	selectedCredentials,
	credentialsLoading,
	credentialPermissions,
	getChannelCredentialId,
	getCredentials,
	loadChannelState: loadSharedChannelState,
	createCredential,
	editCredential,
	setupSlackApp: runSlackAppSetup,
} = useAgentChannelSetup({
	projectId: () => props.projectId,
	agentId: () => props.agentId,
	currentIntegration,
	connectedCredentials,
	fetchStatus,
	isIntegrationConnected,
});

const integrationLabel = computed(() => currentIntegration.value?.label ?? props.integrationType);

const connectedDescriptionKeys = {
	telegram: 'agents.builder.addTrigger.connectedText.telegram',
	linear: 'agents.builder.addTrigger.connectedText.linear',
} as const;

const connectedDescription = computed(() => {
	const key =
		connectedDescriptionKeys[props.integrationType as keyof typeof connectedDescriptionKeys];
	return key ? i18n.baseText(key) : '';
});

const currentChannelCredentialId = computed(() => getChannelCredentialId(props.integrationType));

const currentCredentials = computed(() => getCredentials(props.integrationType));

const isConnected = computed(() => isIntegrationConnected(props.integrationType));

const isLoading = computed(() => loadingMap.value[props.integrationType] ?? false);

const errorMessage = computed(() => errorMessages.value[props.integrationType] ?? '');

const hasUnsupportedIntegration = computed(
	() => !['slack', 'telegram', 'linear'].includes(props.integrationType),
);

const cardTitle = computed(() =>
	i18n.baseText('agents.channels.modal.connectTitle', {
		interpolate: { channel: integrationLabel.value },
	}),
);

function toIconName(icon: string): IconName {
	return icon as IconName;
}

function isResolvedOrSubmitted() {
	return submitted.value || thread.resolvedConfirmationIds.has(props.requestId);
}

function finish(approved: boolean, resolution: 'approved' | 'deferred') {
	if (isResolvedOrSubmitted()) return;
	submitted.value = true;
	void submitConfirmation(approved, resolution);
}

function skipSetup() {
	if (connectionInFlight.value) return;
	finish(false, 'deferred');
}

async function submitConfirmation(approved: boolean, resolution: 'approved' | 'deferred') {
	for (let attempt = 0; attempt < MAX_CONFIRM_ATTEMPTS; attempt++) {
		if (await thread.confirmAction(props.requestId, { kind: 'approval', approved })) break;
	}
	thread.resolveConfirmation(props.requestId, resolution);
}

async function saveChannelConfig() {
	if (isResolvedOrSubmitted() || connectionInFlight.value) return;
	const credentialId = currentChannelCredentialId.value;
	if (!credentialId || channelSetupRef.value?.validationError) return;

	connectionInFlight.value = true;
	try {
		await connect(props.integrationType, credentialId, channelSetupRef.value?.currentSettings);
		finish(true, 'approved');
	} catch {
		// useAgentIntegrationStatus exposes the connection error to the setup component.
	} finally {
		connectionInFlight.value = false;
	}
}

async function setupSlackApp(appConfigurationToken: string): Promise<boolean> {
	if (isResolvedOrSubmitted() || connectionInFlight.value) return false;
	connectionInFlight.value = true;
	try {
		return await runSlackAppSetup(appConfigurationToken, () => finish(true, 'approved'));
	} finally {
		connectionInFlight.value = false;
	}
}

async function loadChannelState() {
	const integrations = await ensureLoaded(props.projectId).catch(() => catalog.value ?? []);
	await loadSharedChannelState(integrations);

	if (props.integrationType !== 'slack') {
		try {
			agent.value = await getAgent(rootStore.restApiContext, props.projectId, props.agentId);
		} catch {
			agent.value = null;
		}
	}
}

watch(
	() => [props.projectId, props.agentId, props.integrationType] as const,
	() => void loadChannelState(),
	{ immediate: true },
);
</script>

<template>
	<div v-if="!submitted" :class="$style.card" data-test-id="instance-ai-channel-setup">
		<header :class="$style.header">
			<N8nIcon
				v-if="currentIntegration?.icon"
				:icon="toIconName(currentIntegration.icon)"
				size="medium"
			/>
			<N8nText :class="$style.title" size="medium" color="text-dark" bold>
				{{ cardTitle }}
			</N8nText>
		</header>

		<div :class="$style.bodyWrapper">
			<AgentChannelSlackSetup
				v-if="integrationType === 'slack'"
				ref="channelSetupRef"
				v-model="selectedCredentials.slack"
				mode="setup"
				:connected="isConnected"
				:is-published="false"
				:setup-slack-app="setupSlackApp"
				:project-id="projectId"
				:agent-id="agentId"
				:integration="currentIntegration ?? undefined"
				:credentials="currentCredentials"
				:credential-permissions="credentialPermissions"
				:credentials-loading="credentialsLoading"
				:loading="isLoading"
				:error-message="errorMessage"
				:error-is-conflict="errorIsConflict.slack"
				:force-new-credential="true"
				setup-mode="simple"
				@create="createCredential"
				@edit="editCredential"
				@connect="saveChannelConfig"
			/>

			<AgentChannelLinearSetup
				v-else-if="currentIntegration?.type === 'linear'"
				ref="channelSetupRef"
				v-model="selectedCredentials[currentIntegration.type]"
				mode="setup"
				:integration="currentIntegration"
				:credentials="currentCredentials"
				:credential-permissions="credentialPermissions"
				:credentials-loading="credentialsLoading"
				:loading="isLoading"
				:connected="isConnected"
				:connected-description="connectedDescription"
				:error-message="errorMessage"
				:error-is-conflict="errorIsConflict[currentIntegration.type]"
				:saved-settings="integrationSettings[currentIntegration.type]"
				:is-published="false"
				:agent-name="agent?.name ?? agentId"
				:project-id="projectId"
				:agent-id="agentId"
				:force-new-credential="true"
				@create="createCredential"
				@edit="editCredential"
				@connect="saveChannelConfig"
			/>

			<AgentChannelTelegramSetup
				v-else-if="currentIntegration?.type === 'telegram'"
				ref="channelSetupRef"
				v-model="selectedCredentials[currentIntegration.type]"
				mode="setup"
				:integration="currentIntegration"
				:credentials="currentCredentials"
				:credential-permissions="credentialPermissions"
				:credentials-loading="credentialsLoading"
				:loading="isLoading"
				:connected="isConnected"
				:connected-description="connectedDescription"
				:error-message="errorMessage"
				:error-is-conflict="errorIsConflict[currentIntegration.type]"
				:saved-settings="integrationSettings[currentIntegration.type]"
				:is-published="false"
				:agent-name="agent?.name ?? agentId"
				:project-id="projectId"
				:agent-id="agentId"
				:force-new-credential="true"
				@create="createCredential"
				@edit="editCredential"
				@connect="saveChannelConfig"
			/>

			<N8nText v-else-if="hasUnsupportedIntegration" size="small" color="text-light">
				{{
					i18n.baseText('agents.channels.modal.setupPlaceholder', {
						interpolate: { channel: integrationLabel },
					})
				}}
			</N8nText>
		</div>

		<footer :class="$style.footer">
			<N8nButton
				variant="ghost"
				size="medium"
				:disabled="connectionInFlight"
				data-test-id="instance-ai-channel-setup-skip"
				@click="skipSetup"
			>
				{{ i18n.baseText('instanceAi.workflowSetup.later') }}
			</N8nButton>
		</footer>
	</div>
</template>

<style lang="scss" module>
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding-top: var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--surface);
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--sm);
	text-transform: capitalize;
}

.title {
	flex: 1;
}

.bodyWrapper {
	padding: 0 var(--spacing--sm);
}

.footer {
	display: flex;
	justify-content: flex-end;
	padding: 0 var(--spacing--sm) var(--spacing--sm);
}
</style>
