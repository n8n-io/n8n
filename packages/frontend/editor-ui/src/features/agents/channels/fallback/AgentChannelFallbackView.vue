<script setup lang="ts">
import { N8nButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import AgentIntegrationCredentialConnection from '../../components/AgentIntegrationCredentialConnection.vue';
import type { AgentChannelViewProps } from '../types';

const credentialId = defineModel<string>({ default: '' });
defineProps<AgentChannelViewProps>();
const emit = defineEmits<{
	create: [];
	edit: [];
	connect: [];
}>();

const i18n = useI18n();
const validationError = computed(() => (credentialId.value ? null : 'missing_credential'));

defineExpose({ validationError });
</script>

<template>
	<div :class="$style.container">
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
			:force-new-credential="forceNewCredential"
			@create="emit('create')"
			@edit="emit('edit')"
		/>
		<N8nText size="small" color="text-light">
			{{
				i18n.baseText(
					mode === 'setup'
						? 'agents.channels.modal.setupPlaceholder'
						: 'agents.channels.modal.editPlaceholder',
					{ interpolate: { channel: integration.label } },
				)
			}}
		</N8nText>
		<N8nButton
			v-if="mode === 'setup'"
			variant="subtle"
			size="medium"
			:disabled="Boolean(validationError) || loading"
			:loading="loading"
			@click="emit('connect')"
		>
			{{ i18n.baseText('generic.connect') }}
		</N8nButton>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--sm);
}
</style>
