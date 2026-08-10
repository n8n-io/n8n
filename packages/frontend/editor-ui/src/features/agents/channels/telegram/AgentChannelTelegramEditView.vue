<script setup lang="ts">
import { computed, ref } from 'vue';

import AgentChannelStandardEditView from '../AgentChannelStandardEditView.vue';
import type { AgentChannelViewExpose, AgentChannelViewProps } from '../types';
import AgentChannelTelegramSetup from './AgentChannelTelegramSetup.vue';

const credentialId = defineModel<string>({ default: '' });
defineProps<AgentChannelViewProps>();
const emit = defineEmits<{
	create: [];
	edit: [];
}>();
const viewRef = ref<AgentChannelViewExpose>();
const currentSettings = computed(() => viewRef.value?.currentSettings);
const validationError = computed(() => viewRef.value?.validationError ?? null);

defineExpose({ currentSettings, validationError });
</script>

<template>
	<AgentChannelStandardEditView
		ref="viewRef"
		v-bind="$props"
		v-model="credentialId"
		:details-component="AgentChannelTelegramSetup"
		@create="emit('create')"
		@edit="emit('edit')"
	/>
</template>
