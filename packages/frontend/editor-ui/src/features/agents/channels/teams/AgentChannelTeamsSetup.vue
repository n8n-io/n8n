<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { saveAs } from 'file-saver';
import {
	N8nActionDropdown,
	N8nButton,
	N8nCopyInput,
	N8nIcon,
	N8nLink,
	N8nStepper,
	N8nText,
} from '@n8n/design-system';
import {
	type AgentTeamsIntegrationSettings,
	type ChatIntegrationDescriptor,
	type TeamsAgentSetupState,
	type TeamsCredentialCheck,
	type TeamsFileAccessCheck,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';
import {
	listenForCredentialChanges,
	useCredentialsStore,
} from '@/features/credentials/credentials.store';
import type { PermissionsRecord } from '@n8n/permissions';
import AgentIntegrationCredentialConnection from '../../components/AgentIntegrationCredentialConnection.vue';
import type { AgentCredentialOption } from '../../components/AgentCredentialSelect.vue';
import type { AgentChannelRestart } from '../types';
import AgentChannelTeamsAvailability from './AgentChannelTeamsAvailability.vue';
import AgentChannelTeamsManagedApp from './AgentChannelTeamsManagedApp.vue';
import type { TeamsChannelRuntime } from './useTeamsChannelRuntime';
import { useTeamsSetupRestart } from './useTeamsSetupRestart';
import { useTeamsUploadInstruction } from './useTeamsUploadInstruction';
import {
	availabilityFrom,
	AZURE_BOTS_URL,
	ENTRA_APP_REGISTRATIONS_URL,
	entraApiPermissionsUrl,
	permissionUseFor,
	TEAMS_PACKAGE_FILENAME,
	type TeamsAvailability,
} from './constants';
import AgentChannelTeamsIdentityCard from './AgentChannelTeamsIdentityCard.vue';
import { fileAccessJustApproved } from './fileAccessConsent';
import { useTeamsFileAccessMenu } from './useTeamsFileAccessMenu';
import { useAgentTelemetry } from '../../composables/useAgentTelemetry';
import {
	checkTeamsCredential,
	checkTeamsFileAccess,
	fetchTeamsAppPackage,
	getTeamsSetupState,
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
		errorMessage?: string;
		errorIsConflict?: boolean;
		projectId: string;
		agentId: string;
		forceNewCredential?: boolean;
		/** The credential the saved channel runs on, or '' while there is none. */
		savedCredentialId?: string;
		savedSettings?: AgentTeamsIntegrationSettings;
		ensureAgentPersisted?: () => Promise<void>;
		/** Saves without closing the modal, so the card can act on saved settings. */
		persistChannel?: () => Promise<boolean>;
		/**
		 * Present when the recommended setup is available here. The settings then
		 * offer publishing to the organisation, in place of the package the
		 * manual route hands over.
		 */
		managedRuntime?: TeamsChannelRuntime;
	}>(),
	{
		credentialsLoading: false,
		loading: false,
		connected: false,
		errorMessage: '',
		errorIsConflict: false,
		forceNewCredential: false,
		savedCredentialId: '',
		savedSettings: undefined,
		ensureAgentPersisted: undefined,
		persistChannel: undefined,
	},
);

const emit = defineEmits<{
	create: [];
	edit: [];
	connect: [];
	done: [];
	restart: [restart: AgentChannelRestart];
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const { restartOnCredentialChange } = useTeamsSetupRestart();
// Edit mode is guarded by AgentChannelTeamsEditView, which wraps this view.
const restartFrom = computed(() =>
	props.mode === 'setup' && props.connected ? props.savedCredentialId : '',
);
restartOnCredentialChange(
	credentialId,
	() => restartFrom.value,
	(restart) => emit('restart', restart),
);
const toast = useToast();
const agentTelemetry = useAgentTelemetry();

const ENTRA_APP_REGISTRATION_URL =
	'https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/CreateApplicationBlade';

const setupState = ref<TeamsAgentSetupState | null>(null);
/**
 * Who built the channel's app, held apart from `setupState` because that is
 * cleared whenever the read fails. Reading a failure as "built by hand" makes
 * the save hand over a package instead of publishing, so the change never
 * reaches the organisation's catalogue. `null` means nobody has answered yet.
 */
const provisionedByN8n = ref<boolean | null>(null);
// Only a picked credential makes the setup state worth retrying.
const setupLoadFailed = ref(false);
const showEndpoint = ref(false);

// A hidden read permission is never kept on: nothing here could turn it off.
const availability = ref<TeamsAvailability>(availabilityFrom(props.savedSettings));

/**
 * Whether this channel's app is one n8n made, which is what the managed card
 * acts on: it publishes that app, and it builds that app's package. Provenance
 * only -- it says nothing about whether anybody published, so nothing here may
 * publish on its own.
 */
const offerManagedApp = computed(() => {
	const managed = props.managedRuntime?.managedSetup.value;
	return Boolean(
		// Provenance first: a channel wired up by hand keeps the manual block,
		// even in a project that also happens to carry a Microsoft sign-in.
		provisionedByN8n.value === true &&
			managed?.managedSetupAvailable &&
			managed.managerCredentials.some(({ connected }) => connected),
	);
});

const organization = computed(() => {
	const managed = props.managedRuntime;
	const id = managed?.managerCredentialId.value;
	return (
		managed?.managedSetup.value.managerCredentials.find((c) => c.id === id)?.organizationName ?? ''
	);
});

const defaultDisplayName = computed(() => setupState.value?.defaultDisplayName ?? '');
const defaultDescription = computed(() => setupState.value?.defaultDescription ?? '');

// The identity comes from the agent. An override saved by an earlier version
// still shows here, because the installed app still carries it until the next save.
const savedIdentityOverride = computed(() =>
	Boolean(props.savedSettings?.displayName || props.savedSettings?.description),
);
const effectiveDisplayName = computed(
	() => props.savedSettings?.displayName || defaultDisplayName.value,
);
const effectiveDescription = computed(
	() => props.savedSettings?.description || defaultDescription.value,
);

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

// An edit made here wins over settings that arrive afterwards.
const availabilityTouched = ref(false);

function editAvailability(value: TeamsAvailability) {
	availability.value = value;
	availabilityTouched.value = true;
	// The downloaded package carries the old scopes.
	downloadedFor.value = null;
}

/**
 * Whether saving changes what the installed app carries: its scopes, or an
 * identity override this view no longer keeps. Teams only picks that up from
 * a new package.
 */
const manifestChanged = computed(() => {
	if (props.mode !== 'edit') return false;
	const saved = props.savedSettings;
	return (
		availability.value.teamChannels !== (saved?.teamChannels ?? false) ||
		availability.value.groupChats !== (saved?.groupChats ?? false) ||
		availability.value.readAllChannelMessages !== (saved?.readAllChannelMessages ?? false) ||
		availability.value.readAllGroupMessages !== (saved?.readAllGroupMessages ?? false) ||
		savedIdentityOverride.value
	);
});

/**
 * Teams holds an older version: the form holds a change, or the saved channel
 * already differs from what n8n last handed over, for example after a rename.
 */
const appOutdated = computed(() => manifestChanged.value || Boolean(setupState.value?.appOutdated));

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

async function downloadPackage(
	settings: AgentTeamsIntegrationSettings | undefined = currentSettings.value,
	packageCredentialId: string = credentialId.value,
): Promise<boolean> {
	downloading.value = true;
	downloadError.value = '';
	try {
		const blob = await fetchTeamsAppPackage(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			packageCredentialId || undefined,
			settings,
		);
		saveAs(blob, TEAMS_PACKAGE_FILENAME);
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
// The credential the last package was built for. Done waits for one of the current credential.
const downloadedFor = ref<string | null>(null);

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
	downloadedFor.value = id;
	toast.showMessage({
		type: 'success',
		title: i18n.baseText('agents.channels.teams.setup.install.downloaded'),
	});
	if (!props.connected) emit('connect');
}

// Locked only while a package is built from them. An edit after that invalidates the
// package, and Done saves the form, so the new download and n8n agree again.
const availabilityLocked = computed(() => !ready.value || downloading.value);

const canFinish = computed(() => downloadedFor.value === credentialId.value && props.connected);

const uploadInstruction = useTeamsUploadInstruction();

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
		if (request === latestSetupState) {
			setupState.value = state;
			provisionedByN8n.value = state.provisionedByN8n;
		}
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

async function refreshForCredential() {
	await Promise.all([runCredentialCheck('auto'), loadSetupState()]);
}

// A credential that waits for the restart is checked by the new setup, not here.
watch(
	credentialId,
	async (id) => {
		if (restartFrom.value && id && id !== restartFrom.value) return;
		await refreshForCredential();
	},
	{ immediate: true },
);

const fileAccessStatus = ref<TeamsFileAccessCheck['status'] | null>(null);
/**
 * Microsoft confirms an approval only on the redirect back here, and applying
 * it can take an hour, so the approval is announced once, from the redirect.
 * It belongs to the app of the credential picked then, not to the next one.
 */
const fileAccessApprovedFor = ref<string | null>(null);
const fileAccessApprovedNow = computed(() => fileAccessApprovedFor.value === credentialId.value);

/**
 * Only in the settings: that is where people return after sending the approval
 * link to an administrator. A failed check leaves the request on show.
 */
async function loadFileAccess() {
	fileAccessStatus.value = null;
	const id = credentialId.value;
	// Consumed only by a check that runs: the credential can arrive after the first call.
	if (props.mode !== 'edit' || !id) return;
	if (fileAccessJustApproved.value) {
		fileAccessJustApproved.value = false;
		fileAccessApprovedFor.value = id;
	}
	if (fileAccessApprovedNow.value) return;
	try {
		const { status } = await checkTeamsFileAccess(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			id,
		);
		if (credentialId.value === id) fileAccessStatus.value = status;
	} catch {
		// Unchecked reads the same as not approved.
		if (credentialId.value === id) fileAccessStatus.value = 'unknown';
	}
}

watch(credentialId, loadFileAccess, { immediate: true });

/**
 * The settings say nothing until both the check and the setup state answer:
 * an approved app never flashes the request, and the request never flips from
 * the hand-made wording to the one-step consent.
 */
const fileAccessState = computed<'request' | 'approved' | 'hidden'>(() => {
	if (props.mode !== 'edit') return 'request';
	if (fileAccessApprovedNow.value) return 'approved';
	if (!setupState.value && !setupLoadFailed.value) return 'hidden';
	return fileAccessStatus.value === 'notApproved' || fileAccessStatus.value === 'unknown'
		? 'request'
		: 'hidden';
});

/** Without a consent link, an admin grants the permission by hand in Entra. */
const fileAccessUrl = computed(() => {
	if (setupState.value?.fileAccessConsentUrl) return setupState.value.fileAccessConsentUrl;
	return setupState.value?.botId
		? entraApiPermissionsUrl(setupState.value.botId)
		: ENTRA_APP_REGISTRATIONS_URL;
});

const { items: fileAccessMenuItems, onSelect: onFileAccessMenu } = useTeamsFileAccessMenu({
	url: fileAccessUrl,
	organization: '',
});

// Saving the picked credential keeps its ID, so the watch above does not see the edit.
listenForCredentialChanges({
	store: useCredentialsStore(),
	onCredentialUpdated: async (credential) => {
		if (credential.id === credentialId.value) await refreshForCredential();
	},
});

// Settings can arrive after this mounts, so the empty defaults must not stick.
watch(
	() => props.savedSettings,
	(saved) => {
		if (saved && !availabilityTouched.value) availability.value = availabilityFrom(saved);
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
		id: 'download',
		title: i18n.baseText('agents.channels.teams.setup.download.title'),
	},
	{
		id: 'file-access',
		title: i18n.baseText('agents.channels.teams.managed.fileAccess.title'),
		description: i18n.baseText(
			`agents.channels.teams.managed.fileAccess.description.${permissionUseFor(availability.value)}`,
		),
	},
	{
		id: 'install',
		title: i18n.baseText('agents.channels.teams.setup.install.title'),
		description: uploadInstruction(availability.value),
	},
]);

/**
 * Built on the saved settings, because connecting replaces the settings object
 * wholesale: a field this form does not render would otherwise be dropped the
 * first time someone saves from here. The identity keys are left out, so the
 * app falls back to the agent's own name and description.
 */
const currentSettings = computed<AgentTeamsIntegrationSettings>(() => {
	const { displayName: _name, description: _description, ...rest } = props.savedSettings ?? {};
	return { ...rest, ...availability.value };
});

// Saving closes the modal, so after "Save and download" the toast is the only place left for the hint.
function showDownloaded() {
	toast.showMessage({
		type: 'success',
		title: i18n.baseText('agents.channels.teams.setup.install.downloaded'),
		message: i18n.baseText('agents.channels.teams.setup.install.hint'),
	});
}

// The package matches what n8n has saved, not the unsaved form, so an
// installed app never runs on settings that were never saved.
async function downloadSaved() {
	if (!(await downloadPackage(props.savedSettings, credentialId.value))) return;
	showDownloaded();
	await loadSetupState();
}

/**
 * A manifest change on a hand-made channel reaches Teams one way, as a new
 * package, so the save hands it over: the modal closes on the save, and a
 * download costs the user nothing.
 *
 * The managed route keeps a plain Save. Publishing reaches everyone in the
 * organisation, or asks an administrator to approve it, and a channel somebody
 * installed only for themselves has asked for neither. The card below offers
 * both routes by name, and the notice above it says to take one.
 */
const saveLabel = computed(() => {
	if (!manifestChanged.value || offerManagedApp.value) return undefined;
	return i18n.baseText('agents.channels.teams.settings.saveAndDownload');
});

// Captured before the save, because the saved settings then catch up with the form.
let pendingPackage: { settings: AgentTeamsIntegrationSettings; credentialId: string } | null = null;

async function beforeSave() {
	// A save that carries a manifest change picks its route from the provenance,
	// so an unanswered read is worth one more attempt before it decides.
	if (manifestChanged.value && provisionedByN8n.value === null) await loadSetupState();

	pendingPackage =
		manifestChanged.value && !offerManagedApp.value
			? { settings: currentSettings.value, credentialId: credentialId.value }
			: null;
}

/**
 * Runs only once the save succeeded, so the package never gets ahead of n8n.
 * It never throws: the settings are saved, and a failed download is reported
 * here and can be repeated from the card.
 */
async function afterSave() {
	const pending = pendingPackage;
	pendingPackage = null;
	// Attempted even without a bot ID here: the server builds the package from
	// the credential itself, and its failure is reported below.
	if (!pending) return;
	if (await downloadPackage(pending.settings, pending.credentialId)) {
		showDownloaded();
		return;
	}
	toast.showMessage({ type: 'error', title: downloadError.value });
}

defineExpose({
	credentialId,
	validationError: null,
	currentSettings,
	saveLabel,
	beforeSave,
	afterSave,
	keepOpenAfterConnect: computed(() => props.mode === 'setup'),
});
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
							variant="outline"
							size="medium"
							icon="entra"
							data-testid="teams-entra-register-link"
						>
							{{ i18n.baseText('agents.channels.teams.setup.registerApp.button') }}
						</N8nButton>
					</div>

					<div
						v-else-if="step.id === 'create-credential'"
						:class="[$style.stepStack, $style.fieldStack]"
					>
						<AgentIntegrationCredentialConnection
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
							:force-new-credential="forceNewCredential && !connected"
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
								variant="outline"
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
								:label="i18n.baseText('agents.channels.teams.messagingEndpointUrl.label')"
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
						:class="[$style.stepStack, { [$style.locked]: availabilityLocked }]"
						:inert="availabilityLocked || undefined"
						data-testid="teams-availability-step"
					>
						<AgentChannelTeamsAvailability
							:model-value="availability"
							start-collapsed
							hide-file-access
							@update:model-value="editAvailability"
						/>
					</div>

					<div
						v-else-if="step.id === 'file-access'"
						:class="[$style.stepStack, { [$style.locked]: !ready }]"
						:inert="!ready || undefined"
						data-testid="teams-file-access-step"
					>
						<N8nText :class="$style.hint" size="small">
							{{
								i18n.baseText(
									setupState?.fileAccessConsentUrl
										? 'agents.channels.teams.managed.fileAccess.hint'
										: 'agents.channels.teams.setup.availability.fileAccessPermission',
								)
							}}
						</N8nText>
						<N8nActionDropdown
							:items="fileAccessMenuItems"
							placement="bottom-start"
							:teleported="false"
							@select="onFileAccessMenu"
						>
							<template #activator>
								<N8nButton variant="outline" size="medium" data-testid="teams-file-access-menu">
									{{ i18n.baseText('agents.channels.teams.managed.fileAccess.button') }}
									<N8nIcon icon="chevron-down" size="small" />
								</N8nButton>
							</template>
						</N8nActionDropdown>
					</div>

					<div v-else-if="step.id === 'download'" :class="$style.stepStack">
						<AgentChannelTeamsIdentityCard
							:name="defaultDisplayName"
							:description="defaultDescription"
							:tooltip="i18n.baseText('agents.channels.teams.setup.install.identityTooltip')"
							:ready="ready"
							:loading="downloading || loading"
							@download="downloadAndConnect"
						/>

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
						<N8nText
							v-if="downloadError"
							size="small"
							:class="$style.error"
							data-testid="teams-download-error"
						>
							{{ downloadError }}
						</N8nText>
					</div>

					<div
						v-else-if="step.id === 'install'"
						:class="$style.stepStack"
						data-testid="teams-install-step"
					>
						<N8nText :class="$style.hint" size="small" data-testid="teams-upload-hint">
							{{ i18n.baseText('agents.channels.teams.setup.install.hint') }}
						</N8nText>
						<!-- Connect errors otherwise land in step 2, far from this step. -->
						<div v-if="showConnectError" :class="$style.actions">
							<N8nText size="small" :class="$style.error" data-testid="teams-connect-error">
								{{
									i18n.baseText('agents.channels.teams.setup.install.connectFailed', {
										interpolate: { error: errorMessage },
									})
								}}
							</N8nText>
							<!-- A retry only connects, so it needs a package that matches the form. -->
							<N8nButton
								variant="ghost"
								size="small"
								:disabled="loading || downloadedFor !== credentialId"
								data-testid="teams-connect-retry"
								@click="emit('connect')"
							>
								{{ i18n.baseText('generic.retry') }}
							</N8nButton>
						</div>
						<N8nButton
							variant="outline"
							size="medium"
							:disabled="!canFinish"
							data-testid="teams-done"
							@click="emit('done')"
						>
							{{ i18n.baseText('agents.channels.teams.setup.install.done') }}
						</N8nButton>
					</div>
				</div>
			</template>
		</N8nStepper>

		<div v-else :class="$style.formContent">
			<div :class="$style.field" data-testid="teams-availability-field">
				<N8nText step="sm" bold>
					{{ i18n.baseText('agents.channels.teams.settings.availabilityLabel') }}
				</N8nText>
				<AgentChannelTeamsAvailability
					:model-value="availability"
					start-collapsed
					:app-id="setupState?.botId"
					:file-access-consent-url="setupState?.fileAccessConsentUrl"
					:file-access-state="fileAccessState"
					:organization="organization"
					open-consent-in-place
					@update:model-value="editAvailability"
				/>
				<N8nText
					v-if="!offerManagedApp"
					size="small"
					:class="$style.hint"
					data-testid="teams-update-notice"
				>
					{{ i18n.baseText('agents.channels.teams.settings.updateNotice') }}
				</N8nText>
			</div>

			<!-- The managed route publishes to the organisation; the manual one hands
			     over a package. Only one of them is this channel's, so only one is shown. -->
			<AgentChannelTeamsManagedApp
				v-if="offerManagedApp && managedRuntime"
				:runtime="managedRuntime"
				:name="effectiveDisplayName"
				:description="effectiveDescription"
				:credential-id="credentialId"
				:project-id="projectId"
				:agent-id="agentId"
				:settings="savedSettings"
				:pending-settings="currentSettings"
				:unsaved-changes="manifestChanged"
				:persist-channel="persistChannel"
				:azure-bot="setupState?.azureBot ?? null"
				:outdated="appOutdated"
				@installed="loadSetupState"
			/>
			<template v-else>
				<div :class="$style.field" data-testid="teams-identity-field">
					<N8nText step="sm" bold>
						{{ i18n.baseText('agents.channels.teams.settings.identityLabel') }}
					</N8nText>
					<AgentChannelTeamsIdentityCard
						:name="effectiveDisplayName"
						:description="effectiveDescription"
						:tooltip="
							savedIdentityOverride
								? ''
								: i18n.baseText('agents.channels.teams.setup.install.identityTooltip')
						"
						:ready="canDownloadPackage"
						:loading="downloading"
						:outdated="appOutdated"
						@download="downloadSaved"
					/>
					<N8nText
						v-if="appOutdated"
						size="small"
						:class="$style.outdated"
						data-testid="teams-app-outdated"
					>
						{{ i18n.baseText('agents.channels.teams.settings.outdated') }}
					</N8nText>
					<N8nText
						v-if="downloadError"
						size="small"
						:class="$style.error"
						data-testid="teams-download-error"
					>
						{{ downloadError }}
					</N8nText>
				</div>
				<N8nLink
					:href="AZURE_BOTS_URL"
					target="_blank"
					rel="noopener noreferrer"
					:class="$style.azureLink"
					data-testid="teams-azure-bot-link"
				>
					<span :class="$style.linkContent">
						{{ i18n.baseText('agents.channels.teams.settings.findBot') }}
						<N8nIcon icon="external-link" size="xsmall" />
					</span>
				</N8nLink>
			</template>
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

.formContent {
	gap: var(--spacing--md);
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

/* Matches a labelled input: the credential's status sits right under the select. */
.fieldStack {
	gap: var(--spacing--2xs);
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

.outdated {
	color: var(--text-color--warning);
}

.azureLink {
	align-self: flex-start;
}

.linkContent {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
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
