<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { N8nButton, N8nCopyInput, N8nIcon, N8nLink, N8nStepper, N8nText } from '@n8n/design-system';
import {
	resolveWhatsAppSettings,
	type AgentJsonConfig,
	type AgentWhatsAppIntegrationSettings,
	type ChatIntegrationDescriptor,
	type WhatsAppCredentialCheck,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';
import { ResponseError } from '@n8n/rest-api-client';
import type { PermissionsRecord } from '@n8n/permissions';
import {
	listenForCredentialChanges,
	useCredentialsStore,
} from '@/features/credentials/credentials.store';
import { TIME } from '@/app/constants';
import { getWhatsAppVerifyToken } from '../../composables/useAgentApi';
import AgentIntegrationCredentialConnection from '../../components/AgentIntegrationCredentialConnection.vue';
import type { AgentCredentialOption } from '../../components/AgentCredentialSelect.vue';
import AgentChannelWhatsAppIdentityCard from './AgentChannelWhatsAppIdentityCard.vue';
import AgentChannelWhatsAppSettings, {
	type WhatsAppChannelSettings,
} from './AgentChannelWhatsAppSettings.vue';
import {
	checkWhatsAppCredential,
	getWhatsAppWebhookStatus,
	resetWhatsAppWebhookStatus,
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
		savedSettings?: AgentWhatsAppIntegrationSettings;
		agentName: string;
		projectId: string;
		agentId: string;
		forceNewCredential?: boolean;
		personalisation?: AgentJsonConfig['personalisation'] | null;
		ensureAgentPersisted?: () => Promise<void>;
	}>(),
	{
		credentialsLoading: false,
		loading: false,
		connected: false,
		errorMessage: '',
		errorIsConflict: false,
		savedSettings: undefined,
		forceNewCredential: false,
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

const META_APP_DASHBOARD_URL = 'https://developers.facebook.com/apps';

/** Meta retries the handshake only when someone clicks Verify, so a slow poll is enough. */
const WEBHOOK_POLL_MS = 3 * TIME.SECOND;

const verifyToken = shallowRef('');

const webhookVerified = ref(false);
let pollTimer: ReturnType<typeof setTimeout> | undefined;
let unmounted = false;
// Set when the status check found no saved agent. Picking a credential saves it.
let waitingForAgent = false;
// Set once `ensureAgentPersisted` resolves. A 404 for a request sent before then is out of date.
let agentSaved = false;
// Starting a new reset-and-poll run bumps this, so an older run stops at its next step.
let webhookRun = 0;
// A failing reset is retried on every poll tick, so say so only once.
let resetErrorShown = false;

const webhookUrl = computed(() => {
	const base = rootStore.urlBaseWebhook.replace(/\/$/, '');
	return `${base}/rest/projects/${props.projectId}/agents/v2/${props.agentId}/webhooks/whatsapp`;
});

// Meta refuses to save a callback URL that is not HTTPS, so say so before the user tries.
const webhookNotHttps = computed(() => !webhookUrl.value.startsWith('https://'));

async function loadVerifyToken() {
	try {
		const response = await getWhatsAppVerifyToken(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
		);
		verifyToken.value = response.verifyToken;
	} catch {
		// Leave the field blank. Picking a credential saves the agent and retries.
	}
}

// ---------------------------------------------------------------------------
// Credential check (step 2)
// ---------------------------------------------------------------------------

/** `notFound` comes from a 404: the caller cannot use the credential, or it was deleted. */
type CredentialCheckResult = WhatsAppCredentialCheck | { status: 'failed'; reason: 'notFound' };

const credentialCheck = ref<CredentialCheckResult | null>(null);
const checking = ref(false);

/**
 * Each answer is for the credential that was selected when it was sent. Without
 * this, switching credentials quickly lets an earlier answer land last and
 * describe the wrong one.
 */
let latestCheck = 0;

const credentialVerified = computed(() => credentialCheck.value?.status === 'ok');
const credentialProblem = computed(() =>
	credentialCheck.value?.status === 'failed' ? credentialCheck.value.reason : null,
);
const profile = computed(() =>
	credentialCheck.value?.status === 'ok' ? credentialCheck.value.profile : null,
);

async function runCredentialCheck() {
	const request = ++latestCheck;
	const id = credentialId.value;
	// A result for the credential just replaced says nothing about this one.
	credentialCheck.value = null;
	checking.value = false;
	if (!id) return;

	checking.value = true;
	// A new agent has no row yet, and the check and the verify token both need one.
	if (props.mode === 'setup') {
		try {
			await props.ensureAgentPersisted?.();
		} catch (error) {
			if (request !== latestCheck || unmounted) return;
			checking.value = false;
			credentialCheck.value = { status: 'failed', reason: 'unreachable' };
			toast.showError(error, i18n.baseText('agents.channels.modal.saveChannelError'));
			return;
		}
		agentSaved = true;
		if (!verifyToken.value) void loadVerifyToken();
		resumeWebhookPolling();
	}

	let result: CredentialCheckResult;
	try {
		result = await checkWhatsAppCredential(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			id,
		);
	} catch (error) {
		const notFound = error instanceof ResponseError && error.httpStatusCode === 404;
		result = { status: 'failed', reason: notFound ? 'notFound' : 'unreachable' };
	}
	if (request !== latestCheck) return;
	credentialCheck.value = result;
	checking.value = false;
}

watch(credentialId, runCredentialCheck, { immediate: true });

// Saving the picked credential keeps its ID, so the watch above does not see the edit.
// Pinia removes this listener when the component unmounts.
listenForCredentialChanges({
	store: useCredentialsStore(),
	onCredentialUpdated: async (credential) => {
		if (credential.id !== credentialId.value) return;
		// The edit can point the credential at another Meta app, like picking another credential.
		if (props.mode === 'setup') restartWebhookCheck();
		await runCredentialCheck();
	},
});

// ---------------------------------------------------------------------------
// Webhook handshake (step 4)
// ---------------------------------------------------------------------------

function isWebhookRunStale(run: number) {
	return unmounted || run !== webhookRun;
}

function isAgentMissing(error: unknown) {
	return error instanceof ResponseError && error.httpStatusCode === 404;
}

async function pollWebhookStatus(run: number) {
	const savedBeforeRequest = agentSaved;
	try {
		const status = await getWhatsAppWebhookStatus(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
		);
		if (isWebhookRunStale(run)) return;
		webhookVerified.value = status.verified;
	} catch (error) {
		if (isWebhookRunStale(run)) return;
		if (isAgentMissing(error)) {
			// The agent was saved while this request was out, so ask again.
			if (agentSaved && !savedBeforeRequest) {
				void pollWebhookStatus(run);
				return;
			}
			// A new agent has no row until a credential is picked, so polling now would
			// only repeat the same 404. `resumeWebhookPolling` starts it again.
			waitingForAgent = true;
			return;
		}
	}
	if (!webhookVerified.value) {
		pollTimer = setTimeout(() => {
			void pollWebhookStatus(run);
		}, WEBHOOK_POLL_MS);
	}
}

/**
 * Meta's handshake does not say which app sent it, so a record left by an
 * earlier app would confirm step 4 at once. Clearing it first means only a
 * handshake from now on counts.
 */
async function resetThenPollWebhookStatus(run: number) {
	const savedBeforeRequest = agentSaved;
	try {
		await resetWhatsAppWebhookStatus(rootStore.restApiContext, props.projectId, props.agentId);
	} catch (error) {
		if (isWebhookRunStale(run)) return;
		if (isAgentMissing(error)) {
			// The agent was saved while this request was out, so clear its record now.
			if (agentSaved && !savedBeforeRequest) {
				void resetThenPollWebhookStatus(run);
				return;
			}
			// A new agent has no row yet, so it has no record to clear either.
			waitingForAgent = true;
			return;
		}
		if (!resetErrorShown) {
			resetErrorShown = true;
			toast.showError(error, i18n.baseText('agents.channels.whatsapp.setup.verify.resetError'));
		}
		// Polling now could read the earlier record and enable Connect, so retry the reset instead.
		pollTimer = setTimeout(() => {
			void resetThenPollWebhookStatus(run);
		}, WEBHOOK_POLL_MS);
		return;
	}
	if (!isWebhookRunStale(run)) await pollWebhookStatus(run);
}

function resumeWebhookPolling() {
	if (!waitingForAgent || unmounted) return;
	waitingForAgent = false;
	void pollWebhookStatus(webhookRun);
}

function restartWebhookCheck() {
	clearTimeout(pollTimer);
	waitingForAgent = false;
	webhookVerified.value = false;
	void resetThenPollWebhookStatus(++webhookRun);
}

// Another credential can belong to another Meta app, and the handshake from the
// previous app says nothing about the new one.
let previousCredentialId = credentialId.value;
watch(credentialId, (id) => {
	if (!id) return;
	const previous = previousCredentialId;
	previousCredentialId = id;
	if (props.mode === 'setup' && previous && previous !== id) restartWebhookCheck();
});

onMounted(() => {
	// Only the setup shows the webhook fields and this step. A connected channel has its own adapter answer Meta.
	if (props.mode !== 'setup') return;
	void loadVerifyToken();
	void resetThenPollWebhookStatus(webhookRun);
});

onBeforeUnmount(() => {
	unmounted = true;
	clearTimeout(pollTimer);
});

// ---------------------------------------------------------------------------
// Connect (step 5)
// ---------------------------------------------------------------------------

const ready = computed(() => credentialVerified.value && webhookVerified.value && !props.connected);

// A conflict is about the credential itself, so it stays in step 2.
const showConnectError = computed(
	() => Boolean(props.errorMessage) && !props.errorIsConflict && !props.connected,
);

const steps = computed(() => [
	{
		id: 'create-app',
		title: i18n.baseText('agents.channels.whatsapp.setup.createApp.title'),
		description: i18n.baseText('agents.channels.whatsapp.setup.createApp.description'),
	},
	{
		id: 'credential',
		title: i18n.baseText('agents.channels.whatsapp.setup.credential.title'),
		description: i18n.baseText('agents.channels.whatsapp.setup.credential.description'),
	},
	{
		id: 'webhook',
		title: i18n.baseText('agents.channels.whatsapp.setup.webhook.title'),
		description: i18n.baseText('agents.channels.whatsapp.setup.webhook.description'),
	},
	{
		id: 'verify',
		title: i18n.baseText('agents.channels.whatsapp.setup.verify.title'),
		description: i18n.baseText('agents.channels.whatsapp.setup.verify.description'),
	},
	{
		id: 'connect',
		title: i18n.baseText('agents.channels.whatsapp.setup.connect.title'),
	},
]);

// ---------------------------------------------------------------------------
// Settings (edit mode)
// ---------------------------------------------------------------------------

const settings = ref<WhatsAppChannelSettings>(resolveWhatsAppSettings(props.savedSettings));
// An edit made here wins over settings that arrive afterwards.
const settingsTouched = ref(false);

function editSettings(value: WhatsAppChannelSettings) {
	settings.value = value;
	settingsTouched.value = true;
}

watch(
	() => props.savedSettings,
	(saved) => {
		if (!settingsTouched.value) settings.value = resolveWhatsAppSettings(saved);
	},
);

/**
 * Built on the saved settings, because connecting replaces the settings object
 * wholesale. Only the values the user changed are written, so a setting that
 * was never set keeps following the defaults at runtime.
 */
const currentSettings = computed<AgentWhatsAppIntegrationSettings | undefined>(() => {
	if (props.mode !== 'edit') return props.savedSettings;
	const inEffect = resolveWhatsAppSettings(props.savedSettings);
	const { typingIndicator, downloadMedia, mediaRetentionDays } = settings.value;
	return {
		...props.savedSettings,
		...(typingIndicator !== inEffect.typingIndicator && { typingIndicator }),
		...(downloadMedia !== inEffect.downloadMedia && { downloadMedia }),
		...(mediaRetentionDays !== inEffect.mediaRetentionDays && { mediaRetentionDays }),
	};
});

// Connecting closes the modal, so the toast is the only place left for the next step.
async function afterSave() {
	if (props.mode !== 'setup') return;
	toast.showMessage({
		type: 'success',
		title: i18n.baseText('agents.channels.whatsapp.setup.connect.connected'),
	});
}

defineExpose({ credentialId, currentSettings, validationError: null, afterSave });
</script>

<template>
	<div :class="$style.whatsAppSetup">
		<N8nStepper v-if="mode === 'setup'" :steps="steps">
			<template #default="{ step }">
				<div :class="$style.stepContent">
					<div v-if="step.id === 'create-app'" :class="$style.stepStack">
						<N8nText :class="$style.hint" size="small">
							{{ i18n.baseText('agents.channels.whatsapp.setup.createApp.hint') }}
						</N8nText>
						<N8nButton
							:href="META_APP_DASHBOARD_URL"
							target="_blank"
							variant="outline"
							size="medium"
							icon="meta"
							data-testid="whatsapp-meta-dashboard-link"
						>
							{{ i18n.baseText('agents.channels.whatsapp.setup.createApp.button') }}
						</N8nButton>
					</div>

					<div v-else-if="step.id === 'credential'" :class="$style.stepStack">
						<N8nText :class="$style.hint" size="small">
							{{ i18n.baseText('agents.channels.whatsapp.setup.credential.hint') }}
						</N8nText>
						<div :class="$style.credentialGroup">
							<AgentIntegrationCredentialConnection
								v-if="!connected"
								compact-label
								v-model="credentialId"
								:integration-type="integration.type"
								:integration-label="integration.label"
								:credentials="credentials"
								:credential-permissions="credentialPermissions"
								:credentials-loading="credentialsLoading"
								:disabled="loading"
								:loading="loading"
								:error-message="showConnectError ? '' : errorMessage"
								:error-is-conflict="errorIsConflict"
								:force-new-credential="forceNewCredential"
								@create="emit('create')"
								@edit="emit('edit')"
							/>
							<template v-if="!connected && credentialId">
								<N8nText
									v-if="checking"
									:class="$style.hint"
									size="small"
									data-testid="whatsapp-credential-checking"
								>
									{{ i18n.baseText('agents.channels.whatsapp.setup.credential.checking') }}
								</N8nText>
								<template v-else-if="credentialProblem">
									<N8nText
										size="small"
										:class="$style.error"
										data-testid="whatsapp-credential-problem"
									>
										{{
											i18n.baseText(
												`agents.channels.whatsapp.setup.credential.failed.${credentialProblem}`,
											)
										}}
									</N8nText>
									<N8nButton
										variant="ghost"
										size="small"
										data-testid="whatsapp-credential-recheck"
										@click="runCredentialCheck"
									>
										{{ i18n.baseText('agents.channels.whatsapp.setup.credential.recheck') }}
									</N8nButton>
								</template>
								<N8nText
									v-else-if="credentialVerified"
									size="small"
									color="success"
									:class="$style.verified"
									data-testid="whatsapp-credential-verified"
								>
									<N8nIcon icon="check" size="small" />
									{{ i18n.baseText('agents.channels.whatsapp.setup.credential.verified') }}
								</N8nText>
							</template>
						</div>
					</div>

					<div v-else-if="step.id === 'webhook'" :class="$style.stepStack">
						<div :class="$style.field">
							<label for="whatsapp-webhook-url">
								<N8nText size="small" bold>
									{{ i18n.baseText('agents.builder.addTrigger.whatsapp.webhookUrl.label') }}
								</N8nText>
							</label>
							<N8nCopyInput
								id="whatsapp-webhook-url"
								:value="webhookUrl"
								:label="i18n.baseText('agents.builder.addTrigger.whatsapp.webhookUrl.label')"
								size="large"
								:class="$style.urlInput"
								:copy-label="i18n.baseText('agents.builder.addTrigger.copy')"
								:copied-label="i18n.baseText('agents.builder.addTrigger.copied')"
								data-testid="whatsapp-webhook-url"
							/>
							<N8nText
								v-if="webhookNotHttps"
								size="small"
								:class="$style.error"
								data-testid="whatsapp-webhook-not-https"
							>
								{{ i18n.baseText('agents.channels.whatsapp.setup.webhook.httpsRequired') }}
							</N8nText>
						</div>
						<div :class="$style.field">
							<label for="whatsapp-verify-token">
								<N8nText size="small" bold>
									{{ i18n.baseText('agents.builder.addTrigger.whatsapp.verifyToken.label') }}
								</N8nText>
							</label>
							<N8nCopyInput
								id="whatsapp-verify-token"
								:value="verifyToken"
								:label="i18n.baseText('agents.builder.addTrigger.whatsapp.verifyToken.label')"
								size="large"
								:class="$style.urlInput"
								:copy-label="i18n.baseText('agents.builder.addTrigger.copy')"
								:copied-label="i18n.baseText('agents.builder.addTrigger.copied')"
								data-testid="whatsapp-verify-token"
							/>
						</div>
					</div>

					<div v-else-if="step.id === 'verify'" :class="$style.stepStack">
						<N8nText
							v-if="webhookVerified"
							size="small"
							color="success"
							:class="$style.verified"
							data-testid="whatsapp-webhook-verified"
						>
							<N8nIcon icon="check" size="small" />
							{{ i18n.baseText('agents.channels.whatsapp.setup.verify.verified') }}
						</N8nText>
						<N8nText
							v-else-if="credentialId"
							size="small"
							:class="[$style.hint, $style.verified]"
							data-testid="whatsapp-webhook-waiting"
						>
							<N8nIcon icon="loader-circle" size="small" spin />
							{{ i18n.baseText('agents.channels.whatsapp.setup.verify.waiting') }}
						</N8nText>
					</div>

					<div v-else-if="step.id === 'connect'" :class="$style.stepStack">
						<AgentChannelWhatsAppIdentityCard
							:profile="profile"
							:personalisation="personalisation"
							:ready="ready"
							:loading="loading"
							show-connect
							@connect="emit('connect')"
						/>
						<!-- Connect errors otherwise land in step 2, far from this button. -->
						<N8nText
							v-if="showConnectError"
							size="small"
							:class="$style.error"
							data-testid="whatsapp-connect-error"
						>
							{{ errorMessage }}
						</N8nText>
					</div>
				</div>
			</template>
		</N8nStepper>

		<div v-else :class="$style.formContent">
			<div :class="$style.field">
				<N8nText step="sm" bold>
					{{ i18n.baseText('agents.channels.whatsapp.settings.label') }}
				</N8nText>
				<AgentChannelWhatsAppSettings :model-value="settings" @update:model-value="editSettings" />
			</div>

			<div :class="$style.field" data-testid="whatsapp-identity-field">
				<N8nText step="sm" bold>
					{{ i18n.baseText('agents.channels.whatsapp.settings.identityLabel') }}
				</N8nText>
				<AgentChannelWhatsAppIdentityCard
					:profile="profile"
					:personalisation="personalisation"
					:ready="credentialVerified"
					show-manager-link
				/>
				<N8nText
					v-if="credentialProblem"
					size="small"
					:class="$style.error"
					data-testid="whatsapp-credential-problem"
				>
					{{
						i18n.baseText(`agents.channels.whatsapp.setup.credential.failed.${credentialProblem}`)
					}}
				</N8nText>
			</div>

			<N8nLink
				:href="META_APP_DASHBOARD_URL"
				target="_blank"
				rel="noopener noreferrer"
				size="small"
				data-testid="whatsapp-find-meta-app"
			>
				<span :class="$style.linkContent">
					{{ i18n.baseText('agents.channels.whatsapp.settings.findMetaApp') }}
					<N8nIcon icon="arrow-up-right" size="xsmall" />
				</span>
			</N8nLink>
		</div>
	</div>
</template>

<style module lang="scss">
.whatsAppSetup,
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
	gap: var(--spacing--2xs);
	width: 100%;
}

/* The picker and its check result read as one control, so they sit closer than steps do. */
.credentialGroup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	width: 100%;
}

.hint {
	color: var(--text-color--subtler);
}

.error {
	color: var(--color--danger);
}

.linkContent {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--4xs);
}

.verified {
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
