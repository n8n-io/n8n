<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { N8nButton, N8nCopyInput, N8nIcon, N8nStepper, N8nText } from '@n8n/design-system';
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
import { checkWhatsAppCredential, getWhatsAppWebhookStatus } from './api';

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
		isPublished: true,
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

const credentialCheck = ref<WhatsAppCredentialCheck | null>(null);
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
			if (request !== latestCheck) return;
			checking.value = false;
			credentialCheck.value = { status: 'failed', reason: 'unreachable' };
			toast.showError(error, i18n.baseText('agents.channels.modal.saveChannelError'));
			return;
		}
		if (!verifyToken.value) void loadVerifyToken();
		resumeWebhookPolling();
	}

	let result: WhatsAppCredentialCheck;
	try {
		result = await checkWhatsAppCredential(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
			id,
		);
	} catch {
		result = { status: 'failed', reason: 'unreachable' };
	}
	if (request !== latestCheck) return;
	credentialCheck.value = result;
	checking.value = false;
}

watch(credentialId, runCredentialCheck, { immediate: true });

// Saving the picked credential keeps its ID, so the watch above does not see the edit.
listenForCredentialChanges({
	store: useCredentialsStore(),
	onCredentialUpdated: async (credential) => {
		if (credential.id === credentialId.value) await runCredentialCheck();
	},
});

// ---------------------------------------------------------------------------
// Webhook handshake (step 4)
// ---------------------------------------------------------------------------

async function pollWebhookStatus() {
	try {
		const status = await getWhatsAppWebhookStatus(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
		);
		webhookVerified.value = status.verified;
	} catch (error) {
		// A new agent has no row until a credential is picked, so polling now would
		// only repeat the same 404. `resumeWebhookPolling` starts it again.
		if (error instanceof ResponseError && error.httpStatusCode === 404) {
			waitingForAgent = true;
			return;
		}
	}
	if (!webhookVerified.value && !unmounted) {
		pollTimer = setTimeout(() => void pollWebhookStatus(), WEBHOOK_POLL_MS);
	}
}

function resumeWebhookPolling() {
	if (!waitingForAgent || unmounted) return;
	waitingForAgent = false;
	void pollWebhookStatus();
}

onMounted(() => {
	void loadVerifyToken();
	// Only the setup shows this step. A connected channel has its own adapter answer Meta.
	if (props.mode === 'setup') void pollWebhookStatus();
});

onBeforeUnmount(() => {
	unmounted = true;
	clearTimeout(pollTimer);
});

// ---------------------------------------------------------------------------
// Connect (step 5)
// ---------------------------------------------------------------------------

const ready = computed(() => credentialVerified.value && webhookVerified.value && !props.connected);

const connectBlockedHint = computed(() => {
	if (props.connected || ready.value) return '';
	if (!credentialVerified.value && !webhookVerified.value) {
		return i18n.baseText('agents.channels.whatsapp.setup.connect.needsBoth');
	}
	if (!webhookVerified.value) {
		return i18n.baseText('agents.channels.whatsapp.setup.connect.needsWebhook');
	}
	return i18n.baseText('agents.channels.whatsapp.setup.connect.needsCredential');
});

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
		description: i18n.baseText('agents.channels.whatsapp.setup.connect.description'),
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
 * wholesale. The setup leaves the defaults unset, so they apply at runtime.
 */
const currentSettings = computed<AgentWhatsAppIntegrationSettings | undefined>(() =>
	props.mode === 'edit' ? { ...props.savedSettings, ...settings.value } : props.savedSettings,
);

// Connecting closes the modal, so the toast is the only place left for the next step.
async function afterSave() {
	if (props.mode !== 'setup') return;
	toast.showMessage({
		type: 'success',
		title: i18n.baseText('agents.channels.whatsapp.setup.connect.connected'),
		// An unpublished agent does not answer yet, so the try-it hint needs this.
		...(props.isPublished ? {} : { message: i18n.baseText('agents.channels.setup.publishNotice') }),
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
							variant="subtle"
							size="medium"
							data-testid="whatsapp-meta-dashboard-link"
						>
							{{ i18n.baseText('agents.channels.whatsapp.setup.createApp.button') }}
						</N8nButton>
					</div>

					<div v-else-if="step.id === 'credential'" :class="$style.stepStack">
						<N8nText :class="$style.hint" size="small">
							{{ i18n.baseText('agents.channels.whatsapp.setup.credential.hint') }}
						</N8nText>
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
							v-else
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
						<N8nText
							v-if="connectBlockedHint"
							:class="$style.hint"
							size="small"
							data-testid="whatsapp-connect-blocked"
						>
							{{ connectBlockedHint }}
						</N8nText>
						<!-- Connect errors otherwise land in step 2, far from this button. -->
						<N8nText
							v-if="showConnectError"
							size="small"
							:class="$style.error"
							data-testid="whatsapp-connect-error"
						>
							{{ errorMessage }}
						</N8nText>
						<N8nText
							v-if="connected && !isPublished"
							:class="$style.hint"
							size="small"
							data-testid="whatsapp-publish-notice"
						>
							{{ i18n.baseText('agents.channels.setup.publishNotice') }}
						</N8nText>
					</div>
				</div>
			</template>
		</N8nStepper>

		<div v-else :class="$style.formContent">
			<div :class="$style.field" data-testid="whatsapp-identity-field">
				<N8nText size="small" bold>
					{{ i18n.baseText('agents.channels.whatsapp.settings.identityLabel') }}
				</N8nText>
				<AgentChannelWhatsAppIdentityCard
					:profile="profile"
					:personalisation="personalisation"
					:ready="credentialVerified"
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

			<div :class="$style.field">
				<label for="whatsapp-webhook-url">
					<N8nText size="small" bold>
						{{ i18n.baseText('agents.builder.addTrigger.whatsapp.webhookUrl.label') }}
					</N8nText>
				</label>
				<N8nCopyInput
					id="whatsapp-webhook-url"
					:value="webhookUrl"
					size="large"
					:class="$style.urlInput"
					:copy-label="i18n.baseText('agents.builder.addTrigger.copy')"
					:copied-label="i18n.baseText('agents.builder.addTrigger.copied')"
					data-testid="whatsapp-webhook-url"
				/>
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
					size="large"
					:class="$style.urlInput"
					:copy-label="i18n.baseText('agents.builder.addTrigger.copy')"
					:copied-label="i18n.baseText('agents.builder.addTrigger.copied')"
					data-testid="whatsapp-verify-token"
				/>
			</div>

			<div :class="$style.field">
				<N8nText size="small" bold>
					{{ i18n.baseText('agents.channels.whatsapp.settings.label') }}
				</N8nText>
				<AgentChannelWhatsAppSettings :model-value="settings" @update:model-value="editSettings" />
			</div>

			<N8nText
				v-if="connected && !isPublished"
				:class="$style.hint"
				size="small"
				data-testid="whatsapp-publish-notice"
			>
				{{ i18n.baseText('agents.channels.setup.publishNotice') }}
			</N8nText>
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
