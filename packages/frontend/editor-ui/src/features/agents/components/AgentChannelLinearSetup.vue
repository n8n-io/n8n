<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import { N8nButton, N8nIconButton, N8nInput, N8nText } from '@n8n/design-system';
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
const copiedField = shallowRef<'oauthCallback' | 'webhook' | null>(null);
const settingsFormRef = ref<InstanceType<typeof AgentIntegrationSettingsForm>>();

const LINEAR_APP_SETUP_URL = 'https://linear.app/settings/api/applications/new';

const steps = computed(() => [
	{
		id: 'create-oauth-application',
		title: i18n.baseText('agents.channels.linear.setup.createOAuthApplication.title'),
		description: i18n.baseText('agents.channels.linear.setup.createOAuthApplication.description'),
	},
	{
		id: 'configure-application',
		title: i18n.baseText('agents.channels.linear.setup.configureApplication.title'),
		description: i18n.baseText('agents.channels.linear.setup.configureApplication.description'),
	},
	{
		id: 'create-credential',
		title: i18n.baseText('agents.channels.linear.setup.createCredential.title'),
		description: i18n.baseText('agents.channels.linear.setup.createCredential.description'),
	},
]);

const canConnect = computed(
	() => credentialId.value.length > 0 && !props.loading && !validationError.value,
);

const webhookUrl = computed(() => {
	const base = rootStore.urlBaseWebhook.replace(/\/$/, '');
	return `${base}/rest/projects/${props.projectId}/agents/v2/${props.agentId}/webhooks/linear`;
});

const oauthCallbackUrl = computed(
	() => (rootStore.OAuthCallbackUrls as { oauth2?: string } | undefined)?.oauth2 ?? '',
);

const currentSettings = computed(() => settingsFormRef.value?.currentSettings);
const validationError = computed(() => settingsFormRef.value?.validationError ?? null);

function urlFor(field: 'oauthCallback' | 'webhook'): string {
	return field === 'oauthCallback' ? oauthCallbackUrl.value : webhookUrl.value;
}

async function copyUrl(field: 'oauthCallback' | 'webhook') {
	await navigator.clipboard.writeText(urlFor(field));
	copiedField.value = field;
	setTimeout(() => {
		if (copiedField.value === field) {
			copiedField.value = null;
		}
	}, 2 * TIME.SECOND);
}

function copyLabel(field: 'oauthCallback' | 'webhook'): string {
	return copiedField.value === field
		? i18n.baseText('agents.builder.addTrigger.copied')
		: i18n.baseText('agents.builder.addTrigger.copy');
}

function selectUrlInput(event: FocusEvent) {
	if (event.target instanceof HTMLInputElement) {
		event.target.select();
	}
}

defineExpose({ credentialId, currentSettings, validationError });
</script>

<template>
	<div :class="$style.linearSetup">
		<N8nStepper v-if="mode === 'setup'" :steps="steps">
			<template #default="{ step }">
				<div :class="$style.stepContent">
					<N8nButton
						v-if="step.id === 'create-oauth-application'"
						:href="LINEAR_APP_SETUP_URL"
						target="_blank"
						variant="subtle"
						size="medium"
						icon="linear"
						data-testid="linear-app-setup-link"
					>
						{{ i18n.baseText('agents.channels.linear.setup.createOAuthApplication.button') }}
					</N8nButton>

					<div v-else-if="step.id === 'configure-application'" :class="$style.linearAppSetup">
						<div :class="$style.urlField">
							<label for="linear-oauth-callback-url" :class="$style.urlLabel">
								<N8nText size="small" bold>
									{{ i18n.baseText('agents.builder.addTrigger.linear.oauthCallbackUrl.label') }}
								</N8nText>
							</label>
							<N8nInput
								id="linear-oauth-callback-url"
								:model-value="oauthCallbackUrl"
								size="large"
								readonly
								:class="$style.urlInput"
								data-testid="linear-oauth-callback-url"
								@focus="selectUrlInput"
							>
								<template #suffix>
									<N8nIconButton
										:icon="copiedField === 'oauthCallback' ? 'check' : 'copy'"
										variant="ghost"
										size="small"
										:class="$style.copyButton"
										:title="copyLabel('oauthCallback')"
										:aria-label="copyLabel('oauthCallback')"
										data-testid="linear-copy-oauth-callback-url"
										@click.stop="copyUrl('oauthCallback')"
									/>
								</template>
							</N8nInput>
						</div>

						<div :class="$style.urlField">
							<label for="linear-webhook-url" :class="$style.urlLabel">
								<N8nText size="small" bold>
									{{ i18n.baseText('agents.builder.addTrigger.linear.webhookUrl.label') }}
								</N8nText>
							</label>
							<N8nInput
								id="linear-webhook-url"
								:model-value="webhookUrl"
								size="large"
								readonly
								:class="$style.urlInput"
								data-testid="linear-webhook-url"
								@focus="selectUrlInput"
							>
								<template #suffix>
									<N8nIconButton
										:icon="copiedField === 'webhook' ? 'check' : 'copy'"
										variant="ghost"
										size="small"
										:class="$style.copyButton"
										:title="copyLabel('webhook')"
										:aria-label="copyLabel('webhook')"
										data-testid="linear-copy-webhook-url"
										@click.stop="copyUrl('webhook')"
									/>
								</template>
							</N8nInput>
							<N8nText :class="$style.urlHint" size="small">
								{{ i18n.baseText('agents.channels.linear.setup.configureApplication.webhookHint') }}
							</N8nText>
						</div>
					</div>
					<div v-else-if="step.id === 'create-credential'" :class="$style.credentialStep">
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
							:class="$style.cred"
						/>
						<N8nButton
							variant="subtle"
							size="medium"
							:loading="loading"
							:disabled="!canConnect"
							data-testid="linear-connect-button"
							@click="emit('connect')"
						>
							{{ i18n.baseText('generic.connect') }}
						</N8nButton>
						<N8nText
							v-if="!isPublished"
							:class="$style.publishNotice"
							size="small"
							data-testid="linear-publish-notice"
						>
							{{ i18n.baseText('agents.channels.setup.publishNotice') }}
						</N8nText>
					</div>
				</div>
			</template>
		</N8nStepper>

		<div v-else :class="$style.formContent">
			<div :class="$style.linearAppSetup">
				<N8nText size="small" bold>
					{{ i18n.baseText('agents.builder.addTrigger.linear.setup.title') }}
				</N8nText>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('agents.builder.addTrigger.linear.setup.description') }}
					<a
						:href="LINEAR_APP_SETUP_URL"
						target="_blank"
						rel="noopener noreferrer"
						:class="$style.link"
						data-testid="linear-app-setup-link"
					>
						{{ i18n.baseText('agents.builder.addTrigger.linear.setup.link') }}
					</a>
				</N8nText>

				<div :class="$style.urlField">
					<label for="linear-oauth-callback-url" :class="$style.urlLabel">
						<N8nText size="small" bold>
							{{ i18n.baseText('agents.builder.addTrigger.linear.oauthCallbackUrl.label') }}
						</N8nText>
					</label>
					<N8nInput
						id="linear-oauth-callback-url"
						:model-value="oauthCallbackUrl"
						size="small"
						readonly
						:class="$style.urlInput"
						data-testid="linear-oauth-callback-url"
						@focus="selectUrlInput"
					>
						<template #suffix>
							<N8nIconButton
								:icon="copiedField === 'oauthCallback' ? 'check' : 'copy'"
								variant="ghost"
								size="small"
								:title="copyLabel('oauthCallback')"
								:aria-label="copyLabel('oauthCallback')"
								data-testid="linear-copy-oauth-callback-url"
								@click.stop="copyUrl('oauthCallback')"
							/>
						</template>
					</N8nInput>
				</div>

				<div :class="$style.urlField">
					<label for="linear-webhook-url" :class="$style.urlLabel">
						<N8nText size="small" bold>
							{{ i18n.baseText('agents.builder.addTrigger.linear.webhookUrl.label') }}
						</N8nText>
					</label>
					<N8nInput
						id="linear-webhook-url"
						:model-value="webhookUrl"
						size="small"
						readonly
						:class="$style.urlInput"
						data-testid="linear-webhook-url"
						@focus="selectUrlInput"
					>
						<template #suffix>
							<N8nIconButton
								:icon="copiedField === 'webhook' ? 'check' : 'copy'"
								variant="ghost"
								size="small"
								:title="copyLabel('webhook')"
								:aria-label="copyLabel('webhook')"
								data-testid="linear-copy-webhook-url"
								@click.stop="copyUrl('webhook')"
							/>
						</template>
					</N8nInput>
					<N8nText :class="$style.urlHint" size="small">
						{{ i18n.baseText('agents.channels.linear.setup.configureApplication.webhookHint') }}
					</N8nText>
				</div>
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

.linearAppSetup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.urlField {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.urlLabel {
	display: block;
}

.urlHint,
.publishNotice {
	color: var(--text-color--subtler);
}

.credentialStep {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--sm);
	width: 100%;
}

.cred {
	width: 100%;
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

.errorText {
	color: var(--color--danger);
}

.link {
	color: var(--color--primary);
	text-decoration: underline;
	cursor: pointer;
	margin-left: var(--spacing--4xs);
}
.copyButton {
	margin-right: calc(var(--spacing--3xs) * -1);
}
</style>
