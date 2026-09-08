<script lang="ts" setup>
/**
 * Shared channel-setup body + orchestration for the `configure_channel`
 * builder tool, rendered by the AI assistant (`InstanceAiChannelSetup.vue`).
 * Kept as its own component — rather than inlined into that consumer —
 * because it owns non-trivial body + composable wiring
 * (`AgentChannel*Setup`) for the tool's suspend payload and emits a single
 * `resolve` event that the consumer translates into its own confirm/resolve
 * transport call.
 */
import {
	N8nButton,
	N8nIcon,
	N8nLoading,
	N8nText,
	updatedIconSet,
	type IconName,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { ChatIntegrationDescriptor } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch } from 'vue';

import { agentsEventBus } from '@/features/agents/agents.eventBus';
import {
	agentChannelPlatforms,
	createAgentChannelRuntime,
	getAgentChannelPlatform,
	isRegisteredAgentChannelPlatform,
} from '@/features/agents/channels/registry';
import type { AgentChannelRuntime, AgentChannelViewExpose } from '@/features/agents/channels/types';
import { getAgent } from '@/features/agents/composables/useAgentApi';
import { useAgentChannelSetup } from '@/features/agents/composables/useAgentChannelSetup';
import { useAgentIntegrationStatus } from '@/features/agents/composables/useAgentIntegrationStatus';
import { useAgentIntegrationsCatalog } from '@/features/agents/composables/useAgentIntegrationsCatalog';
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
const { catalog, ensureLoaded, reload: reloadCatalog } = useAgentIntegrationsCatalog();
const {
	fetchStatus,
	connectedCredentials,
	integrationSettings,
	loadingMap,
	errorMessages,
	errorIsConflict,
	isConnected: isIntegrationConnected,
	isConfigured: isIntegrationConfigured,
	connect,
	disconnect,
} = useAgentIntegrationStatus(props.projectId, props.agentId);

const submitted = ref(false);
const connectionInFlight = ref(false);
const agent = ref<AgentResource | null>(null);
const catalogLoading = ref(false);
const catalogLoadFailed = ref(false);

const currentIntegration = computed<ChatIntegrationDescriptor>(() => {
	return (
		catalog.value?.find((integration) => integration.type === props.integrationType) ?? {
			type: props.integrationType,
			label: props.integrationType,
			icon: 'zap',
			credentialTypes: [],
		}
	);
});

const {
	selectedCredentials,
	credentialsLoading,
	credentialPermissions,
	credentialModalOpen,
	getChannelCredentialId,
	getCredentials,
	loadChannelState: loadSharedChannelState,
	createCredential,
	editCredential,
} = useAgentChannelSetup({
	projectId: () => props.projectId,
	currentIntegration,
	connectedCredentials,
	fetchStatus,
});

const projectIdRef = computed(() => props.projectId);
const agentIdRef = computed(() => props.agentId);
const runtimes: Record<string, AgentChannelRuntime> = Object.fromEntries(
	Object.values(agentChannelPlatforms).map((platform) => [
		platform.type,
		createAgentChannelRuntime(platform, {
			projectId: projectIdRef,
			agentId: agentIdRef,
			selectedCredentialId: computed(() => getChannelCredentialId(platform.type)),
			credentialModalOpen,
			fetchStatus,
			isConnected: isIntegrationConnected,
			isConfigured: isIntegrationConfigured,
		}),
	]),
);
const fallbackRuntime = createAgentChannelRuntime(getAgentChannelPlatform('unknown'), {
	projectId: projectIdRef,
	agentId: agentIdRef,
	selectedCredentialId: computed(() => getChannelCredentialId(props.integrationType)),
	credentialModalOpen,
	fetchStatus,
	isConnected: isIntegrationConnected,
	isConfigured: isIntegrationConfigured,
});
const currentPlatform = computed(() => getAgentChannelPlatform(props.integrationType));
const currentRuntime = computed(() => runtimes[props.integrationType] ?? fallbackRuntime);
const channelViewRef = ref<AgentChannelViewExpose>();
const channelActionInFlight = computed(
	() =>
		connectionInFlight.value ||
		currentRuntime.value.loading.value ||
		channelViewRef.value?.loading === true,
);
const integrationLabel = computed(() => currentIntegration.value.label);

const connectedDescription = computed(() => {
	if (!isIntegrationConnected(props.integrationType)) return '';
	return (
		currentPlatform.value.getConnectedDescription?.({
			text: (key) => i18n.baseText(key),
		}) ?? ''
	);
});

const currentChannelCredentialId = computed(() => getChannelCredentialId(props.integrationType));
const currentCredentials = computed(() => getCredentials(props.integrationType));
const isConfigured = computed(() => isIntegrationConfigured(props.integrationType));
const isLoading = computed(() => loadingMap.value[props.integrationType] ?? false);
const errorMessage = computed(() => errorMessages.value[props.integrationType] ?? '');

const cardTitle = computed(() =>
	i18n.baseText('agents.channels.modal.connectTitle', {
		interpolate: { channel: integrationLabel.value },
	}),
);

function isIconName(icon: string): icon is IconName {
	return icon in updatedIconSet;
}

function isBlocked() {
	return submitted.value || !!props.disabled;
}

function finish(approved: boolean) {
	if (isBlocked()) return;
	submitted.value = true;
	emit('resolve', { approved });
}

/**
 * The configuration above persists the integration via REST immediately, but the
 * builder's own `configUpdated` refresh only fires for config-mutation tools
 * at end of turn — notify other surfaces (e.g. the agent artifact panel's
 * Channels section) now so they don't stay stale until the run finishes.
 */
function notifyAgentUpdated() {
	agentsEventBus.emit('agentUpdated', { agentId: props.agentId, source: 'channel-setup-card' });
}

async function skipSetup() {
	if (isBlocked() || channelActionInFlight.value) return;

	connectionInFlight.value = true;
	try {
		await disconnect(props.integrationType, '');
		notifyAgentUpdated();
		finish(false);
	} catch {
		// Keep setup pending so the user can retry instead of leaving a draft channel behind.
	} finally {
		connectionInFlight.value = false;
	}
}

async function saveChannelConfig() {
	if (isBlocked() || channelActionInFlight.value) return;
	const credentialId = currentChannelCredentialId.value;
	if (!credentialId || channelViewRef.value?.validationError) return;

	connectionInFlight.value = true;
	try {
		await channelViewRef.value?.beforeSave?.();
		await connect(props.integrationType, credentialId, channelViewRef.value?.currentSettings);
		notifyAgentUpdated();
		finish(true);
	} catch {
		// useAgentIntegrationStatus exposes the configuration error to the setup component.
	} finally {
		connectionInFlight.value = false;
	}
}

function handlePlatformConnected() {
	if (isBlocked()) return;
	notifyAgentUpdated();
	finish(true);
}

async function loadChannelState(forceReload = false) {
	catalogLoading.value = true;
	catalogLoadFailed.value = false;
	try {
		let integrations = await (forceReload
			? reloadCatalog(props.projectId)
			: ensureLoaded(props.projectId));
		const requiresDescriptor =
			props.integrationType !== 'slack' && isRegisteredAgentChannelPlatform(props.integrationType);

		if (
			requiresDescriptor &&
			!forceReload &&
			!integrations.some((integration) => integration.type === props.integrationType)
		) {
			integrations = await reloadCatalog(props.projectId);
		}

		if (
			requiresDescriptor &&
			!integrations.some((integration) => integration.type === props.integrationType)
		) {
			catalogLoadFailed.value = true;
			return;
		}

		await Promise.all([loadSharedChannelState(integrations), currentRuntime.value.load()]);

		try {
			agent.value = await getAgent(rootStore.restApiContext, props.projectId, props.agentId);
		} catch {
			agent.value = null;
		}
	} catch {
		catalogLoadFailed.value = true;
	} finally {
		catalogLoading.value = false;
	}
}

watch(
	() => [props.projectId, props.agentId, props.integrationType] as const,
	() => {
		void loadChannelState();
	},
	{ immediate: true },
);
</script>

<template>
	<div :class="$style.card">
		<header :class="$style.header">
			<N8nIcon
				v-if="isIconName(currentIntegration.icon)"
				:icon="currentIntegration.icon"
				size="medium"
			/>
			<N8nText :class="$style.title" size="medium" color="text-dark" bold>
				{{ cardTitle }}
			</N8nText>
		</header>

		<div :class="$style.bodyWrapper">
			<N8nLoading
				v-if="catalogLoading"
				:loading="true"
				:rows="3"
				data-testid="channel-setup-catalog-loading"
			/>

			<div
				v-else-if="catalogLoadFailed"
				:class="$style.catalogError"
				data-testid="channel-setup-catalog-error"
			>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('agents.channels.modal.setupLoadError') }}
				</N8nText>
				<N8nButton
					variant="ghost"
					size="small"
					data-testid="channel-setup-catalog-retry"
					@click="loadChannelState(true)"
				>
					{{ i18n.baseText('generic.retry') }}
				</N8nButton>
			</div>

			<component
				v-else
				:is="currentPlatform.setupComponent"
				ref="channelViewRef"
				v-model="selectedCredentials[integrationType]"
				mode="setup"
				:integration="currentIntegration"
				:credentials="currentCredentials"
				:credential-permissions="credentialPermissions"
				:credentials-loading="credentialsLoading"
				:loading="isLoading || connectionInFlight"
				:disabled="isBlocked()"
				:connected="isConfigured"
				:connected-description="connectedDescription"
				:error-message="errorMessage"
				:error-is-conflict="errorIsConflict[integrationType]"
				:saved-settings="integrationSettings[integrationType]"
				:is-published="Boolean(agent?.activeVersionId)"
				:agent-name="agent?.name ?? agentId"
				:project-id="projectId"
				:agent-id="agentId"
				:force-new-credential="true"
				:simple-setup="true"
				:runtime="currentRuntime"
				@create="createCredential"
				@edit="editCredential"
				@connect="saveChannelConfig"
				@connected="handlePlatformConnected"
			/>
		</div>

		<footer :class="$style.footer">
			<N8nButton
				variant="ghost"
				size="medium"
				:disabled="channelActionInFlight"
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
	border-radius: var(--radius--lg);
	background-color: var(--background--surface);
	box-shadow: var(--shadow--sm), var(--shadow--outline);
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

.catalogError {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.footer {
	display: flex;
	justify-content: flex-end;
	padding: 0 var(--spacing--sm) var(--spacing--sm);
}
</style>
