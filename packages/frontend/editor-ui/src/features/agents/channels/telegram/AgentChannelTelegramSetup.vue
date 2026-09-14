<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nButton, N8nStepper, N8nText } from '@n8n/design-system';
import type {
	AgentIntegrationSettings,
	AgentTelegramIntegrationSettings,
	ChatIntegrationDescriptor,
} from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import type { PermissionsRecord } from '@n8n/permissions';
import { resolveSavedTelegramSettings } from '../../utils/telegramAccessSettings';
import AgentIntegrationCredentialConnection from '../../components/AgentIntegrationCredentialConnection.vue';
import AgentTelegramAccessSettingsForm from '../../components/AgentTelegramAccessSettingsForm.vue';
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
const settingsFormRef = ref<InstanceType<typeof AgentTelegramAccessSettingsForm>>();

const steps = computed(() => [
	{
		id: 'credential',
		title: i18n.baseText('agents.channels.telegram.setup.credential.title'),
		description: i18n.baseText('agents.builder.addTrigger.helpText.telegram'),
	},
	{
		id: 'access',
		title: i18n.baseText('agents.channels.telegram.setup.access.title'),
		description: i18n.baseText('agents.builder.addTrigger.helpText.telegram'),
	},
	{
		id: 'connect',
		title: i18n.baseText('agents.channels.telegram.setup.connect.title'),
		description: i18n.baseText('agents.builder.addTrigger.helpText.telegram'),
	},
]);

const canConnect = computed(
	() => credentialId.value.length > 0 && !props.loading && !validationError.value,
);

const currentSettings = computed(() => settingsFormRef.value?.currentSettings);
const validationError = computed(() => settingsFormRef.value?.validationError ?? null);
const telegramSavedSettings = computed<AgentTelegramIntegrationSettings | undefined>(() =>
	resolveSavedTelegramSettings(props.savedSettings, props.connected),
);

defineExpose({ credentialId, currentSettings, validationError });
</script>

<template>
	<div :class="$style.telegramSetup">
		<N8nStepper v-if="mode === 'setup'" :steps="steps">
			<template #default="{ step }">
				<div :class="$style.stepContent">
					<div v-if="step.id === 'credential'" :class="$style.formContent">
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
					</div>
					<AgentTelegramAccessSettingsForm
						v-else-if="step.id === 'access'"
						ref="settingsFormRef"
						:disabled="connected || loading"
						:saved-settings="telegramSavedSettings"
					/>
					<div v-else-if="step.id === 'connect'" :class="$style.connectStep">
						<N8nButton
							variant="subtle"
							size="medium"
							:loading="loading"
							:disabled="!canConnect"
							data-testid="telegram-connect-button"
							@click="emit('connect')"
						>
							{{ i18n.baseText('agents.builder.addTrigger.connect') }}
						</N8nButton>
						<N8nText
							v-if="errorMessage"
							:class="$style.errorText"
							size="small"
							data-testid="telegram-connect-error"
						>
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
		</N8nStepper>

		<div v-else :class="$style.formContent">
			<AgentIntegrationCredentialConnection
				v-if="!connected"
				v-model="credentialId"
				:integration-type="integration.type"
				:integration-label="integration.label"
				:credentials="credentials"
				:credential-permissions="credentialPermissions"
				:credentials-loading="credentialsLoading"
				:disabled="loading"
				@create="emit('create')"
				@edit="emit('edit')"
			/>
			<N8nText v-else-if="connectedDescription" size="small">{{ connectedDescription }}</N8nText>
			<AgentTelegramAccessSettingsForm
				ref="settingsFormRef"
				:disabled="loading"
				:saved-settings="telegramSavedSettings"
			/>
		</div>

		<N8nText v-if="mode === 'edit' && errorMessage" :class="$style.errorText" size="small">
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
.telegramSetup,
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

.connectStep {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--sm);
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
