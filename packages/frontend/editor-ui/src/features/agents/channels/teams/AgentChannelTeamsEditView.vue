<script setup lang="ts">
import { computed, ref } from 'vue';

import AgentChannelTeamsSetup from './AgentChannelTeamsSetup.vue';
import AgentChannelStandardEditView from '../AgentChannelStandardEditView.vue';
import type { AgentChannelViewExpose, AgentChannelViewProps } from '../types';

const credentialId = defineModel<string>({ default: '' });
defineProps<AgentChannelViewProps>();
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
