<script setup lang="ts">
import { computed, shallowRef } from 'vue';
import { N8nIconButton, N8nInput, N8nText } from '@n8n/design-system';
import type { ChatIntegrationDescriptor, AgentIntegrationSettings } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { PermissionsRecord } from '@n8n/permissions';
import { TIME } from '@/app/constants';
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

// There is no equivalent of Discord's or Linear's "create an app" wizard for
// WhatsApp within n8n: setting up the Meta app happens entirely in Meta's own
// console, guided by the credential field descriptions. So this form is flat
// in both setup and edit mode, matching Discord/Telegram's simplicity rather
// than adding a stepper with nothing n8n-specific to walk through.
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

const currentSettings = computed(() => undefined);
const validationError = computed(() => null);

defineExpose({ credentialId, currentSettings, validationError });
</script>

<template>
	<div :class="$style.whatsAppSetup">
		<N8nText size="small" color="text-light">
			{{ i18n.baseText('agents.builder.addTrigger.whatsapp.setup.description') }}
		</N8nText>

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
</template>

<style module lang="scss">
.whatsAppSetup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
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
