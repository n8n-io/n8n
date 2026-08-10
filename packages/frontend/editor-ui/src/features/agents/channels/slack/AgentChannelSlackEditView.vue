<script setup lang="ts">
import { computed } from 'vue';

import AgentIntegrationCredentialConnection from '../../components/AgentIntegrationCredentialConnection.vue';
import type { AgentChannelViewProps } from '../types';

const credentialId = defineModel<string>({ default: '' });
const props = defineProps<AgentChannelViewProps>();
const emit = defineEmits<{
	create: [];
	edit: [];
}>();

const loading = computed(() => props.loading || props.runtime.loading.value);

defineExpose({ validationError: null, loading });
</script>

<template>
	<AgentIntegrationCredentialConnection
		v-model="credentialId"
		:integration-type="integration.type"
		:integration-label="integration.label"
		:credentials="credentials"
		:credential-permissions="credentialPermissions"
		:credentials-loading="credentialsLoading"
		:disabled="credentialReplacementPending || loading"
		:loading="loading"
		:error-message="errorMessage"
		:error-is-conflict="errorIsConflict"
		:show-edit-button="!credentialReplacementPending"
		@create="emit('create')"
		@edit="emit('edit')"
	/>
</template>
