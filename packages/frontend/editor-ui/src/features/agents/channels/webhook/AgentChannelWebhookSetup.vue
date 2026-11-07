<script setup lang="ts">
import {
	webhookAuthentication,
	webhookCredentialType,
	type AgentWebhookAuthentication,
} from '@n8n/api-types';
import { N8nButton, N8nCopyInput, N8nStepper, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, ref, watch } from 'vue';

import { getAgentWebhookUrl } from '../../composables/useAgentApi';
import type { AgentChannelViewProps } from '../types';
import AgentChannelWebhookAuth from './AgentChannelWebhookAuth.vue';

const credentialId = defineModel<string>({ default: '' });
const props = defineProps<AgentChannelViewProps>();
const emit = defineEmits<{
	create: [credentialType: string];
	edit: [];
	connect: [];
}>();

const i18n = useI18n();
const rootStore = useRootStore();

const authentication = ref<AgentWebhookAuthentication>(
	webhookAuthentication({ settings: props.savedSettings }) ?? 'none',
);
const authenticationTouched = ref(false);

// Settings can arrive after this mounts, so the default must not stick.
watch(
	() => props.savedSettings,
	(saved) => {
		const savedAuthentication = webhookAuthentication({ settings: saved });
		if (savedAuthentication && !authenticationTouched.value) {
			authentication.value = savedAuthentication;
		}
	},
);
const credentialType = computed(() =>
	webhookCredentialType({ authentication: authentication.value }),
);
const credentialOptions = computed(() =>
	props.credentials.filter((credential) => credential.type === credentialType.value),
);
const credentialRequired = computed(() => credentialType.value !== undefined);

// A credential of another authentication cannot check the caller.
watch(authentication, () => {
	if (!credentialOptions.value.some((credential) => credential.id === credentialId.value)) {
		credentialId.value = '';
	}
});

const endpointUrl = ref('');
async function loadEndpointUrl() {
	try {
		const { url } = await getAgentWebhookUrl(
			rootStore.restApiContext,
			props.projectId,
			props.agentId,
		);
		endpointUrl.value = `${url}/responses`;
	} catch {
		// The view stays usable without the URL. The edit view shows it after a retry.
	}
}
onMounted(loadEndpointUrl);

const steps = computed(() => [
	{
		id: 'authentication',
		title: i18n.baseText('agents.channels.webhook.setup.authentication.title'),
		description: i18n.baseText('agents.channels.webhook.setup.authentication.description'),
	},
	{
		id: 'endpoint',
		title: i18n.baseText('agents.channels.webhook.setup.endpoint.title'),
		description: i18n.baseText('agents.channels.webhook.setup.endpoint.description'),
	},
]);

const connectDisabled = computed(
	() => props.loading || (credentialRequired.value && !credentialId.value),
);
const currentSettings = computed(() => ({ authentication: authentication.value }));

function createCredential() {
	if (credentialType.value) emit('create', credentialType.value);
}

defineExpose({ credentialId, currentSettings, credentialRequired });
</script>

<template>
	<!-- The modal focuses this rather than the authentication select, which opens on focus. -->
	<div :class="$style.webhookSetup" tabindex="-1" data-agent-modal-autofocus>
		<N8nStepper v-if="mode === 'setup'" :steps="steps">
			<template #default="{ step }">
				<div :class="$style.stepContent">
					<AgentChannelWebhookAuth
						v-if="step.id === 'authentication'"
						v-model="credentialId"
						v-model:authentication="authentication"
						@update:authentication="authenticationTouched = true"
						:integration="integration"
						:credentials="credentialOptions"
						:credential-permissions="credentialPermissions"
						:credentials-loading="credentialsLoading"
						:loading="loading"
						:error-message="errorMessage"
						:error-is-conflict="errorIsConflict"
						:force-new-credential="forceNewCredential"
						@create="createCredential"
						@edit="emit('edit')"
					/>

					<template v-else>
						<div v-if="endpointUrl" :class="$style.urlField">
							<label for="webhook-endpoint-url">
								<N8nText size="small" bold>
									{{ i18n.baseText('agents.channels.webhook.url.label') }}
								</N8nText>
							</label>
							<N8nCopyInput
								id="webhook-endpoint-url"
								:value="endpointUrl"
								:label="i18n.baseText('agents.channels.webhook.url.label')"
								size="large"
								:class="$style.urlInput"
								:copy-label="i18n.baseText('agents.builder.addTrigger.copy')"
								:copied-label="i18n.baseText('agents.builder.addTrigger.copied')"
								data-testid="webhook-url"
							/>
							<N8nText :class="$style.hint" size="small">
								{{ i18n.baseText('agents.channels.webhook.url.hint') }}
							</N8nText>
						</div>
						<N8nText :class="$style.hint" size="small" data-testid="webhook-approval-notice">
							{{ i18n.baseText('agents.channels.webhook.approvalNotice') }}
						</N8nText>
						<N8nButton
							v-if="!connected"
							:class="$style.connectButton"
							:disabled="connectDisabled"
							:loading="loading"
							data-testid="webhook-connect"
							@click="emit('connect')"
						>
							{{ i18n.baseText('generic.connect') }}
						</N8nButton>
						<!-- Connecting closes the setup, so the notice shows before it. -->
						<N8nText
							v-if="!isPublished"
							:class="$style.hint"
							size="small"
							data-testid="webhook-publish-notice"
						>
							{{ i18n.baseText('agents.channels.webhook.publishNotice') }}
						</N8nText>
					</template>
				</div>
			</template>
		</N8nStepper>

		<template v-else>
			<AgentChannelWebhookAuth
				v-model="credentialId"
				v-model:authentication="authentication"
				@update:authentication="authenticationTouched = true"
				:integration="integration"
				:credentials="credentialOptions"
				:credential-permissions="credentialPermissions"
				:credentials-loading="credentialsLoading"
				:loading="loading"
				:error-message="errorMessage"
				:error-is-conflict="errorIsConflict"
				:force-new-credential="forceNewCredential"
				@create="createCredential"
				@edit="emit('edit')"
			/>
			<div v-if="endpointUrl" :class="$style.urlField">
				<label for="webhook-endpoint-url">
					<N8nText size="small" bold>
						{{ i18n.baseText('agents.channels.webhook.url.label') }}
					</N8nText>
				</label>
				<N8nCopyInput
					id="webhook-endpoint-url"
					:value="endpointUrl"
					:label="i18n.baseText('agents.channels.webhook.url.label')"
					size="small"
					:class="$style.urlInput"
					:copy-label="i18n.baseText('agents.builder.addTrigger.copy')"
					:copied-label="i18n.baseText('agents.builder.addTrigger.copied')"
					data-testid="webhook-url"
				/>
				<N8nText :class="$style.hint" size="small">
					{{ i18n.baseText('agents.channels.webhook.url.hint') }}
				</N8nText>
			</div>
			<N8nText v-if="!isPublished" :class="$style.hint" size="small">
				{{ i18n.baseText('agents.channels.webhook.publishNotice') }}
			</N8nText>
		</template>
	</div>
</template>

<style module lang="scss">
.webhookSetup {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);

	&:focus {
		outline: none;
	}
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

.hint {
	color: var(--text-color--subtler);
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

.connectButton {
	align-self: flex-start;
}
</style>
