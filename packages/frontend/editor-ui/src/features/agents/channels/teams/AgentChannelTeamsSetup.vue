<script setup lang="ts">
/**
 * The "your own Microsoft app" setup.
 *
 * The order follows Azure rather than n8n: the bot has to exist before it has
 * an identity, so the credential is derived in step two instead of being asked
 * for up front. That inverts Discord's stepper, where connecting comes last.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { N8nButton, N8nCheckbox, N8nCopyInput, N8nStepper, N8nText } from '@n8n/design-system';
import type {
	AgentTeamsIntegrationSettings,
	ChatIntegrationDescriptor,
	TeamsAgentSetupState,
	TeamsDiscoveryState,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { PermissionsRecord } from '@n8n/permissions';
import AgentIntegrationCredentialConnection from '../../components/AgentIntegrationCredentialConnection.vue';
import type { AgentCredentialOption } from '../../components/AgentCredentialSelect.vue';
import {
	getTeamsDiscovery,
	getTeamsSetupState,
	startTeamsDiscovery,
	stopTeamsDiscovery,
	teamsAppPackageUrl,
} from './api';

const credentialId = defineModel<string>({ default: '' });

const props = withDefaults(
	defineProps<{
		mode: 'setup' | 'edit';
		integration: ChatIntegrationDescriptor;
		credentials: AgentCredentialOption[];
		credentialPermissions: PermissionsRecord['credential'];
		credentialsLoading?: boolean;
		loading?: boolean;
		connected?: boolean;
		isPublished?: boolean;
		errorMessage?: string;
		errorIsConflict?: boolean;
		projectId: string;
		agentId: string;
		forceNewCredential?: boolean;
		savedSettings?: AgentTeamsIntegrationSettings;
	}>(),
	{
		credentialsLoading: false,
		loading: false,
		connected: false,
		isPublished: true,
		errorMessage: '',
		errorIsConflict: false,
		forceNewCredential: false,
		savedSettings: undefined,
	},
);

const emit = defineEmits<{
	create: [];
	edit: [];
	connect: [];
}>();

const i18n = useI18n();
const rootStore = useRootStore();

const AZURE_PORTAL_URL = 'https://portal.azure.com/#browse/Microsoft.BotService%2FbotServices';
const DISCOVERY_POLL_MS = 2000;

const setupState = ref<TeamsAgentSetupState | null>(null);
const discovery = ref<TeamsDiscoveryState>({ status: 'idle' });
const showManualCredential = ref(false);
let pollTimer: ReturnType<typeof setInterval> | undefined;

const availability = ref({
	teamChannels: props.savedSettings?.teamChannels ?? false,
	groupChats: props.savedSettings?.groupChats ?? false,
	readAllChannelMessages: props.savedSettings?.readAllChannelMessages ?? false,
	readAllGroupMessages: props.savedSettings?.readAllGroupMessages ?? false,
});

// A read permission without its surface is rejected by the backend schema, so
// the box cannot be left ticked when its scope is turned off.
watch(
	() => availability.value.teamChannels,
	(on) => {
		if (!on) availability.value.readAllChannelMessages = false;
	},
);
watch(
	() => availability.value.groupChats,
	(on) => {
		if (!on) availability.value.readAllGroupMessages = false;
	},
);

const messagingEndpointUrl = computed(() => {
	if (setupState.value) return setupState.value.messagingEndpointUrl;
	// The same shape the backend builds, so the URL shows before the first load.
	const base = rootStore.urlBaseWebhook.replace(/\/$/, '');
	return `${base}/rest/projects/${props.projectId}/agents/v2/${props.agentId}/webhooks/teams`;
});

const packageUrl = computed(() =>
	teamsAppPackageUrl(rootStore.restApiContext, props.projectId, props.agentId),
);

const discovered = computed(() => (discovery.value.status === 'found' ? discovery.value : null));
const canDownloadPackage = computed(() => Boolean(setupState.value?.botId));

async function loadSetupState() {
	if (!props.projectId || !props.agentId) return;
	try {
		setupState.value = await getTeamsSetupState(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
		);
	} catch {
		// Leave the fallback endpoint URL in place; the rest of the step still works.
		setupState.value = null;
	}
}

function stopPolling() {
	clearInterval(pollTimer);
	pollTimer = undefined;
}

async function pollDiscovery() {
	try {
		discovery.value = await getTeamsDiscovery(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
		);
	} catch {
		discovery.value = { status: 'expired' };
	}
	if (discovery.value.status !== 'waiting') stopPolling();
}

async function beginDiscovery() {
	showManualCredential.value = false;
	discovery.value = await startTeamsDiscovery(
		rootStore.restApiContext,
		props.projectId,
		props.agentId,
	);
	stopPolling();
	pollTimer = setInterval(pollDiscovery, DISCOVERY_POLL_MS);
}

function enterValuesManually() {
	showManualCredential.value = true;
	stopPolling();
	void stopTeamsDiscovery(rootStore.restApiContext, props.projectId, props.agentId);
}

onMounted(loadSetupState);
// The package is minted from the connected credential, so it appears only once
// connecting has succeeded.
watch(() => props.connected, loadSetupState);
onBeforeUnmount(stopPolling);

const steps = computed(() => [
	{
		id: 'create-bot',
		title: i18n.baseText('agents.channels.teams.setup.createBot.title'),
		description: i18n.baseText('agents.channels.teams.setup.createBot.description'),
	},
	{
		id: 'connect-bot',
		title: i18n.baseText('agents.channels.teams.setup.connectBot.title'),
		description: i18n.baseText('agents.channels.teams.setup.connectBot.description'),
	},
	{
		id: 'availability',
		title: i18n.baseText('agents.channels.teams.setup.availability.title'),
		description: i18n.baseText('agents.channels.teams.setup.availability.description'),
	},
	{
		id: 'install',
		title: i18n.baseText('agents.channels.teams.setup.install.title'),
		description: i18n.baseText('agents.channels.teams.setup.install.description'),
	},
]);

defineExpose({
	credentialId,
	validationError: null,
	currentSettings: computed(() => ({ ...availability.value })),
});
</script>

<template>
	<div :class="$style.teamsSetup">
		<N8nStepper v-if="mode === 'setup'" :steps="steps">
			<template #default="{ step }">
				<div :class="$style.stepContent">
					<!-- 1. Create the Azure Bot -->
					<div v-if="step.id === 'create-bot'" :class="$style.stepStack">
						<div :class="$style.buttonRow">
							<N8nButton
								v-if="setupState?.deployToAzureUrl"
								:href="setupState.deployToAzureUrl"
								target="_blank"
								variant="subtle"
								size="medium"
								data-testid="teams-deploy-to-azure"
							>
								{{ i18n.baseText('agents.channels.teams.setup.createBot.button') }}
							</N8nButton>
							<N8nButton
								:href="AZURE_PORTAL_URL"
								target="_blank"
								variant="outline"
								size="medium"
								data-testid="teams-azure-portal-link"
							>
								{{ i18n.baseText('agents.channels.teams.setup.createBot.portalButton') }}
							</N8nButton>
						</div>

						<div :class="$style.urlField">
							<label for="teams-messaging-endpoint-url">
								<N8nText size="small" bold>
									{{ i18n.baseText('agents.channels.teams.messagingEndpointUrl.label') }}
								</N8nText>
							</label>
							<N8nCopyInput
								id="teams-messaging-endpoint-url"
								:value="messagingEndpointUrl"
								size="large"
								:class="$style.urlInput"
								:copy-label="i18n.baseText('agents.builder.addTrigger.copy')"
								:copied-label="i18n.baseText('agents.builder.addTrigger.copied')"
							/>
						</div>
						<N8nText :class="$style.hint" size="small">
							{{ i18n.baseText('agents.channels.teams.setup.createBot.hint') }}
						</N8nText>
						<N8nText :class="$style.hint" size="small" data-testid="teams-create-bot-prerequisites">
							{{ i18n.baseText('agents.channels.teams.setup.createBot.prerequisites') }}
						</N8nText>
					</div>

					<!-- 2. Connect the bot -->
					<div v-else-if="step.id === 'connect-bot'" :class="$style.stepStack">
						<N8nButton
							v-if="discovery.status === 'idle' || discovery.status === 'expired'"
							variant="subtle"
							size="medium"
							:disabled="loading"
							data-testid="teams-start-discovery"
							@click="beginDiscovery"
						>
							{{ i18n.baseText('agents.channels.teams.setup.connectBot.button') }}
						</N8nButton>

						<N8nText
							v-if="discovery.status === 'expired'"
							:class="$style.hint"
							size="small"
							data-testid="teams-discovery-expired"
						>
							{{ i18n.baseText('agents.channels.teams.setup.connectBot.expired') }}
						</N8nText>

						<template v-if="discovery.status === 'waiting'">
							<N8nText size="small" data-testid="teams-discovery-listening">
								{{ i18n.baseText('agents.channels.teams.setup.connectBot.listening') }}
							</N8nText>
							<N8nText :class="$style.hint" size="small">
								{{ i18n.baseText('agents.channels.teams.setup.connectBot.slow') }}
							</N8nText>
							<N8nButton
								variant="outline"
								size="small"
								data-testid="teams-discovery-manual"
								@click="enterValuesManually"
							>
								{{ i18n.baseText('agents.channels.teams.setup.connectBot.manualLink') }}
							</N8nButton>
						</template>

						<template v-if="discovered">
							<N8nText size="small" bold data-testid="teams-discovery-found">
								{{
									discovered.existingCredentialId
										? i18n.baseText('agents.channels.teams.setup.connectBot.foundExisting')
										: i18n.baseText('agents.channels.teams.setup.connectBot.found')
								}}
							</N8nText>
							<div :class="$style.urlField" data-testid="teams-discovered-client-id">
								<N8nText size="small" bold>
									{{ i18n.baseText('agents.channels.teams.setup.connectBot.clientIdLabel') }}
								</N8nText>
								<N8nCopyInput
									:value="discovered.clientId"
									size="small"
									:class="$style.urlInput"
									:copy-label="i18n.baseText('agents.builder.addTrigger.copy')"
									:copied-label="i18n.baseText('agents.builder.addTrigger.copied')"
								/>
							</div>
							<div
								v-if="discovered.tenantId"
								:class="$style.urlField"
								data-testid="teams-discovered-tenant-id"
							>
								<N8nText size="small" bold>
									{{ i18n.baseText('agents.channels.teams.setup.connectBot.tenantIdLabel') }}
								</N8nText>
								<N8nCopyInput
									:value="discovered.tenantId"
									size="small"
									:class="$style.urlInput"
									:copy-label="i18n.baseText('agents.builder.addTrigger.copy')"
									:copied-label="i18n.baseText('agents.builder.addTrigger.copied')"
								/>
							</div>
							<N8nText
								v-else
								:class="$style.hint"
								size="small"
								data-testid="teams-discovery-no-tenant"
							>
								{{ i18n.baseText('agents.channels.teams.setup.connectBot.tenantMissing') }}
							</N8nText>
						</template>

						<AgentIntegrationCredentialConnection
							v-if="!connected && (discovered || showManualCredential)"
							v-model="credentialId"
							:integration-type="integration.type"
							:integration-label="integration.label"
							:credentials="credentials"
							:credential-permissions="credentialPermissions"
							:credentials-loading="credentialsLoading"
							:disabled="loading"
							:loading="loading"
							:error-message="errorMessage"
							:error-is-conflict="errorIsConflict"
							:force-new-credential="forceNewCredential"
							show-connect-button
							@create="emit('create')"
							@edit="emit('edit')"
							@connect="emit('connect')"
						/>
					</div>

					<!-- 3. Choose where it's available -->
					<div v-else-if="step.id === 'availability'" :class="$style.stepStack">
						<div :class="$style.toggle">
							<N8nCheckbox
								:model-value="true"
								disabled
								:label="i18n.baseText('agents.channels.teams.setup.availability.directChat')"
								data-testid="teams-scope-direct"
							/>
							<N8nText :class="$style.hint" size="small">
								{{ i18n.baseText('agents.channels.teams.setup.availability.directChatHint') }}
							</N8nText>
						</div>

						<div :class="$style.toggle">
							<N8nCheckbox
								v-model="availability.teamChannels"
								:label="i18n.baseText('agents.channels.teams.setup.availability.teamChannels')"
								data-testid="teams-scope-channels"
							/>
							<N8nText :class="$style.hint" size="small">
								{{ i18n.baseText('agents.channels.teams.setup.availability.teamChannelsHint') }}
							</N8nText>
						</div>

						<div :class="$style.toggle">
							<N8nCheckbox
								v-model="availability.groupChats"
								:label="i18n.baseText('agents.channels.teams.setup.availability.groupChats')"
								data-testid="teams-scope-groups"
							/>
							<N8nText :class="$style.hint" size="small">
								{{ i18n.baseText('agents.channels.teams.setup.availability.groupChatsHint') }}
							</N8nText>
						</div>

						<N8nText size="small" bold>
							{{ i18n.baseText('agents.channels.teams.setup.availability.readingTitle') }}
						</N8nText>

						<div :class="$style.toggle">
							<N8nCheckbox
								v-model="availability.readAllChannelMessages"
								:disabled="!availability.teamChannels"
								:label="
									i18n.baseText('agents.channels.teams.setup.availability.readAllChannelMessages')
								"
								data-testid="teams-read-channels"
							/>
							<N8nText :class="$style.hint" size="small">
								{{
									i18n.baseText(
										'agents.channels.teams.setup.availability.readAllChannelMessagesHint',
									)
								}}
							</N8nText>
						</div>

						<div :class="$style.toggle">
							<N8nCheckbox
								v-model="availability.readAllGroupMessages"
								:disabled="!availability.groupChats"
								:label="
									i18n.baseText('agents.channels.teams.setup.availability.readAllGroupMessages')
								"
								data-testid="teams-read-groups"
							/>
							<N8nText :class="$style.hint" size="small">
								{{
									i18n.baseText('agents.channels.teams.setup.availability.readAllGroupMessagesHint')
								}}
							</N8nText>
						</div>

						<N8nText :class="$style.hint" size="small" data-testid="teams-availability-untested">
							{{ i18n.baseText('agents.channels.teams.setup.availability.untested') }}
						</N8nText>
					</div>

					<!-- 4. Install -->
					<div v-else-if="step.id === 'install'" :class="$style.stepStack">
						<N8nButton
							v-if="canDownloadPackage"
							:href="packageUrl"
							variant="subtle"
							size="medium"
							icon="download"
							data-testid="teams-download-package"
						>
							{{ i18n.baseText('agents.channels.teams.setup.install.button') }}
						</N8nButton>
						<N8nText v-else size="small" :class="$style.hint" data-testid="teams-package-blocked">
							{{ i18n.baseText('agents.channels.teams.setup.install.needsBot') }}
						</N8nText>

						<N8nText :class="$style.hint" size="small">
							{{ i18n.baseText('agents.channels.teams.setup.install.hint') }}
						</N8nText>
						<N8nText
							v-if="connected && !isPublished"
							:class="$style.hint"
							size="small"
							data-testid="teams-publish-notice"
						>
							{{ i18n.baseText('agents.channels.teams.setup.publishNotice') }}
						</N8nText>
					</div>
				</div>
			</template>
		</N8nStepper>

		<div v-else :class="$style.formContent">
			<div :class="$style.urlField">
				<label for="teams-messaging-endpoint-url">
					<N8nText size="small" bold>
						{{ i18n.baseText('agents.channels.teams.messagingEndpointUrl.label') }}
					</N8nText>
				</label>
				<N8nCopyInput
					id="teams-messaging-endpoint-url"
					:value="messagingEndpointUrl"
					size="small"
					:class="$style.urlInput"
					:copy-label="i18n.baseText('agents.builder.addTrigger.copy')"
					:copied-label="i18n.baseText('agents.builder.addTrigger.copied')"
				/>
			</div>
			<N8nButton
				v-if="canDownloadPackage"
				:href="packageUrl"
				variant="subtle"
				size="small"
				icon="download"
				data-testid="teams-download-package"
			>
				{{ i18n.baseText('agents.channels.teams.setup.install.button') }}
			</N8nButton>
		</div>
	</div>
</template>

<style module lang="scss">
.teamsSetup,
.formContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.stepContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding-top: var(--spacing--xs);
}

.stepStack {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--sm);
	width: 100%;
}

.buttonRow {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.toggle {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.urlField {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	width: 100%;
}

.hint {
	color: var(--text-color--subtler);
}

.urlInput {
	flex: 1;
	min-width: 0;
}

.urlInput input {
	font-family: monospace;
	font-size: var(--font-size--2xs);
	text-overflow: ellipsis;
}
</style>
