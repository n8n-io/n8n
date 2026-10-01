<script setup lang="ts">
import { computed, onMounted, shallowRef, watch } from 'vue';
import { N8nIconButton, N8nInput, N8nStepper, N8nText } from '@n8n/design-system';
import type { ChatIntegrationDescriptor, AgentIntegrationSettings } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { PermissionsRecord } from '@n8n/permissions';
import { TIME } from '@/app/constants';
import { getWhatsAppVerifyToken } from '../../composables/useAgentApi';
import AgentIntegrationCredentialConnection from '../../components/AgentIntegrationCredentialConnection.vue';
import type { AgentCredentialOption } from '../../components/AgentCredentialSelect.vue';

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
		connectedDescription?: string;
		isPublished?: boolean;
		errorMessage?: string;
		errorIsConflict?: boolean;
		savedSettings?: AgentIntegrationSettings;
		agentName: string;
		projectId: string;
		agentId: string;
		forceNewCredential?: boolean;
	}>(),
	{
		credentialsLoading: false,
		loading: false,
		connected: false,
		connectedDescription: '',
		isPublished: true,
		errorMessage: '',
		errorIsConflict: false,
		savedSettings: undefined,
		forceNewCredential: false,
	},
);

const emit = defineEmits<{
	create: [];
	edit: [];
	connect: [];
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const copied = shallowRef(false);
const verifyTokenCopied = shallowRef(false);
const verifyToken = shallowRef('');

// Only two steps: unlike Telegram/Discord, WhatsApp has no separate "connect"
// step — connecting happens by picking a credential, which is step two here.
const steps = computed(() => [
	{
		id: 'webhook',
		title: i18n.baseText('agents.channels.whatsapp.setup.webhook.title'),
		description: i18n.baseText('agents.channels.whatsapp.setup.webhook.description'),
	},
	{
		id: 'credential',
		title: i18n.baseText('agents.channels.whatsapp.setup.credential.title'),
		description: i18n.baseText('agents.channels.whatsapp.setup.credential.description'),
	},
]);

const webhookUrl = computed(() => {
	const base = rootStore.urlBaseWebhook.replace(/\/$/, '');
	return `${base}/rest/projects/${props.projectId}/agents/v2/${props.agentId}/webhooks/whatsapp`;
});

async function copyWebhookUrl() {
	await navigator.clipboard.writeText(webhookUrl.value);
	copied.value = true;
	setTimeout(() => {
		copied.value = false;
	}, 2 * TIME.SECOND);
}

function copyLabel(): string {
	return i18n.baseText(
		copied.value ? 'agents.builder.addTrigger.copied' : 'agents.builder.addTrigger.copy',
	);
}

function selectUrlInput(event: FocusEvent) {
	if (event.target instanceof HTMLInputElement) {
		event.target.select();
	}
}

async function copyVerifyToken() {
	await navigator.clipboard.writeText(verifyToken.value);
	verifyTokenCopied.value = true;
	setTimeout(() => {
		verifyTokenCopied.value = false;
	}, 2 * TIME.SECOND);
}

function verifyTokenCopyLabel(): string {
	return i18n.baseText(
		verifyTokenCopied.value ? 'agents.builder.addTrigger.copied' : 'agents.builder.addTrigger.copy',
	);
}

// Derived server-side from the agent id alone, so it is available before a
// WhatsApp credential is ever saved (see the `verify-token` endpoint).
onMounted(async () => {
	try {
		const response = await getWhatsAppVerifyToken(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
		);
		verifyToken.value = response.verifyToken;
	} catch {
		// Leave the field blank; the rest of the setup screen still works.
	}
});

// WhatsApp has no separate "connect" step (see module doc on `steps` above):
// picking a credential during setup is the whole action, so it has to fire
// `connect` itself here — the parent modal's save button only exists in edit
// mode (see `showFooterActions` in AgentChannelModal.vue).
watch(credentialId, (value) => {
	if (props.mode === 'setup' && value) emit('connect');
});

const currentSettings = computed(() => undefined);
const validationError = computed(() => null);

defineExpose({ credentialId, currentSettings, validationError });
</script>

<template>
	<div :class="$style.whatsAppSetup">
		<N8nStepper v-if="mode === 'setup'" :steps="steps">
			<template #default="{ step }">
				<div :class="$style.stepContent">
					<template v-if="step.id === 'webhook'">
						<div :class="$style.urlField">
							<label for="whatsapp-webhook-url">
								<N8nText size="small" bold>
									{{ i18n.baseText('agents.builder.addTrigger.whatsapp.webhookUrl.label') }}
								</N8nText>
							</label>
							<N8nInput
								id="whatsapp-webhook-url"
								:model-value="webhookUrl"
								size="small"
								readonly
								:class="$style.urlInput"
								data-testid="whatsapp-webhook-url"
								@focus="selectUrlInput"
							>
								<template #suffix>
									<N8nIconButton
										:icon="copied ? 'check' : 'copy'"
										variant="ghost"
										size="small"
										:title="copyLabel()"
										:aria-label="copyLabel()"
										data-testid="whatsapp-copy-webhook-url"
										@click.stop="copyWebhookUrl"
									/>
								</template>
							</N8nInput>
							<N8nText :class="$style.hint" size="small">
								{{ i18n.baseText('agents.channels.whatsapp.setup.webhookHint') }}
							</N8nText>
						</div>

						<div :class="$style.urlField">
							<label for="whatsapp-verify-token">
								<N8nText size="small" bold>
									{{ i18n.baseText('agents.builder.addTrigger.whatsapp.verifyToken.label') }}
								</N8nText>
							</label>
							<N8nInput
								id="whatsapp-verify-token"
								:model-value="verifyToken"
								size="small"
								readonly
								:class="$style.urlInput"
								data-testid="whatsapp-verify-token"
								@focus="selectUrlInput"
							>
								<template #suffix>
									<N8nIconButton
										:icon="verifyTokenCopied ? 'check' : 'copy'"
										variant="ghost"
										size="small"
										:title="verifyTokenCopyLabel()"
										:aria-label="verifyTokenCopyLabel()"
										data-testid="whatsapp-copy-verify-token"
										@click.stop="copyVerifyToken"
									/>
								</template>
							</N8nInput>
							<N8nText :class="$style.hint" size="small">
								{{ i18n.baseText('agents.channels.whatsapp.setup.verifyTokenHint') }}
							</N8nText>
						</div>
					</template>

					<template v-else-if="step.id === 'credential'">
						<AgentIntegrationCredentialConnection
							v-if="!connected"
							v-model="credentialId"
							:integration-type="integration.type"
							:integration-label="integration.label"
							:credentials="credentials"
							:credential-permissions="credentialPermissions"
							:credentials-loading="credentialsLoading"
							:disabled="loading"
							:force-new-credential="forceNewCredential"
							@create="emit('create')"
							@edit="emit('edit')"
						/>
						<N8nText v-else-if="connectedDescription" size="small">{{
							connectedDescription
						}}</N8nText>

						<N8nText
							v-if="connected && !isPublished"
							:class="$style.hint"
							size="small"
							data-testid="whatsapp-publish-notice"
						>
							{{ i18n.baseText('agents.channels.setup.publishNotice') }}
						</N8nText>

						<N8nText v-if="errorMessage" :class="$style.errorText" size="small">
							{{ errorMessage }}
							<a
								v-if="credentialId && !errorIsConflict"
								:class="$style.link"
								href="#"
								@click.prevent="emit('edit')"
							>
								{{ i18n.baseText('agents.builder.addTrigger.editCredential') }}
							</a>
						</N8nText>
					</template>
				</div>
			</template>
		</N8nStepper>

		<div v-else :class="$style.formContent">
			<div :class="$style.urlField">
				<label for="whatsapp-webhook-url">
					<N8nText size="small" bold>
						{{ i18n.baseText('agents.builder.addTrigger.whatsapp.webhookUrl.label') }}
					</N8nText>
				</label>
				<N8nInput
					id="whatsapp-webhook-url"
					:model-value="webhookUrl"
					size="small"
					readonly
					:class="$style.urlInput"
					data-testid="whatsapp-webhook-url"
					@focus="selectUrlInput"
				>
					<template #suffix>
						<N8nIconButton
							:icon="copied ? 'check' : 'copy'"
							variant="ghost"
							size="small"
							:title="copyLabel()"
							:aria-label="copyLabel()"
							data-testid="whatsapp-copy-webhook-url"
							@click.stop="copyWebhookUrl"
						/>
					</template>
				</N8nInput>
				<N8nText :class="$style.hint" size="small">
					{{ i18n.baseText('agents.channels.whatsapp.setup.webhookHint') }}
				</N8nText>
			</div>

			<div :class="$style.urlField">
				<label for="whatsapp-verify-token">
					<N8nText size="small" bold>
						{{ i18n.baseText('agents.builder.addTrigger.whatsapp.verifyToken.label') }}
					</N8nText>
				</label>
				<N8nInput
					id="whatsapp-verify-token"
					:model-value="verifyToken"
					size="small"
					readonly
					:class="$style.urlInput"
					data-testid="whatsapp-verify-token"
					@focus="selectUrlInput"
				>
					<template #suffix>
						<N8nIconButton
							:icon="verifyTokenCopied ? 'check' : 'copy'"
							variant="ghost"
							size="small"
							:title="verifyTokenCopyLabel()"
							:aria-label="verifyTokenCopyLabel()"
							data-testid="whatsapp-copy-verify-token"
							@click.stop="copyVerifyToken"
						/>
					</template>
				</N8nInput>
				<N8nText :class="$style.hint" size="small">
					{{ i18n.baseText('agents.channels.whatsapp.setup.verifyTokenHint') }}
				</N8nText>
			</div>

			<AgentIntegrationCredentialConnection
				v-if="!connected"
				v-model="credentialId"
				:integration-type="integration.type"
				:integration-label="integration.label"
				:credentials="credentials"
				:credential-permissions="credentialPermissions"
				:credentials-loading="credentialsLoading"
				:disabled="loading"
				:force-new-credential="forceNewCredential"
				@create="emit('create')"
				@edit="emit('edit')"
			/>
			<N8nText v-else-if="connectedDescription" size="small">{{ connectedDescription }}</N8nText>

			<N8nText
				v-if="connected && !isPublished"
				:class="$style.hint"
				size="small"
				data-testid="whatsapp-publish-notice"
			>
				{{ i18n.baseText('agents.channels.setup.publishNotice') }}
			</N8nText>

			<N8nText v-if="errorMessage" :class="$style.errorText" size="small">
				{{ errorMessage }}
				<a
					v-if="credentialId && !errorIsConflict"
					:class="$style.link"
					href="#"
					@click.prevent="emit('edit')"
				>
					{{ i18n.baseText('agents.builder.addTrigger.editCredential') }}
				</a>
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

.stepContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding-top: var(--spacing--xs);
}

.urlField {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
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

.hint {
	color: var(--text-color--subtler);
}

.errorText {
	color: var(--color--danger);
}

.link {
	color: var(--color--primary);
	text-decoration: underline;
	cursor: pointer;
	margin-left: var(--spacing--4xs);
}
</style>
