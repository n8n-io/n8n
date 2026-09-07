<script setup lang="ts">
import { computed, ref } from 'vue';

import AgentIntegrationCredentialConnection from '../../components/AgentIntegrationCredentialConnection.vue';
import AgentChannelSlackManagedSettings from '../../components/AgentChannelSlackManagedSettings.vue';
import type { AgentChannelViewProps } from '../types';
import type { SlackChannelRuntime } from './useSlackChannelRuntime';

const credentialId = defineModel<string>({ default: '' });
const props = defineProps<
	Omit<AgentChannelViewProps, 'runtime'> & { runtime: SlackChannelRuntime }
>();
const emit = defineEmits<{
	create: [];
	edit: [];
}>();

const currentSettings = computed(() => props.savedSettings);
const settingsRef = ref<InstanceType<typeof AgentChannelSlackManagedSettings>>();
const managed = computed(() => props.runtime.isManagedCredential(credentialId.value));
const validationError = computed(() =>
	managed.value ? (settingsRef.value?.validationError ?? null) : null,
);
const loading = computed(
	() => props.loading || props.runtime.loading.value || props.runtime.settingsLoading.value,
);

async function beforeSave() {
	if (!managed.value) return;
	const settings = settingsRef.value?.currentSettings;
	if (!settings || settingsRef.value?.validationError) return;
	await props.runtime.saveSettings(settings);
}

defineExpose({ currentSettings, validationError, loading, beforeSave });
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
		<AgentChannelSlackManagedSettings
			v-if="managed"
			ref="settingsRef"
			:settings="runtime.settings.value"
			:loading="runtime.settingsLoading.value"
			:error="runtime.settingsError.value"
			:save-error="runtime.settingsSaveError.value"
			:disabled="loading"
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
