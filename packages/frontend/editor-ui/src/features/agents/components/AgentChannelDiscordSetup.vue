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
const copied = shallowRef(false);
const settingsFormRef = ref<InstanceType<typeof AgentIntegrationSettingsForm>>();

const DISCORD_APP_SETUP_URL = 'https://discord.com/developers/applications';

/**
 * Ordered deliberately: Discord verifies the interactions endpoint by sending
 * a signed ping, which n8n can only answer once the credential is connected.
 * Registering the URL is therefore the last step, not part of app setup.
 */
const steps = computed(() => [
	{
		id: 'create-application',
		title: i18n.baseText('agents.channels.discord.setup.createApplication.title'),
		description: i18n.baseText('agents.channels.discord.setup.createApplication.description'),
	},
	{
		id: 'create-bot',
		title: i18n.baseText('agents.channels.discord.setup.createBot.title'),
		description: i18n.baseText('agents.channels.discord.setup.createBot.description'),
	},
	{
		id: 'create-credential',
		title: i18n.baseText('agents.channels.discord.setup.createCredential.title'),
		description: i18n.baseText('agents.channels.discord.setup.createCredential.description'),
	},
	{
		id: 'interactions-endpoint',
		title: i18n.baseText('agents.channels.discord.setup.interactionsEndpoint.title'),
		description: i18n.baseText('agents.channels.discord.setup.interactionsEndpoint.description'),
	},
]);

const canConnect = computed(
	() => credentialId.value.length > 0 && !props.loading && !validationError.value,
);

const interactionsUrl = computed(() => {
	const base = rootStore.urlBaseWebhook.replace(/\/$/, '');
	return `${base}/rest/projects/${props.projectId}/agents/v2/${props.agentId}/webhooks/discord`;
});

const currentSettings = computed(() => settingsFormRef.value?.currentSettings);
const validationError = computed(() => settingsFormRef.value?.validationError ?? null);

async function copyUrl() {
	await navigator.clipboard.writeText(interactionsUrl.value);
	copied.value = true;
	setTimeout(() => {
		copied.value = false;
	}, 2 * TIME.SECOND);
}

const copyLabel = computed(() =>
	copied.value
		? i18n.baseText('agents.builder.addTrigger.copied')
		: i18n.baseText('agents.builder.addTrigger.copy'),
);

function selectUrlInput(event: FocusEvent) {
	if (event.target instanceof HTMLInputElement) {
		event.target.select();
	}
}

defineExpose({ credentialId, currentSettings, validationError });
</script>

<template>
	<div :class="$style.discordSetup">
		<N8nStepper v-if="mode === 'setup'" :steps="steps">
			<template #default="{ step }">
				<div :class="$style.stepContent">
					<N8nButton
						v-if="step.id === 'create-application'"
						:href="DISCORD_APP_SETUP_URL"
						target="_blank"
						variant="subtle"
						size="medium"
						icon="discord"
						data-testid="discord-app-setup-link"
					>
						{{ i18n.baseText('agents.channels.discord.setup.createApplication.button') }}
					</N8nButton>

					<N8nText
						v-else-if="step.id === 'create-bot'"
						size="small"
						:class="$style.hint"
						data-testid="discord-bot-hint"
					>
						{{ i18n.baseText('agents.channels.discord.setup.createBot.hint') }}
					</N8nText>

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
							:class="$style.cred"
							@create="emit('create')"
							@edit="emit('edit')"
						/>
						<N8nButton
							variant="subtle"
							size="medium"
							:loading="loading"
							:disabled="!canConnect"
							data-testid="discord-connect-button"
							@click="emit('connect')"
						>
							{{ i18n.baseText('generic.connect') }}
						</N8nButton>
						<N8nText
							v-if="!isPublished"
							:class="$style.hint"
							size="small"
							data-testid="discord-publish-notice"
						>
							{{ i18n.baseText('agents.channels.setup.publishNotice') }}
						</N8nText>
					</div>

					<div v-else-if="step.id === 'interactions-endpoint'" :class="$style.urlField">
						<label for="discord-interactions-url" :class="$style.urlLabel">
							<N8nText size="small" bold>
								{{ i18n.baseText('agents.builder.addTrigger.discord.interactionsUrl.label') }}
							</N8nText>
						</label>
						<N8nInput
							id="discord-interactions-url"
							:model-value="interactionsUrl"
							size="large"
							readonly
							:class="$style.urlInput"
							data-testid="discord-interactions-url"
							@focus="selectUrlInput"
						>
							<template #suffix>
								<N8nIconButton
									:icon="copied ? 'check' : 'copy'"
									variant="ghost"
									size="small"
									:class="$style.copyButton"
									:title="copyLabel"
									:aria-label="copyLabel"
									data-testid="discord-copy-interactions-url"
									@click.stop="copyUrl"
								/>
							</template>
						</N8nInput>
						<N8nText :class="$style.hint" size="small">
							{{ i18n.baseText('agents.channels.discord.setup.interactionsEndpoint.hint') }}
						</N8nText>
					</div>
				</div>
			</template>
		</N8nStepper>

		<div v-else :class="$style.formContent">
			<div :class="$style.urlField">
				<label for="discord-interactions-url" :class="$style.urlLabel">
					<N8nText size="small" bold>
						{{ i18n.baseText('agents.builder.addTrigger.discord.interactionsUrl.label') }}
					</N8nText>
				</label>
				<N8nInput
					id="discord-interactions-url"
					:model-value="interactionsUrl"
					size="small"
					readonly
					:class="$style.urlInput"
					data-testid="discord-interactions-url"
					@focus="selectUrlInput"
				>
					<template #suffix>
						<N8nIconButton
							:icon="copied ? 'check' : 'copy'"
							variant="ghost"
							size="small"
							:title="copyLabel"
							:aria-label="copyLabel"
							data-testid="discord-copy-interactions-url"
							@click.stop="copyUrl"
						/>
					</template>
				</N8nInput>
				<N8nText :class="$style.hint" size="small">
					{{ i18n.baseText('agents.channels.discord.setup.interactionsEndpoint.hint') }}
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
.discordSetup,
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

.urlLabel {
	display: block;
}

.hint {
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
