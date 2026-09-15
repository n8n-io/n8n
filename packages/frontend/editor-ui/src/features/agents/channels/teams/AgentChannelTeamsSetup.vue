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
	TeamsCredentialCheck,
	TeamsDiscoveryState,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { PermissionsRecord } from '@n8n/permissions';
import AgentIntegrationCredentialConnection from '../../components/AgentIntegrationCredentialConnection.vue';
import type { AgentCredentialOption } from '../../components/AgentCredentialSelect.vue';
import {
	checkTeamsCredential,
	fetchTeamsAppPackage,
	getTeamsDiscovery,
	getTeamsSetupState,
	startTeamsDiscovery,
	stopTeamsDiscovery,
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

const AZURE_BOT_SERVICES_URL =
	'https://portal.azure.com/#browse/Microsoft.BotService%2FbotServices';
const ENTRA_APP_REGISTRATION_URL =
	'https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/CreateApplicationBlade';
const DISCOVERY_POLL_MS = 2000;

const setupState = ref<TeamsAgentSetupState | null>(null);
const discovery = ref<TeamsDiscoveryState>({ status: 'idle' });
const manualEntry = ref(false);
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

const discovered = computed(() => (discovery.value.status === 'found' ? discovery.value : null));
const downloading = ref(false);
const downloadError = ref('');
const credentialCheck = ref<TeamsCredentialCheck | null>(null);
const checking = ref(false);

/**
 * Connecting is gated on the credential actually reaching Microsoft. Without
 * this the channel connects on a wrong secret and fails on the first message,
 * long after the setup said it succeeded.
 */
const credentialVerified = computed(() => credentialCheck.value?.status === 'ok');
const credentialProblem = computed(() =>
	credentialCheck.value?.status === 'failed' ? credentialCheck.value.reason : null,
);

async function runCredentialCheck() {
	const id = credentialId.value;
	if (!id) {
		credentialCheck.value = null;
		return;
	}
	checking.value = true;
	try {
		credentialCheck.value = await checkTeamsCredential(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			id,
		);
	} catch {
		credentialCheck.value = { status: 'failed', reason: 'unreachable' };
	} finally {
		checking.value = false;
	}
}

// Re-checks whenever the picked credential changes, including the one discovery
// adopted, so the gate never reflects a previous selection.
// The deployment and the package are both built from the picked credential, so
// they have to be refetched whenever it changes.
watch(
	credentialId,
	async () => {
		await Promise.all([runCredentialCheck(), loadSetupState()]);
	},
	{ immediate: true },
);

/**
 * A bot reached us, but not the one this credential describes — usually the
 * endpoint was pasted onto the wrong bot.
 */
const botMismatch = computed(
	() =>
		discovered.value !== null &&
		setupState.value?.botId != null &&
		discovered.value.clientId !== setupState.value.botId,
);

// The manifest needs the bot's client ID, which discovery supplies before the
// credential is connected, so the step does not wait on connecting.
const canDownloadPackage = computed(() =>
	Boolean(setupState.value?.botId ?? discovered.value?.clientId),
);

async function downloadPackage() {
	downloading.value = true;
	downloadError.value = '';
	try {
		const blob = await fetchTeamsAppPackage(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			credentialId.value || undefined,
		);
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'n8n-agent-teams-app.zip';
		link.style.display = 'none';
		document.body.appendChild(link);
		try {
			link.click();
		} finally {
			link.remove();
			URL.revokeObjectURL(url);
		}
	} catch {
		downloadError.value = i18n.baseText('agents.channels.teams.setup.install.downloadFailed');
	} finally {
		downloading.value = false;
	}
}

async function loadSetupState() {
	if (!props.projectId || !props.agentId) return;
	try {
		setupState.value = await getTeamsSetupState(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			credentialId.value || undefined,
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

/**
 * Listens for as long as the stepper is open, renewing the window as it lapses.
 *
 * A button to start it would be a button whose only job is to arm something the
 * user already asked for by opening the setup. Opening on mount alone is not
 * enough either: creating the Azure bot in step one takes longer than one
 * window, so it has to renew rather than lapse into an error the user has to
 * clear.
 */
async function pollDiscovery() {
	try {
		const state = await getTeamsDiscovery(rootStore.restApiContext, props.projectId, props.agentId);
		if (state.status === 'expired' && !manualEntry.value) {
			await startTeamsDiscovery(rootStore.restApiContext, props.projectId, props.agentId);
			return;
		}
		discovery.value = state;
	} catch {
		// A blip should not end the wait; the next tick tries again.
		return;
	}
	if (discovery.value.status === 'found') {
		stopPolling();
		// Saying we found a credential and then leaving the picker empty reads as
		// a failure, so adopt it.
		if (discovery.value.existingCredentialId) {
			credentialId.value = discovery.value.existingCredentialId;
		}
	}
}

async function beginListening() {
	await startTeamsDiscovery(rootStore.restApiContext, props.projectId, props.agentId);
	discovery.value = { status: 'waiting' };
	stopPolling();
	pollTimer = setInterval(pollDiscovery, DISCOVERY_POLL_MS);
}

function enterValuesManually() {
	manualEntry.value = true;
	stopPolling();
	void stopTeamsDiscovery(rootStore.restApiContext, props.projectId, props.agentId);
}

onMounted(async () => {
	await loadSetupState();
	if (props.mode === 'setup' && !props.connected) await beginListening();
});
// The package is minted from the connected credential, so it appears only once
// connecting has succeeded.
watch(() => props.connected, loadSetupState);
onBeforeUnmount(() => {
	stopPolling();
	void stopTeamsDiscovery(rootStore.restApiContext, props.projectId, props.agentId);
});

const steps = computed(() => [
	{
		id: 'create-credential',
		title: i18n.baseText('agents.channels.teams.setup.createCredential.title'),
		description: i18n.baseText('agents.channels.teams.setup.createCredential.description'),
	},
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
					<!-- 1. Register the app and add the credential -->
					<div v-if="step.id === 'create-credential'" :class="$style.stepStack">
						<N8nButton
							:href="ENTRA_APP_REGISTRATION_URL"
							target="_blank"
							variant="subtle"
							size="medium"
							data-testid="teams-entra-register-link"
						>
							{{ i18n.baseText('agents.channels.teams.setup.createCredential.button') }}
						</N8nButton>

						<AgentIntegrationCredentialConnection
							v-if="!connected"
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
							@create="emit('create')"
							@edit="emit('edit')"
						/>

						<N8nText :class="$style.hint" size="small" data-testid="teams-create-bot-prerequisites">
							{{ i18n.baseText('agents.channels.teams.setup.createCredential.prerequisites') }}
						</N8nText>
					</div>

					<!-- 2. Deploy the Azure Bot -->
					<div v-else-if="step.id === 'create-bot'" :class="$style.stepStack">
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
						<N8nText v-else :class="$style.hint" size="small" data-testid="teams-deploy-blocked">
							{{ i18n.baseText('agents.channels.teams.setup.createBot.needsCredential') }}
						</N8nText>

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
					</div>

					<!-- 3. Confirm the bot reaches n8n -->
					<div v-else-if="step.id === 'connect-bot'" :class="$style.stepStack">
						<N8nButton
							:href="AZURE_BOT_SERVICES_URL"
							target="_blank"
							variant="subtle"
							size="medium"
							data-testid="teams-open-bot-link"
						>
							{{ i18n.baseText('agents.channels.teams.setup.connectBot.openBotButton') }}
						</N8nButton>
						<N8nText
							v-if="setupState?.suggestedBotName"
							:class="$style.hint"
							size="small"
							data-testid="teams-open-bot-hint"
						>
							{{
								i18n.baseText('agents.channels.teams.setup.connectBot.openBotHint', {
									interpolate: { botName: setupState.suggestedBotName },
								})
							}}
						</N8nText>

						<template v-if="manualEntry">
							<N8nText :class="$style.hint" size="small" data-testid="teams-discovery-skipped">
								{{ i18n.baseText('agents.channels.teams.setup.connectBot.skipped') }}
							</N8nText>
						</template>
						<template v-else-if="botMismatch">
							<N8nText size="small" :class="$style.error" data-testid="teams-discovery-mismatch">
								{{ i18n.baseText('agents.channels.teams.setup.connectBot.mismatch') }}
							</N8nText>
						</template>
						<template v-else-if="discovered">
							<N8nText size="small" bold data-testid="teams-discovery-found">
								{{ i18n.baseText('agents.channels.teams.setup.connectBot.found') }}
							</N8nText>
						</template>
						<!-- Only once it really is listening; `idle` is the brief gap before. -->
						<template v-else-if="discovery.status === 'waiting'">
							<N8nText size="small" data-testid="teams-discovery-listening">
								{{ i18n.baseText('agents.channels.teams.setup.connectBot.listening') }}
							</N8nText>
							<N8nText :class="$style.hint" size="small">
								{{ i18n.baseText('agents.channels.teams.setup.connectBot.slow') }}
							</N8nText>
							<N8nButton
								variant="ghost"
								size="small"
								data-testid="teams-discovery-manual"
								@click="enterValuesManually"
							>
								{{ i18n.baseText('agents.channels.teams.setup.connectBot.manualLink') }}
							</N8nButton>
						</template>
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
							variant="subtle"
							size="medium"
							icon="download"
							:loading="downloading"
							data-testid="teams-download-package"
							@click="downloadPackage"
						>
							{{ i18n.baseText('agents.channels.teams.setup.install.button') }}
						</N8nButton>
						<N8nText v-else size="small" :class="$style.hint" data-testid="teams-package-blocked">
							{{ i18n.baseText('agents.channels.teams.setup.install.needsBot') }}
						</N8nText>

						<N8nText
							v-if="downloadError"
							size="small"
							:class="$style.error"
							data-testid="teams-download-error"
						>
							{{ downloadError }}
						</N8nText>

						<N8nText :class="$style.hint" size="small">
							{{ i18n.baseText('agents.channels.teams.setup.install.hint') }}
						</N8nText>

						<!--
							Connecting is the last thing that happens, because the modal closes
							on it. Offered here so the package is already downloaded by then,
							and gated on a credential that has actually reached Microsoft.
						-->
						<template v-if="!connected">
							<N8nText
								v-if="checking"
								:class="$style.hint"
								size="small"
								data-testid="teams-credential-checking"
							>
								{{ i18n.baseText('agents.channels.teams.setup.install.checking') }}
							</N8nText>
							<N8nText
								v-else-if="credentialVerified"
								size="small"
								data-testid="teams-credential-verified"
							>
								{{ i18n.baseText('agents.channels.teams.setup.install.verified') }}
							</N8nText>
							<template v-else-if="credentialProblem">
								<N8nText size="small" :class="$style.error" data-testid="teams-credential-problem">
									{{
										i18n.baseText(`agents.channels.teams.setup.install.failed.${credentialProblem}`)
									}}
								</N8nText>
								<N8nButton
									variant="ghost"
									size="small"
									data-testid="teams-credential-recheck"
									@click="runCredentialCheck()"
								>
									{{ i18n.baseText('agents.channels.teams.setup.install.recheck') }}
								</N8nButton>
							</template>
							<N8nText v-else :class="$style.hint" size="small" data-testid="teams-connect-blocked">
								{{ i18n.baseText('agents.channels.teams.setup.install.needsCredential') }}
							</N8nText>

							<N8nButton
								variant="solid"
								size="medium"
								:disabled="!credentialVerified || loading"
								:loading="loading"
								data-testid="teams-connect"
								@click="emit('connect')"
							>
								{{ i18n.baseText('agents.channels.teams.setup.install.connectButton') }}
							</N8nButton>
						</template>
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
					size="large"
					:class="$style.urlInput"
					:copy-label="i18n.baseText('agents.builder.addTrigger.copy')"
					:copied-label="i18n.baseText('agents.builder.addTrigger.copied')"
				/>
			</div>
			<N8nButton
				v-if="canDownloadPackage"
				variant="subtle"
				size="small"
				icon="download"
				:loading="downloading"
				data-testid="teams-download-package"
				@click="downloadPackage"
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

.error {
	color: var(--color--danger);
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
