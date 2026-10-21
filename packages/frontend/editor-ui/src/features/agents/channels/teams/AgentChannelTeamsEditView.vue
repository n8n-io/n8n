<script setup lang="ts">
import { computed, ref } from 'vue';

import AgentChannelTeamsSetup from './AgentChannelTeamsSetup.vue';
import AgentChannelStandardEditView from '../AgentChannelStandardEditView.vue';
import type { AgentChannelViewExpose, AgentChannelViewProps } from '../types';
import type { TeamsChannelRuntime } from './useTeamsChannelRuntime';

const credentialId = defineModel<string>({ default: '' });
// Narrowed from `AgentChannelRuntime`: the settings reach for the Teams-only
// parts of it to offer publishing, which the shared type does not carry.
defineProps<Omit<AgentChannelViewProps, 'runtime'> & { runtime: TeamsChannelRuntime }>();
const emit = defineEmits<{
	create: [];
	edit: [];
}>();
const viewRef = ref<AgentChannelViewExpose>();
const currentSettings = computed(() => viewRef.value?.currentSettings);
const validationError = computed(() => viewRef.value?.validationError ?? null);
const saveLabel = computed(() => viewRef.value?.saveLabel);
const beforeSave = async () => await viewRef.value?.beforeSave?.();
const afterSave = async () => await viewRef.value?.afterSave?.();

defineExpose({ currentSettings, validationError, saveLabel, beforeSave, afterSave });
</script>

<template>
	<AgentChannelStandardEditView
		ref="viewRef"
		v-bind="$props"
		v-model="credentialId"
		:details-component="AgentChannelTeamsSetup"
		@create="emit('create')"
		@edit="emit('edit')"
	/>
</template>
