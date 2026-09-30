<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nCopyInput, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import AgentChannelTeamsSetup from './AgentChannelTeamsSetup.vue';
import AgentChannelTeamsStatusBanner from './AgentChannelTeamsStatusBanner.vue';
import AgentIntegrationCredentialConnection from '../../components/AgentIntegrationCredentialConnection.vue';
import type { AgentChannelViewProps } from '../types';

const credentialId = defineModel<string>({ default: '' });
defineProps<AgentChannelViewProps>();
const emit = defineEmits<{
	create: [];
	edit: [];
}>();

const i18n = useI18n();

const detailsRef = ref<InstanceType<typeof AgentChannelTeamsSetup>>();
const currentSettings = computed(() => detailsRef.value?.currentSettings);
const validationError = computed(() => detailsRef.value?.validationError ?? null);
const messagingEndpointUrl = computed(() => detailsRef.value?.messagingEndpointUrl ?? '');

const showEndpoint = ref(false);

defineExpose({ currentSettings, validationError });
</script>

<template>
	<div :class="$style.editView">
		<AgentChannelTeamsStatusBanner
			:runtime-status="runtimeStatus"
			:runtime-error="runtimeError"
			:last-inbound-at="lastInboundAt"
			:is-published="isPublished"
			@show-endpoint="showEndpoint = true"
		/>

		<div v-if="showEndpoint" :class="$style.field" data-testid="teams-endpoint-field">
			<label for="teams-messaging-endpoint-url">
				<N8nText size="small" bold>
					{{ i18n.baseText('agents.channels.teams.messagingEndpointUrl.label') }}
				</N8nText>
			</label>
			<N8nCopyInput
				id="teams-messaging-endpoint-url"
				:value="messagingEndpointUrl"
				size="large"
				:class="$style.urlInput"
				:copy-label="i18n.baseText('agents.builder.addTrigger.copy')"
				:copied-label="i18n.baseText('agents.builder.addTrigger.copied')"
			/>
			<N8nText size="small" :class="$style.hint">
				{{ i18n.baseText('agents.channels.teams.setup.createBot.existingBotHint') }}
			</N8nText>
		</div>

		<AgentIntegrationCredentialConnection
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
			@create="emit('create')"
			@edit="emit('edit')"
		/>

		<AgentChannelTeamsSetup
			ref="detailsRef"
			v-model="credentialId"
			mode="edit"
			:integration="integration"
			:credentials="credentials"
			:credential-permissions="credentialPermissions"
			:credentials-loading="credentialsLoading"
			:loading="loading"
			:connected="connected"
			:saved-settings="savedSettings"
			:is-published="isPublished"
			:personalisation="personalisation"
			:project-id="projectId"
			:agent-id="agentId"
		/>
	</div>
</template>

<style module lang="scss">
.editView {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.hint {
	color: var(--text-color--subtler);
}

.urlInput input {
	font-family: monospace;
	font-size: var(--font-size--2xs);
	text-overflow: ellipsis;
}
</style>
