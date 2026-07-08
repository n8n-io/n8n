<script lang="ts" setup>
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import { useI18n } from '@n8n/i18n';
import type { AgentIntegrationSettings, ChatIntegrationDescriptor } from '@n8n/api-types';
import { getResourcePermissions } from '@n8n/permissions';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch } from 'vue';

import { useUIStore } from '@/app/stores/ui.store';
import { CREDENTIAL_EDIT_MODAL_KEY } from '@/features/credentials/credentials.constants';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { createSlackAgentApp, getAgent } from '@/features/agents/composables/useAgentApi';
import { useAgentIntegrationStatus } from '@/features/agents/composables/useAgentIntegrationStatus';
import { useAgentIntegrationsCatalog } from '@/features/agents/composables/useAgentIntegrationsCatalog';
import type { AgentCredentialOption } from '@/features/agents/components/AgentCredentialSelect.vue';
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
const uiStore = useUIStore();
const credentialsStore = useCredentialsStore();
const projectsStore = useProjectsStore();
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

const SLACK_APP_SETUP_POLL_INTERVAL_MS = 2000;
const SLACK_APP_SETUP_TIMEOUT_MS = 2 * 60 * 1000;
const MAX_CONFIRM_ATTEMPTS = 2;

type ChannelSetupComponent = {
	credentialId: string;
	currentSettings?: AgentIntegrationSettings;
	validationError: string | null;
};

const submitted = ref(false);
const connectionInFlight = ref(false);
const selectedCredentials = ref<Record<string, string>>({});
const credentialsByType = ref<Record<string, AgentCredentialOption[]>>({});
const credentialsLoading = ref(false);
const credentialIdsBeforeNew = ref<Record<string, Set<string>>>({});
const pendingNewCredentialType = ref<string | null>(null);
const channelSetupRef = ref<ChannelSetupComponent>();
const agent = ref<AgentResource | null>(null);

const currentIntegration = computed<ChatIntegrationDescriptor | null>(() => {
	return catalog.value?.find((integration) => integration.type === props.integrationType) ?? null;
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

const projectForPermissions = computed(() => {
	if (projectsStore.currentProject?.id === props.projectId) return projectsStore.currentProject;
	if (projectsStore.personalProject?.id === props.projectId) return projectsStore.personalProject;
	return projectsStore.myProjects.find((project) => project.id === props.projectId) ?? null;
});

const credentialPermissions = computed(() => {
	const permissions = getResourcePermissions(projectForPermissions.value?.scopes).credential;
	return { ...permissions, create: !!permissions.create };
});

const currentChannelCredentialId = computed(() => {
	return (
		selectedCredentials.value[props.integrationType] ||
		connectedCredentials.value[props.integrationType] ||
		''
	);
});

const currentCredentials = computed(() => credentialsByType.value[props.integrationType] ?? []);

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

async function fetchCredentials(integrations: ChatIntegrationDescriptor[] = catalog.value ?? []) {
	credentialsLoading.value = true;
	try {
		credentialsStore.setCredentials([]);
		const allCredentials = await credentialsStore.fetchAllCredentialsForWorkflow({
			projectId: props.projectId,
		});

		for (const integration of integrations) {
			credentialsByType.value[integration.type] = allCredentials
				.filter((credential) => integration.credentialTypes.includes(credential.type))
				.map((credential) => ({
					id: credential.id,
					name: credential.name,
					typeDisplayName: credentialsStore.getCredentialTypeByName(credential.type)?.displayName,
					homeProject: credential.homeProject,
				}));
		}
	} catch {
		for (const integration of integrations) {
			credentialsByType.value[integration.type] = [];
		}
	} finally {
		credentialsLoading.value = false;
	}
}

function createCredential() {
	const integration = currentIntegration.value;
	const [primaryCredentialType] = integration?.credentialTypes ?? [];
	if (!integration || !primaryCredentialType) return;

	const existing = credentialsByType.value[integration.type] ?? [];
	credentialIdsBeforeNew.value[integration.type] = new Set(
		existing.map((credential) => credential.id),
	);
	pendingNewCredentialType.value = integration.type;
	uiStore.openNewCredential(
		primaryCredentialType,
		false,
		false,
		props.projectId,
		undefined,
		undefined,
		undefined,
		{
			hideAskAssistant: true,
			appendToBody: true,
		},
	);
}

function editCredential() {
	const credentialId = currentChannelCredentialId.value;
	if (credentialId) {
		uiStore.openExistingCredential(credentialId, { hideAskAssistant: true, appendToBody: true });
	}
}

function openSlackAppAuthorizationPopup(installUrl: string): Window | null {
	const parsedUrl = new URL(installUrl);
	if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
		throw new Error('Invalid Slack installation URL');
	}

	const params =
		'scrollbars=no,resizable=yes,status=no,titlebar=no,location=no,toolbar=no,menubar=no,width=500,height=700';
	return window.open(parsedUrl.toString(), 'Slack App Authorization', params);
}

async function waitForSlackAppSetupCompletion(popup: Window | null): Promise<boolean> {
	return await new Promise((resolve) => {
		const oauthChannel = new BroadcastChannel('oauth-callback');
		let pollInFlight = false;
		let settled = false;

		const closePopup = () => {
			if (!popup) return;
			try {
				popup.close();
			} catch {}
		};

		const settle = (success: boolean) => {
			if (settled) return;
			settled = true;
			window.clearInterval(pollInterval);
			window.clearTimeout(timeout);
			oauthChannel.close();
			if (success) closePopup();
			resolve(success);
		};

		const pollStatus = async () => {
			if (pollInFlight || settled) return;
			pollInFlight = true;
			try {
				await fetchStatus(['slack']);
				if (isIntegrationConnected('slack')) settle(true);
			} finally {
				pollInFlight = false;
			}
		};

		const pollInterval = window.setInterval(
			() => void pollStatus(),
			SLACK_APP_SETUP_POLL_INTERVAL_MS,
		);
		const timeout = window.setTimeout(() => settle(false), SLACK_APP_SETUP_TIMEOUT_MS);

		oauthChannel.addEventListener('message', (event: MessageEvent) => {
			settle(event.data === 'success');
		});

		void pollStatus();
	});
}

async function setupSlackApp(appConfigurationToken: string): Promise<boolean> {
	if (isResolvedOrSubmitted() || connectionInFlight.value) return false;
	connectionInFlight.value = true;
	try {
		const { installUrl } = await createSlackAgentApp(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			appConfigurationToken,
		);
		const popup = openSlackAppAuthorizationPopup(installUrl);
		const connected = await waitForSlackAppSetupCompletion(popup);
		if (!connected) {
			throw new Error('Slack app installation was not completed');
		}

		await fetchStatus(['slack']);
		finish(true, 'approved');
		return true;
	} finally {
		connectionInFlight.value = false;
	}
}

async function loadChannelState() {
	const integrations = await ensureLoaded(props.projectId).catch(() => catalog.value ?? []);
	await Promise.all([
		fetchStatus(integrations.map((integration) => integration.type)),
		fetchCredentials(integrations),
	]);

	for (const [channelType, credentialId] of Object.entries(connectedCredentials.value)) {
		if (!selectedCredentials.value[channelType]) {
			selectedCredentials.value[channelType] = credentialId;
		}
	}

	if (props.integrationType !== 'slack') {
		try {
			agent.value = await getAgent(rootStore.restApiContext, props.projectId, props.agentId);
		} catch {
			agent.value = null;
		}
	}
}

const credentialModalOpen = computed(
	() => uiStore.isModalActiveById?.[CREDENTIAL_EDIT_MODAL_KEY] ?? false,
);

watch(credentialModalOpen, async (isOpen, wasOpen) => {
	if (!wasOpen || isOpen) return;
	const type = pendingNewCredentialType.value;
	pendingNewCredentialType.value = null;
	await fetchCredentials();
	if (!type) return;

	const before = credentialIdsBeforeNew.value[type];
	const after = credentialsByType.value[type] ?? [];
	const newCredential = before ? after.find((credential) => !before.has(credential.id)) : undefined;
	if (newCredential) {
		selectedCredentials.value[type] = newCredential.id;
	}
	delete credentialIdsBeforeNew.value[type];
});

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
				data-test-id="instance-ai-channel-setup-skip"
				@click="finish(false, 'deferred')"
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
