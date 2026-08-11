<script setup lang="ts">
import { computed, ref } from 'vue';

import AgentChannelSlackSetup from '../../components/AgentChannelSlackSetup.vue';
import type { AgentChannelViewExpose, AgentChannelViewProps } from '../types';
import { isSlackChannelRuntime } from './useSlackChannelRuntime';

const credentialId = defineModel<string>({ default: '' });
const props = defineProps<AgentChannelViewProps>();
const emit = defineEmits<{
	create: [];
	edit: [];
	connect: [];
	connected: [];
}>();

const manualRef = ref<AgentChannelViewExpose>();
const validationError = computed(() => manualRef.value?.validationError ?? null);
const loading = computed(() => props.loading || props.runtime.loading.value);

async function setupApp(token: string) {
	if (props.disabled) return false;
	if (!isSlackChannelRuntime(props.runtime)) {
		throw new Error('Slack channel runtime is unavailable');
	}
	return await props.runtime.setupApp(token, () => emit('connected'));
}

defineExpose({ validationError, loading });
</script>

<template>
	<AgentChannelSlackSetup
		ref="manualRef"
		v-model="credentialId"
		:connected="connected"
		:setup-slack-app="setupApp"
		:project-id="projectId"
		:agent-id="agentId"
		:integration="integration"
		:credentials="credentials"
		:credential-permissions="credentialPermissions"
		:credentials-loading="credentialsLoading"
		:loading="loading"
		:disabled="disabled"
		:error-message="errorMessage"
		:error-is-conflict="errorIsConflict"
		:force-new-credential="forceNewCredential"
		:setup-mode="simpleSetup ? 'simple' : 'advanced'"
		@create="emit('create')"
		@edit="emit('edit')"
		@connect="emit('connect')"
	/>
</template>
