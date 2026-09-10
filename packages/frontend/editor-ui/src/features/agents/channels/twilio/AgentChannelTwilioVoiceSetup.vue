<script setup lang="ts">
import type {
	AgentIntegrationSettings,
	AgentTwilioVoiceIntegrationSettings,
	ChatIntegrationDescriptor,
} from '@n8n/api-types';
import {
	N8nButton,
	N8nCopyInput,
	N8nInput,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { PermissionsRecord } from '@n8n/permissions';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, watch } from 'vue';

import AgentIntegrationCredentialConnection from '../../components/AgentIntegrationCredentialConnection.vue';
import type { AgentCredentialOption } from '../../components/AgentCredentialSelect.vue';

const E164_PHONE_NUMBER = /^\+[1-9]\d{1,14}$/;
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
		savedSettings?: AgentIntegrationSettings;
		forceNewCredential?: boolean;
		projectId: string;
		agentId: string;
	}>(),
	{
		credentialsLoading: false,
		loading: false,
		connected: false,
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
const configurationMode = ref<AgentTwilioVoiceIntegrationSettings['configurationMode']>('manual');
const phoneNumber = ref('');
const allowedCallersText = ref('');

const webhookUrl = computed(() => {
	const base = rootStore.urlBaseWebhook.replace(/\/$/, '');
	return `${base}/rest/projects/${props.projectId}/agents/v2/${props.agentId}/webhooks/twilioVoice`;
});

function twilioSettings(
	settings: AgentIntegrationSettings,
): AgentTwilioVoiceIntegrationSettings | undefined {
	if (
		!settings ||
		typeof settings !== 'object' ||
		!('phoneNumber' in settings) ||
		!('allowedCallers' in settings) ||
		typeof settings.phoneNumber !== 'string' ||
		!Array.isArray(settings.allowedCallers)
	) {
		return undefined;
	}
	return settings;
}

watch(
	() => props.savedSettings,
	(settings) => {
		const saved = twilioSettings(settings);
		if (!saved) return;
		configurationMode.value = saved.configurationMode;
		phoneNumber.value = saved.phoneNumber;
		allowedCallersText.value = saved.allowedCallers.join(', ');
	},
	{ immediate: true },
);

const allowedCallers = computed(() => [
	...new Set(
		allowedCallersText.value
			.split(/[\s,]+/)
			.map((value) => value.trim())
			.filter(Boolean),
	),
]);

const validationError = computed<string | null>(() => {
	if (!E164_PHONE_NUMBER.test(phoneNumber.value.trim())) {
		return i18n.baseText('agents.channels.twilioVoice.validation.phoneNumber');
	}
	if (allowedCallers.value.length === 0) {
		return i18n.baseText('agents.channels.twilioVoice.validation.allowedCallersRequired');
	}
	if (allowedCallers.value.some((value) => !E164_PHONE_NUMBER.test(value))) {
		return i18n.baseText('agents.channels.twilioVoice.validation.allowedCallersInvalid');
	}
	return null;
});

const currentSettings = computed<AgentTwilioVoiceIntegrationSettings>(() => ({
	configurationMode: configurationMode.value,
	phoneNumber: phoneNumber.value.trim(),
	allowedCallers: allowedCallers.value,
}));

defineExpose({ credentialId, currentSettings, validationError });
</script>

<template>
	<div :class="$style.setup">
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

		<div :class="$style.field">
			<label for="twilio-voice-configuration-mode">
				<N8nText size="small" bold>
					{{ i18n.baseText('agents.channels.twilioVoice.configurationMode.label') }}
				</N8nText>
			</label>
			<N8nSelect
				id="twilio-voice-configuration-mode"
				v-model="configurationMode"
				:disabled="loading"
				data-testid="twilio-voice-configuration-mode"
			>
				<N8nOption
					value="manual"
					:label="i18n.baseText('agents.channels.twilioVoice.configurationMode.manual')"
				/>
				<N8nOption
					value="automatic"
					:label="i18n.baseText('agents.channels.twilioVoice.configurationMode.automatic')"
				/>
			</N8nSelect>
		</div>

		<div v-if="configurationMode === 'manual'" :class="$style.field">
			<label for="twilio-voice-webhook-url">
				<N8nText size="small" bold>
					{{ i18n.baseText('agents.channels.twilioVoice.webhookUrl.label') }}
				</N8nText>
			</label>
			<N8nCopyInput
				id="twilio-voice-webhook-url"
				:value="webhookUrl"
				:copy-label="i18n.baseText('agents.builder.addTrigger.copy')"
				:copied-label="i18n.baseText('agents.builder.addTrigger.copied')"
				data-testid="twilio-voice-webhook-url"
			/>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('agents.channels.twilioVoice.webhookUrl.hint') }}
			</N8nText>
		</div>

		<div :class="$style.field">
			<label for="twilio-voice-phone-number">
				<N8nText size="small" bold>
					{{ i18n.baseText('agents.channels.twilioVoice.phoneNumber.label') }}
				</N8nText>
			</label>
			<N8nInput
				id="twilio-voice-phone-number"
				v-model="phoneNumber"
				:disabled="loading"
				:placeholder="i18n.baseText('agents.channels.twilioVoice.phoneNumber.placeholder')"
				data-testid="twilio-voice-phone-number"
			/>
			<N8nText size="small" color="text-light">
				{{
					i18n.baseText(
						configurationMode === 'manual'
							? 'agents.channels.twilioVoice.phoneNumber.manualHint'
							: 'agents.channels.twilioVoice.phoneNumber.automaticHint',
					)
				}}
			</N8nText>
		</div>

		<div :class="$style.field">
			<label for="twilio-voice-allowed-callers">
				<N8nText size="small" bold>
					{{ i18n.baseText('agents.channels.twilioVoice.allowedCallers.label') }}
				</N8nText>
			</label>
			<N8nInput
				id="twilio-voice-allowed-callers"
				v-model="allowedCallersText"
				type="textarea"
				:disabled="loading"
				:placeholder="i18n.baseText('agents.channels.twilioVoice.allowedCallers.placeholder')"
				data-testid="twilio-voice-allowed-callers"
			/>
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('agents.channels.twilioVoice.allowedCallers.hint') }}
			</N8nText>
		</div>

		<N8nText v-if="validationError" :class="$style.error" size="small">
			{{ validationError }}
		</N8nText>

		<N8nButton
			v-if="mode === 'setup' && !connected"
			variant="subtle"
			size="medium"
			:loading="loading"
			:disabled="!credentialId || !!validationError"
			data-testid="twilio-voice-connect-button"
			@click="emit('connect')"
		>
			{{ i18n.baseText('generic.connect') }}
		</N8nButton>
	</div>
</template>

<style module lang="scss">
.setup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.error {
	color: var(--color--danger);
}
</style>
