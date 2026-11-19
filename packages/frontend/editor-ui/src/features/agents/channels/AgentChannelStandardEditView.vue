<script setup lang="ts">
import type { Component } from 'vue';
import { computed, ref } from 'vue';

import AgentIntegrationCredentialConnection from '../components/AgentIntegrationCredentialConnection.vue';
import type { AgentChannelViewExpose, AgentChannelViewProps } from './types';

const credentialId = defineModel<string>({ default: '' });
defineProps<AgentChannelViewProps & { detailsComponent: Component }>();
defineSlots<{
	/** Notices about the whole channel, shown above the credential. */
	top?: () => unknown;
}>();
const emit = defineEmits<{
	create: [];
	edit: [];
}>();

const detailsRef = ref<AgentChannelViewExpose>();
const currentSettings = computed(() => detailsRef.value?.currentSettings);
const validationError = computed(() => detailsRef.value?.validationError ?? null);
const saveLabel = computed(() => detailsRef.value?.saveLabel);
const beforeSave = async () => await detailsRef.value?.beforeSave?.();
const afterSave = async () => await detailsRef.value?.afterSave?.();

defineExpose({ currentSettings, validationError, saveLabel, beforeSave, afterSave });
</script>

<template>
	<!-- The modal focuses this rather than the credential select, which opens on focus. -->
	<div :class="$style.editView" tabindex="-1" data-agent-modal-autofocus>
		<slot name="top" />
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
			:managed-runtime="runtime"
			:persist-channel="persistChannel"
		/>
	</div>
</template>

<style module lang="scss">
.editView {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);

	&:focus {
		outline: none;
	}
}
</style>
