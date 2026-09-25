<script setup lang="ts">
import { computed, ref } from 'vue';

import type {
	McpServerConnectionItem,
	ToolConnectionCredentialAdapter,
} from '@/features/shared/toolsConnection/types';

import type { AgentRegistryMcpModalData } from '../composables/useAgentRegistryMcpConfig';
import AgentRegistryMcpConfigForm from './AgentRegistryMcpConfigForm.vue';
import AgentToolConfigForm, { type AgentToolConfigModalData } from './AgentToolConfigForm.vue';

export type AgentToolConfigData = AgentToolConfigModalData | AgentRegistryMcpModalData;

const props = defineProps<{
	data: AgentToolConfigData;
}>();

const emit = defineEmits<{
	'credential-deleted': [];
	'request-credential-picker': [];
	'update:title': [title: string];
}>();

const genericForm = ref<InstanceType<typeof AgentToolConfigForm> | null>(null);
const registryForm = ref<InstanceType<typeof AgentRegistryMcpConfigForm> | null>(null);
const isRegistryConfig = computed(() => props.data.kind === 'registryMcpServer');
const titleError = computed(() => registryForm.value?.titleError ?? '');
const headerItem = computed<McpServerConnectionItem | null>(
	() => registryForm.value?.headerItem ?? null,
);
const credentialAdapter = computed<ToolConnectionCredentialAdapter | null>(
	() => registryForm.value?.credentialAdapter ?? null,
);
const saveDisabled = computed(
	() => isRegistryConfig.value && (registryForm.value?.saveDisabled ?? true),
);

function confirm(): boolean {
	return isRegistryConfig.value
		? (registryForm.value?.confirm() ?? false)
		: (genericForm.value?.confirm() ?? false);
}

async function remove(): Promise<boolean> {
	if (isRegistryConfig.value) return (await registryForm.value?.remove()) ?? false;
	genericForm.value?.remove();
	return true;
}

function changeTitle(title: string) {
	if (isRegistryConfig.value) registryForm.value?.changeTitle(title);
	else genericForm.value?.changeTitle(title);
}

function selectCredential(authType: string, credentialId: string) {
	if (isRegistryConfig.value) void registryForm.value?.selectCredential(authType, credentialId);
}

defineExpose({
	changeTitle,
	confirm,
	credentialAdapter,
	headerItem,
	remove,
	saveDisabled,
	selectCredential,
	titleError,
});
</script>

<template>
	<AgentRegistryMcpConfigForm
		v-if="data.kind === 'registryMcpServer'"
		ref="registryForm"
		:data="data"
		@credential-deleted="emit('credential-deleted')"
		@request-credential-picker="emit('request-credential-picker')"
		@update:title="emit('update:title', $event)"
	/>
	<AgentToolConfigForm
		v-else
		ref="genericForm"
		:data="data"
		@credential-deleted="emit('credential-deleted')"
		@update:title="emit('update:title', $event)"
	/>
</template>
