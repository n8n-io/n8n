<script setup lang="ts">
import type { Component } from 'vue';
import { computed, ref } from 'vue';

import AgentIntegrationCredentialConnection from '../components/AgentIntegrationCredentialConnection.vue';
import type { AgentChannelViewExpose, AgentChannelViewProps } from './types';

const credentialId = defineModel<string>({ default: '' });
defineProps<AgentChannelViewProps & { detailsComponent: Component }>();
const emit = defineEmits<{
	create: [];
	edit: [];
}>();

const detailsRef = ref<AgentChannelViewExpose>();
const currentSettings = computed(() => detailsRef.value?.currentSettings);
const validationError = computed(() => detailsRef.value?.validationError ?? null);

defineExpose({ currentSettings, validationError });
</script>

<template>
	<div :class="$style.editView">
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
		<component
			:is="detailsComponent"
			ref="detailsRef"
			v-model="credentialId"
			mode="edit"
			:integration="integration"
			:credentials="credentials"
			:credential-permissions="credentialPermissions"
			:credentials-loading="credentialsLoading"
			:loading="loading"
			:connected="connected"
			:connected-description="connectedDescription"
			:saved-settings="savedSettings"
			:is-published="isPublished"
			:agent-name="agentName"
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
</style>
