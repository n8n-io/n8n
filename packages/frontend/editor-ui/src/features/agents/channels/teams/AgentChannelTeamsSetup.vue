<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { saveAs } from 'file-saver';
import {
	N8nButton,
	N8nCopyInput,
	N8nIcon,
	N8nInput,
	N8nStepper,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { TEAMS_DESCRIPTION_MAX, TEAMS_DISPLAY_NAME_MAX } from '@n8n/api-types';
import type {
	AgentJsonConfig,
	AgentTeamsIntegrationSettings,
	ChatIntegrationDescriptor,
	TeamsAgentSetupState,
	TeamsCredentialCheck,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { PermissionsRecord } from '@n8n/permissions';
import AgentPersonalisationIcon from '../../components/AgentPersonalisationIcon.vue';
import AgentIntegrationCredentialConnection from '../../components/AgentIntegrationCredentialConnection.vue';
import type { AgentCredentialOption } from '../../components/AgentCredentialSelect.vue';
import AgentChannelTeamsAvailability, {
	type TeamsAvailability,
} from './AgentChannelTeamsAvailability.vue';
import { useAgentTelemetry } from '../../composables/useAgentTelemetry';
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
		personalisation?: AgentJsonConfig['personalisation'] | null;
		ensureAgentPersisted?: () => Promise<void>;
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
		personalisation: null,
		ensureAgentPersisted: undefined,
	},
);

const emit = defineEmits<{
	create: [];
	edit: [];
	connect: [];
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const toast = useToast();
const agentTelemetry = useAgentTelemetry();

const ENTRA_APP_REGISTRATION_URL =
	'https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/CreateApplicationBlade';

const setupState = ref<TeamsAgentSetupState | null>(null);
// Only a picked credential makes the setup state worth retrying.
const setupLoadFailed = ref(false);
const showEndpoint = ref(false);

const availability = ref<TeamsAvailability>({
	teamChannels: props.savedSettings?.teamChannels ?? false,
	groupChats: props.savedSettings?.groupChats ?? false,
	readAllChannelMessages: props.savedSettings?.readAllChannelMessages ?? false,
	readAllGroupMessages: props.savedSettings?.readAllGroupMessages ?? false,
});

const displayName = ref(props.savedSettings?.displayName ?? '');
const description = ref(props.savedSettings?.description ?? '');

/**
 * Shown as placeholders rather than written into the fields. Filling them in
 * would save them as overrides on the first connect, and the Teams app would
 * then keep the agent's old name after a rename.
 */
const defaultDisplayName = computed(() => setupState.value?.defaultDisplayName ?? '');
const defaultDescription = computed(() => setupState.value?.defaultDescription ?? '');

const messagingEndpointUrl = computed(() => {
	if (setupState.value) return setupState.value.messagingEndpointUrl;
	// The same shape the backend builds, so the URL still shows when the setup
	// request fails -- which is when someone most needs to paste it by hand.
	const base = rootStore.urlBaseWebhook.replace(/\/$/, '');
	return `${base}/rest/projects/${props.projectId}/agents/v2/${props.agentId}/webhooks/teams`;
});

/**
 * Surfaced here rather than at connect, which is three steps later: by then the
 * user has already spent an Azure deployment that the portal refuses, and reads
 * Azure's wording for a choice they could still change on this step.
 */
const credentialClaimedBy = computed(() => setupState.value?.credentialClaimedBy ?? null);

const downloading = ref(false);
const downloadError = ref('');
// The manifest needs the bot's client ID, which the picked credential supplies
// before it is connected, so the step does not wait on connecting.
const canDownloadPackage = computed(
	() => Boolean(setupState.value?.botId) && !credentialClaimedBy.value,
);

const credentialCheck = ref<TeamsCredentialCheck | null>(null);
const checking = ref(false);

/**
 * Both requests answer for the credential that was selected when they were
 * sent. Without this, switching credentials quickly lets an earlier answer
 * land last and describe the wrong one -- as a verified credential, or as a
 * deployment link for the credential no longer selected. Each request has its
 * own counter, so reloading one does not discard an answer for the other.
 */
let latestCheck = 0;
let latestSetupState = 0;

/**
 * Tracked per field, so an edit to one does not stop the others adopting
 * settings that arrive afterwards.
 */
const touched = ref(new Set<'availability' | 'displayName' | 'description'>());

function editAvailability(value: TeamsAvailability) {
	availability.value = value;
	touched.value.add('availability');
}

function editDisplayName(value: string) {
	displayName.value = value;
	touched.value.add('displayName');
}

function editDescription(value: string) {
	description.value = value;
	touched.value.add('description');
}

/**
 * Saving is gated on the credential actually reaching Microsoft. Without this
 * the channel connects on a wrong secret and fails on the first message, long
 * after the setup said it succeeded.
 */
const credentialVerified = computed(() => credentialCheck.value?.status === 'ok');
const credentialProblem = computed(() =>
	credentialCheck.value?.status === 'failed' ? credentialCheck.value.reason : null,
);

// The manifest needs the bot ID, and a package for a credential that fails
// its check would install a bot that cannot answer. A connected channel passed
// that check when it connected, and setup no longer shows the check.
const ready = computed(
	() => canDownloadPackage.value && (props.connected || credentialVerified.value),
);

// A deployment with IDs that fail the check binds the bot to the wrong app
// registration, and Microsoft allows one bot for each registration.
const deployToAzureUrl = computed(() =>
	props.connected || credentialVerified.value ? (setupState.value?.deployToAzureUrl ?? null) : null,
);

async function runCredentialCheck(trigger: 'auto' | 'recheck') {
	const request = ++latestCheck;
	const id = credentialId.value;
	// A result for the credential just replaced says nothing about this one, so
	// it goes before the new answer arrives rather than after.
	credentialCheck.value = null;
	checking.value = false;
	// Only the setup step reads the result, and the check costs a token request
	// to Microsoft, so the settings view does not pay for it.
	if (props.mode !== 'setup' || !id) return;

	checking.value = true;
	let result: TeamsCredentialCheck;
	// Shown to the user as unreachable, but kept apart in telemetry: a failed
	// n8n request says nothing about whether Microsoft accepts the credential.
	let requestFailed = false;
	try {
		result = await checkTeamsCredential(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			id,
		);
	} catch {
		result = { status: 'failed', reason: 'unreachable' };
		requestFailed = true;
	}
	if (request !== latestCheck) return;
	credentialCheck.value = result;
	checking.value = false;
	agentTelemetry.trackCheckedTeamsCredential({
		agentId: props.agentId,
		trigger,
		status: result.status,
		...(result.status === 'failed'
			? { reason: requestFailed ? 'request_failed' : result.reason }
			: {}),
	});
}

async function downloadPackage(): Promise<boolean> {
	downloading.value = true;
	downloadError.value = '';
	try {
		const blob = await fetchTeamsAppPackage(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			credentialId.value || undefined,
			currentSettings.value,
		);
		saveAs(blob, 'n8n-agent-teams-app.zip');
		agentTelemetry.trackDownloadedTeamsAppPackage({ agentId: props.agentId, status: 'success' });
		return true;
	} catch {
		downloadError.value = i18n.baseText('agents.channels.teams.setup.install.downloadFailed');
		agentTelemetry.trackDownloadedTeamsAppPackage({ agentId: props.agentId, status: 'error' });
		return false;
	} finally {
		downloading.value = false;
	}
}

let unmounted = false;
onBeforeUnmount(() => (unmounted = true));

// Set when the credential changed during a download, so the saved zip is for the old bot.
const staleDownload = ref(false);

// Connecting closes the modal, so it waits for the package to be saved.
async function downloadAndConnect() {
	const id = credentialId.value;
	staleDownload.value = false;
	if (!(await downloadPackage()) || unmounted) return;
	// The package carries the bot ID of the credential it was built for, so a
	// switch during the download must not connect the new one.
	if (credentialId.value !== id || !ready.value) {
		staleDownload.value = true;
		return;
	}
	toast.showMessage({
		type: 'success',
		title: i18n.baseText('agents.channels.teams.setup.install.downloaded'),
	});
	if (!props.connected) emit('connect');
}

// The modal clears the error when the credential changes. A conflict is about
// the credential itself, so it stays in step 2.
const showConnectError = computed(
	() => Boolean(props.errorMessage) && !props.errorIsConflict && !props.connected,
);

async function loadSetupState() {
	const request = ++latestSetupState;
	setupLoadFailed.value = false;
	if (!props.projectId || !props.agentId) return;
	// A new agent has no row yet, and every agent-scoped Teams request needs
	// one. Picking a credential is the first step that asks for that data.
	if (props.mode === 'setup' && credentialId.value) {
		try {
			await props.ensureAgentPersisted?.();
		} catch (error) {
			if (request !== latestSetupState) return;
			setupState.value = null;
			setupLoadFailed.value = true;
			// The inline retry says the setup failed; the toast says why.
			toast.showError(error, i18n.baseText('agents.channels.modal.saveChannelError'));
			return;
		}
	}
	try {
		const state = await getTeamsSetupState(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			credentialId.value || undefined,
		);
		if (request === latestSetupState) setupState.value = state;
	} catch {
		if (request !== latestSetupState) return;
		setupState.value = null;
		setupLoadFailed.value = Boolean(credentialId.value);
	}
}

watch(
	() => props.connected,
	() => loadSetupState(),
);

watch(
	credentialId,
	async () => {
		await Promise.all([runCredentialCheck('auto'), loadSetupState()]);
	},
	{ immediate: true },
);

/**
 * Re-synced rather than read once, so settings that arrive after this mounts
 * are not overwritten by the empty defaults the refs started with. Edits
 * already made here win: only an untouched field follows the saved value.
 */
watch(
	() => props.savedSettings,
	(saved) => {
		if (!saved) return;
		if (!touched.value.has('availability')) {
			availability.value = {
				teamChannels: saved.teamChannels ?? false,
				groupChats: saved.groupChats ?? false,
				readAllChannelMessages: saved.readAllChannelMessages ?? false,
				readAllGroupMessages: saved.readAllGroupMessages ?? false,
			};
		}
		if (!touched.value.has('displayName')) displayName.value = saved.displayName ?? '';
		if (!touched.value.has('description')) description.value = saved.description ?? '';
	},
);

const steps = computed(() => [
	{
		id: 'register-app',
		title: i18n.baseText('agents.channels.teams.setup.registerApp.title'),
		description: i18n.baseText('agents.channels.teams.setup.registerApp.description'),
	},
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

/**
 * Built on the saved settings, because connecting replaces the settings object
 * wholesale: a field this form does not render would otherwise be dropped the
 * first time someone saves from here.
 *
 * Empty strings are absent rather than values: the schema requires a non-empty
 * string when the field is present, and both fall back server-side.
 */
const currentSettings = computed(() => {
	// The identity keys are dropped from the base: an empty field means "fall
	// back to the agent", and the saved value would otherwise reinstate itself.
	const {
		displayName: _saved,
		description: _savedDescription,
		...rest
	} = props.savedSettings ?? {};
	return {
		...rest,
		...availability.value,
		...(displayName.value.trim() ? { displayName: displayName.value.trim() } : {}),
		...(description.value.trim() ? { description: description.value.trim() } : {}),
	};
});

defineExpose({ credentialId, validationError: null, currentSettings });
</script>

<template>
	<div :class="$style.teamsSetup">
		<N8nStepper v-if="mode === 'setup'" :steps="steps">
			<template #default="{ step }">
				<div :class="$style.stepContent">
					<div v-if="step.id === 'register-app'" :class="$style.stepStack">
						<N8nText :class="$style.hint" size="small">
							{{ i18n.baseText('agents.channels.teams.setup.registerApp.hint') }}
						</N8nText>
						<N8nButton
							:href="ENTRA_APP_REGISTRATION_URL"
							target="_blank"
							variant="subtle"
							size="medium"
							icon="entra"
							data-testid="teams-entra-register-link"
						>
							{{ i18n.baseText('agents.channels.teams.setup.registerApp.button') }}
						</N8nButton>
					</div>

					<div v-else-if="step.id === 'create-credential'" :class="$style.stepStack">
						<AgentIntegrationCredentialConnection
							v-if="!connected"
							v-model="credentialId"
							:integration-type="integration.type"
							:integration-label="integration.label"
							:credentials="credentials"
							:credential-permissions="credentialPermissions"
							:credentials-loading="credentialsLoading"
							:disabled="loading || downloading"
							:loading="loading"
							:error-message="showConnectError ? '' : errorMessage"
							:error-is-conflict="errorIsConflict"
							:force-new-credential="forceNewCredential"
							@create="emit('create')"
							@edit="emit('edit')"
						/>

						<N8nText
							v-if="credentialClaimedBy"
							size="small"
							:class="$style.error"
							data-testid="teams-credential-claimed"
						>
							{{
								i18n.baseText('agents.channels.teams.setup.createCredential.claimed', {
									interpolate: { agent: credentialClaimedBy },
								})
							}}
						</N8nText>
						<template v-else-if="!connected">
							<N8nText
								v-if="checking"
								:class="$style.hint"
								size="small"
								data-testid="teams-credential-checking"
							>
								{{ i18n.baseText('agents.channels.teams.setup.install.checking') }}
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
									@click="runCredentialCheck('recheck')"
								>
									{{ i18n.baseText('agents.channels.teams.setup.install.recheck') }}
								</N8nButton>
							</template>
							<N8nText
								v-else-if="credentialVerified"
								size="small"
								color="success"
								:class="$style.verified"
								data-testid="teams-credential-verified"
							>
								<N8nIcon icon="check" size="small" />
								{{ i18n.baseText('agents.channels.teams.setup.install.verified') }}
							</N8nText>
						</template>
					</div>

					<div v-else-if="step.id === 'create-bot'" :class="$style.stepStack">
						<N8nText :class="$style.hint" size="small">
							{{ i18n.baseText('agents.channels.teams.setup.createBot.hint') }}
						</N8nText>
						<div :class="$style.actions">
							<N8nButton
								:href="deployToAzureUrl ?? undefined"
								target="_blank"
								variant="subtle"
								size="medium"
								icon="azure"
								:disabled="!deployToAzureUrl"
								data-testid="teams-deploy-to-azure"
								@click="agentTelemetry.trackClickedDeployToAzure({ agentId })"
							>
								{{ i18n.baseText('agents.channels.teams.setup.createBot.button') }}
							</N8nButton>
							<N8nButton
								variant="ghost"
								size="medium"
								data-testid="teams-show-endpoint"
								@click="showEndpoint = !showEndpoint"
							>
								{{ i18n.baseText('agents.channels.teams.setup.createBot.existingBot') }}
							</N8nButton>
						</div>
						<div
							v-if="setupLoadFailed"
							:class="$style.actions"
							data-testid="teams-setup-load-failed"
						>
							<N8nText size="small" :class="$style.error">
								{{ i18n.baseText('agents.channels.teams.setup.createBot.loadFailed') }}
							</N8nText>
							<N8nButton
								variant="ghost"
								size="small"
								data-testid="teams-setup-retry"
								@click="loadSetupState"
							>
								{{ i18n.baseText('generic.retry') }}
							</N8nButton>
						</div>
						<N8nText
							v-else-if="!deployToAzureUrl && !checking"
							:class="$style.hint"
							size="small"
							data-testid="teams-deploy-blocked"
						>
							{{
								credentialClaimedBy
									? i18n.baseText('agents.channels.teams.setup.createBot.needsFreeCredential')
									: i18n.baseText('agents.channels.teams.setup.createBot.needsCredential')
							}}
						</N8nText>

						<!-- The deployment sets the endpoint, so only someone wiring up an
							existing bot needs to see it. -->
						<div v-if="showEndpoint" :class="$style.field" data-testid="teams-endpoint-field">
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

					<div
						v-else-if="step.id === 'availability'"
						:class="[$style.stepStack, { [$style.locked]: !ready }]"
						:inert="!ready || undefined"
						data-testid="teams-availability-step"
					>
						<AgentChannelTeamsAvailability
							:model-value="availability"
							start-collapsed
							@update:model-value="editAvailability"
						/>
					</div>

					<div v-else-if="step.id === 'install'" :class="$style.stepStack">
						<N8nText :class="$style.hint" size="small">
							{{ i18n.baseText('agents.channels.teams.setup.install.hint') }}
						</N8nText>

						<div
							:class="[$style.identity, ready ? $style.identityReady : $style.locked]"
							data-testid="teams-identity"
						>
							<AgentPersonalisationIcon :personalisation="personalisation" :size="36" />
							<div :class="$style.identityText">
								<N8nText size="small" bold>
									{{ defaultDisplayName }}
									<N8nTooltip
										:content="i18n.baseText('agents.channels.teams.setup.install.identityTooltip')"
									>
										<N8nIcon icon="info" size="xsmall" :class="$style.hint" />
									</N8nTooltip>
								</N8nText>
								<N8nText size="small" :class="$style.hint">
									{{ defaultDescription }}
								</N8nText>
							</div>
							<N8nButton
								variant="outline"
								size="medium"
								:disabled="!ready || loading"
								:loading="downloading || loading"
								data-testid="teams-download-package"
								@click="downloadAndConnect"
							>
								{{ i18n.baseText('agents.channels.teams.setup.install.button') }}
								<N8nIcon icon="download" size="medium" />
							</N8nButton>
						</div>

						<N8nText
							v-if="staleDownload"
							size="small"
							:class="$style.error"
							data-testid="teams-stale-download"
						>
							{{ i18n.baseText('agents.channels.teams.setup.install.staleDownload') }}
						</N8nText>
						<!-- A failed load and a claimed credential already say so in steps 2 and 3. -->
						<N8nText
							v-if="!ready && !credentialVerified && !setupLoadFailed"
							:class="$style.hint"
							size="small"
							data-testid="teams-package-blocked"
						>
							{{ i18n.baseText('agents.channels.teams.setup.install.needsReady') }}
						</N8nText>
						<!-- Connect errors otherwise land in step 2, far from this button. -->
						<div v-if="showConnectError" :class="$style.actions">
							<N8nText size="small" :class="$style.error" data-testid="teams-connect-error">
								{{
									i18n.baseText('agents.channels.teams.setup.install.connectFailed', {
										interpolate: { error: errorMessage },
									})
								}}
							</N8nText>
							<!-- The package is already downloaded, so a retry only connects. -->
							<N8nButton
								variant="ghost"
								size="small"
								:disabled="loading"
								data-testid="teams-connect-retry"
								@click="emit('connect')"
							>
								{{ i18n.baseText('generic.retry') }}
							</N8nButton>
						</div>
						<N8nText
							v-if="downloadError"
							size="small"
							:class="$style.error"
							data-testid="teams-download-error"
						>
							{{ downloadError }}
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
			<N8nText size="small" :class="$style.hint" data-testid="teams-update-notice">
				{{ i18n.baseText('agents.channels.teams.settings.updateNotice') }}
			</N8nText>

			<div :class="$style.field" data-testid="teams-display-name">
				<label for="teams-display-name">
					<N8nText size="small" bold>
						{{ i18n.baseText('agents.channels.teams.settings.displayName') }}
					</N8nText>
				</label>
				<N8nInput
					id="teams-display-name"
					:model-value="displayName"
					@update:model-value="editDisplayName"
					size="large"
					:maxlength="TEAMS_DISPLAY_NAME_MAX"
					:placeholder="defaultDisplayName"
					show-word-limit
				/>
			</div>

			<div :class="$style.field" data-testid="teams-description">
				<label for="teams-description">
					<N8nText size="small" bold>
						{{ i18n.baseText('agents.channels.teams.settings.description') }}
					</N8nText>
				</label>
				<N8nInput
					id="teams-description"
					:model-value="description"
					@update:model-value="editDescription"
					size="large"
					:maxlength="TEAMS_DESCRIPTION_MAX"
					:placeholder="defaultDescription"
					show-word-limit
				/>
			</div>

			<AgentChannelTeamsAvailability
				:model-value="availability"
				start-collapsed
				@update:model-value="editAvailability"
			/>

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
			<N8nText v-if="downloadError" size="small" :class="$style.error">
				{{ downloadError }}
			</N8nText>

			<N8nButton
				v-if="!showEndpoint"
				variant="ghost"
				size="small"
				data-testid="teams-show-endpoint"
				@click="showEndpoint = true"
			>
				{{ i18n.baseText('agents.channels.teams.setup.createBot.existingBot') }}
			</N8nButton>
			<div v-else :class="$style.field" data-testid="teams-endpoint-field">
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

.field {
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

.verified {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.actions {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--2xs);
}

.locked {
	opacity: 0.45;
	pointer-events: none;
}

.identity {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	width: 100%;
	padding: var(--spacing--xs);
	/* Matches the availability panel above it. */
	border: var(--border-width, 1px) solid var(--border-color--subtle);
	border-radius: var(--radius--xs);
}

/*
 * One step off the modal in both themes. The semantic tokens are relative to
 * the page, and the dark modal is lighter than the dark page surface.
 */
.identityReady {
	background: light-dark(var(--color--neutral-50), var(--color--white-alpha-50));
	/* The dark fill matches the subtle border, which would hide it. */
	border-color: light-dark(var(--border-color--subtle), var(--border-color));
}

.identityText {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	flex: 1;
	min-width: 0;
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
