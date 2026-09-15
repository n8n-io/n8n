<script setup lang="ts">
/**
 * The "your own Microsoft app" setup.
 *
 * The order follows Azure rather than n8n: the bot has to exist before it has
 * an identity, so the credential is derived in step two instead of being asked
 * for up front. That inverts Discord's stepper, where connecting comes last.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { N8nButton, N8nCheckbox, N8nCopyInput, N8nStepper, N8nText } from '@n8n/design-system';
import type {
	AgentTeamsIntegrationSettings,
	ChatIntegrationDescriptor,
	TeamsAgentSetupState,
	TeamsCredentialCheck,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { PermissionsRecord } from '@n8n/permissions';
import AgentIntegrationCredentialConnection from '../../components/AgentIntegrationCredentialConnection.vue';
import type { AgentCredentialOption } from '../../components/AgentCredentialSelect.vue';
import { checkTeamsCredential, fetchTeamsAppPackage, getTeamsSetupState } from './api';

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

const ENTRA_APP_REGISTRATION_URL =
	'https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/CreateApplicationBlade';

const setupState = ref<TeamsAgentSetupState | null>(null);
const showEndpoint = ref(false);

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

const downloading = ref(false);
const downloadError = ref('');
// The manifest needs the bot's client ID, which the picked credential supplies
// before it is connected, so the step does not wait on connecting.
const canDownloadPackage = computed(() => Boolean(setupState.value?.botId));
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

// Re-checks whenever the picked credential changes, so the gate never reflects
// a previous selection.
// The deployment and the package are both built from the picked credential, so
// they have to be refetched whenever it changes.
watch(
	credentialId,
	async () => {
		await Promise.all([runCredentialCheck(), loadSetupState()]);
	},
	{ immediate: true },
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

onMounted(loadSetupState);
// The package is minted from the connected credential, so it appears only once
// connecting has succeeded.
watch(() => props.connected, loadSetupState);

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

						<!--
							A link, not a button: the credential is the action on this step. It
							stays because the credential's own fields say where to copy each
							value from, never that the registration has to exist first.
						-->
						<N8nText :class="$style.hint" size="small" data-testid="teams-create-bot-prerequisites">
							{{ i18n.baseText('agents.channels.teams.setup.createCredential.prerequisites') }}
							<a
								:href="ENTRA_APP_REGISTRATION_URL"
								target="_blank"
								rel="noopener noreferrer"
								data-testid="teams-entra-register-link"
							>
								{{ i18n.baseText('agents.channels.teams.setup.createCredential.button') }}
							</a>
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

						<N8nText :class="$style.hint" size="small">
							{{ i18n.baseText('agents.channels.teams.setup.createBot.hint') }}
						</N8nText>

						<!--
							The endpoint is only needed by someone wiring up a bot they already
							have. The deployment sets it, so showing it by default puts a long
							opaque URL in front of everyone who does not need it.
						-->
						<N8nButton
							v-if="!showEndpoint"
							variant="ghost"
							size="small"
							data-testid="teams-show-endpoint"
							@click="showEndpoint = true"
						>
							{{ i18n.baseText('agents.channels.teams.setup.createBot.existingBot') }}
						</N8nButton>
						<div v-else :class="$style.urlField" data-testid="teams-endpoint-field">
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
							<N8nText :class="$style.hint" size="small">
								{{ i18n.baseText('agents.channels.teams.setup.createBot.existingBotHint') }}
							</N8nText>
						</div>
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

						<!-- Where to go next, not a check: the first message speaks for itself. -->
						<N8nButton
							v-if="setupState?.teamsChatDeepLink"
							:href="setupState.teamsChatDeepLink"
							target="_blank"
							variant="outline"
							size="medium"
							icon="teams"
							data-testid="teams-open-chat"
						>
							{{ i18n.baseText('agents.channels.teams.setup.install.openChat') }}
						</N8nButton>

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
