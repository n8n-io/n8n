<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import N8nStepper from '@n8n/design-system/components/N8nStepper/Stepper.vue';
import type { ChatIntegrationDescriptor, AgentIntegrationSettings } from '@n8n/api-types';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { PermissionsRecord } from '@n8n/permissions';
import { TIME } from '@/app/constants';
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
		errorMessage?: string;
		errorIsConflict?: boolean;
		savedSettings?: AgentIntegrationSettings;
		agentName: string;
		projectId: string;
		agentId: string;
	}>(),
	{
		credentialsLoading: false,
		loading: false,
		connected: false,
		connectedDescription: '',
		errorMessage: '',
		errorIsConflict: false,
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
const copied = shallowRef(false);
const settingsFormRef = ref<InstanceType<typeof AgentIntegrationSettingsForm>>();

const steps = computed(() => [
	{
		id: 'webhook',
		title: i18n.baseText('agents.channels.linear.setup.webhook.title'),
		description: i18n.baseText('agents.builder.addTrigger.helpText.linear'),
	},
	{
		id: 'credential',
		title: i18n.baseText('agents.channels.linear.setup.credential.title'),
		description: i18n.baseText('agents.builder.addTrigger.helpText.linear'),
	},
	{
		id: 'connect',
		title: i18n.baseText('agents.channels.linear.setup.connect.title'),
		description: i18n.baseText('agents.builder.addTrigger.helpText.linear'),
	},
]);

const canConnect = computed(
	() => credentialId.value.length > 0 && !props.loading && !validationError.value,
);

const webhookUrl = computed(() => {
	const base = rootStore.urlBaseWebhook.replace(/\/$/, '');
	return `${base}/rest/projects/${props.projectId}/agents/v2/${props.agentId}/webhooks/linear`;
});

const currentSettings = computed(() => settingsFormRef.value?.currentSettings);
const validationError = computed(() => settingsFormRef.value?.validationError ?? null);

async function copyWebhookUrl() {
	await navigator.clipboard.writeText(webhookUrl.value);
	copied.value = true;
	setTimeout(() => {
		copied.value = false;
	}, 2 * TIME.SECOND);
}

defineExpose({ credentialId, currentSettings, validationError });
</script>

<template>
	<div :class="$style.linearSetup">
		<N8nStepper v-if="mode === 'setup'" :steps="steps">
			<template #default="{ step }">
				<div :class="$style.stepContent">
					<div v-if="step.id === 'webhook'" :class="$style.webhookRow">
						<input
							:value="webhookUrl"
							readonly
							:class="$style.webhookInput"
							data-testid="linear-webhook-url"
							@focus="($event.target as HTMLInputElement).select()"
						/>
						<N8nButton
							variant="outline"
							size="small"
							data-testid="linear-copy-webhook-url"
							@click="copyWebhookUrl"
						>
							<template #prefix>
								<N8nIcon :icon="copied ? 'check' : 'copy'" size="xsmall" />
							</template>
							{{
								copied
									? i18n.baseText('agents.builder.addTrigger.copied')
									: i18n.baseText('agents.builder.addTrigger.copy')
							}}
						</N8nButton>
					</div>
					<AgentIntegrationCredentialConnection
						v-else-if="step.id === 'credential' && !connected"
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
					<N8nButton
						v-else-if="step.id === 'connect'"
						variant="subtle"
						size="medium"
						:loading="loading"
						:disabled="!canConnect"
						data-testid="linear-connect-button"
						@click="emit('connect')"
					>
						{{ i18n.baseText('agents.builder.addTrigger.connect') }}
					</N8nButton>
				</div>
			</template>
		</N8nStepper>

		<div v-else :class="$style.formContent">
			<div :class="$style.webhookRow">
				<input
					:value="webhookUrl"
					readonly
					:class="$style.webhookInput"
					data-testid="linear-webhook-url"
					@focus="($event.target as HTMLInputElement).select()"
				/>
				<N8nButton
					variant="outline"
					size="small"
					data-testid="linear-copy-webhook-url"
					@click="copyWebhookUrl"
				>
					<template #prefix>
						<N8nIcon :icon="copied ? 'check' : 'copy'" size="xsmall" />
					</template>
					{{
						copied
							? i18n.baseText('agents.builder.addTrigger.copied')
							: i18n.baseText('agents.builder.addTrigger.copy')
					}}
				</N8nButton>
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
				@create="emit('create')"
				@edit="emit('edit')"
			/>
			<N8nText v-else-if="connectedDescription" size="small">{{ connectedDescription }}</N8nText>
		</div>

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
.linearSetup,
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

.webhookRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.webhookInput {
	flex: 1;
	min-width: 0;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	background-color: var(--color--foreground--tint-2);
	border: var(--border);
	border-radius: var(--radius);
	font-family: monospace;
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	text-overflow: ellipsis;
	white-space: nowrap;
	overflow: hidden;
}

.webhookInput:focus {
	outline: none;
	border-color: var(--color--primary);
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
