<script setup lang="ts">
import { N8nLoading } from '@n8n/design-system';
import { computed, ref, watch } from 'vue';

import AgentChannelSlackManagedSetup from '../../components/AgentChannelSlackManagedSetup.vue';
import AgentChannelSlackSetup from '../../components/AgentChannelSlackSetup.vue';
import type { AgentChannelViewExpose, AgentChannelViewProps } from '../types';
import type { SlackChannelRuntime } from './useSlackChannelRuntime';

const credentialId = defineModel<string>({ default: '' });
const props = defineProps<
	Omit<AgentChannelViewProps, 'runtime'> & {
		runtime: SlackChannelRuntime;
	}
>();
const emit = defineEmits<{
	create: [];
	edit: [];
	connect: [];
	connected: [];
}>();

const manualRef = ref<AgentChannelViewExpose>();
const currentSettings = computed(() => manualRef.value?.currentSettings);
const managedActionInFlight = ref(false);
const validationError = computed(() => manualRef.value?.validationError ?? null);
const loading = computed(
	() =>
		props.loading ||
		props.runtime.loading.value ||
		managedActionInFlight.value ||
		manualRef.value?.loading === true,
);

async function setupApp(token: string) {
	if (props.disabled) return false;
	return await props.runtime.setupApp(token, () => emit('connected'));
}

async function connectManagerCredential(credentialId?: string) {
	if (props.disabled || managedActionInFlight.value) return false;
	managedActionInFlight.value = true;
	try {
		return await props.runtime.connectManagerCredential(credentialId);
	} finally {
		managedActionInFlight.value = false;
	}
}

async function installManagedApp(managerCredentialId: string, workspaceId: string) {
	if (props.disabled || managedActionInFlight.value) return false;
	managedActionInFlight.value = true;
	try {
		return await props.runtime.installManagedApp(managerCredentialId, workspaceId, () =>
			emit('connected'),
		);
	} finally {
		managedActionInFlight.value = false;
	}
}

watch(
	() => [props.projectId, props.agentId] as const,
	() => {
		props.runtime.setupKind.value = 'managed';
	},
	{ immediate: true },
);

defineExpose({ currentSettings, validationError, loading });
</script>

<template>
	<div :class="$style.view">
		<div
			v-if="runtime.loading.value"
			:class="$style.skeleton"
			data-testid="slack-managed-setup-skeleton"
		>
			<N8nLoading variant="p" :rows="4" />
		</div>
		<AgentChannelSlackManagedSetup
			v-else-if="runtime.setup.value.managedSetupAvailable && runtime.setupKind.value === 'managed'"
			:setup="runtime.setup.value"
			:loading="loading"
			:credential-permissions="credentialPermissions"
			:connect-manager="connectManagerCredential"
			:edit-manager="runtime.editManagerCredential"
			:install-app="installManagedApp"
		/>
		<AgentChannelSlackSetup
			v-else
			ref="manualRef"
			v-model="credentialId"
			:connected="connected"
			:is-published="isPublished"
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
	</div>
</template>

<style module lang="scss">
.view {
	display: contents;
}

.skeleton {
	padding-block: var(--spacing--xs);
}
</style>
