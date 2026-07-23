<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nButton, N8nText } from '@n8n/design-system';
import N8nStepper from '@n8n/design-system/components/N8nStepper/Stepper.vue';
import type { ChatIntegrationDescriptor, AgentIntegrationSettings } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import type { PermissionsRecord } from '@n8n/permissions';
import AgentIntegrationCredentialConnection from './AgentIntegrationCredentialConnection.vue';
import AgentIntegrationSettingsForm from './AgentIntegrationSettingsForm.vue';
import type { AgentCredentialOption } from './AgentCredentialSelect.vue';

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
const settingsFormRef = ref<InstanceType<typeof AgentIntegrationSettingsForm>>();
void props;

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
					<AgentIntegrationSettingsForm
						v-else-if="step.id === 'access'"
						ref="settingsFormRef"
						:type="integration.type"
						:disabled="connected || loading"
						:connected="connected"
						:saved-settings="savedSettings"
						:agent-name="agentName"
						:project-id="projectId"
						:agent-id="agentId"
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
							v-if="!isPublished"
							:class="$style.publishNotice"
							size="small"
							data-testid="telegram-publish-notice"
						>
							{{ i18n.baseText('agents.channels.setup.publishNotice') }}
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
			<AgentIntegrationSettingsForm
				ref="settingsFormRef"
				:type="integration.type"
				:disabled="connected || loading"
				:connected="connected"
				:saved-settings="savedSettings"
				:agent-name="agentName"
				:project-id="projectId"
				:agent-id="agentId"
			/>
		</div>

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

.publishNotice {
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
