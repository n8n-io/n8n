<script lang="ts" setup>
/**
 * Shared channel-setup body + orchestration for the `configure_channel`
 * builder tool. Single-sourced because the agents-chat builder
 * (`ConfigureChannelCard.vue`) and the AI assistant
 * (`InstanceAiChannelSetup.vue`) render the identical `AgentChannel*Setup`
 * flow for the identical suspend payload — only how each surface reports the
 * outcome differs (agents-chat resumes the tool call directly, instance AI
 * goes through its own confirm/resolve transport). This component owns the
 * body + composable wiring and emits a single `resolve` event; the two
 * surfaces are thin adapters around it that translate `resolve` into their
 * own transport call.
 */
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

const props = defineProps<{
	integrationType: string;
	agentId: string;
	projectId: string;
	/**
	 * External gate an adapter can set once it already considers this card
	 * resolved through its own transport (e.g. instance AI's
	 * `resolvedConfirmationIds`), so a stale/duplicate action can't sneak a
	 * second `resolve` through. Independent of this component's own
	 * double-submit guard.
	 */
	disabled?: boolean;
}>();

const emit = defineEmits<{
	resolve: [{ approved: boolean }];
}>();

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

const hasUnsupportedIntegration = computed(() => {
	if (props.integrationType === 'slack') return false;
	if (!['telegram', 'linear'].includes(props.integrationType)) return true;
	// Known type, but its catalog descriptor didn't load (e.g. catalog fetch
	// failed) — the Linear/Telegram branches below need `currentIntegration`,
	// so fall back here instead of rendering a blank body.
	return !currentIntegration.value;
});

const cardTitle = computed(() =>
	i18n.baseText('agents.channels.modal.connectTitle', {
		interpolate: { channel: integrationLabel.value },
	}),
);

function toIconName(icon: string): IconName {
	return icon as IconName;
}

function isBlocked() {
	return submitted.value || !!props.disabled;
}

function finish(approved: boolean) {
	if (isBlocked()) return;
	submitted.value = true;
	emit('resolve', { approved });
}

function skipSetup() {
	if (connectionInFlight.value) return;
	finish(false);
}

async function saveChannelConfig() {
	if (isBlocked() || connectionInFlight.value) return;
	const credentialId = currentChannelCredentialId.value;
	if (!credentialId || channelSetupRef.value?.validationError) return;

	connectionInFlight.value = true;
	try {
		await connect(props.integrationType, credentialId, channelSetupRef.value?.currentSettings);
		finish(true);
	} catch {
		// useAgentIntegrationStatus exposes the connection error to the setup component.
	} finally {
		connectionInFlight.value = false;
	}
}

async function setupSlackApp(appConfigurationToken: string): Promise<boolean> {
	if (isBlocked() || connectionInFlight.value) return false;
	connectionInFlight.value = true;
	try {
		return await runSlackAppSetup(appConfigurationToken, () => finish(true));
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
	<div :class="$style.card">
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
				data-testid="channel-setup-card-skip"
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
	/* Waiting-for-input highlight (#33959) — ported from InstanceAiChannelSetup
	   when the card body moved here, so both surfaces get it. */
	border: 2px solid var(--color--primary);
	border-radius: var(--radius--lg);
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
