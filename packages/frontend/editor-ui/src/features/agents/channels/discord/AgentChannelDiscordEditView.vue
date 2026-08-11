<script setup lang="ts">
import { computed, ref } from 'vue';

import AgentChannelDiscordSetup from '../../components/AgentChannelDiscordSetup.vue';
import AgentChannelStandardEditView from '../AgentChannelStandardEditView.vue';
import type { AgentChannelViewExpose, AgentChannelViewProps } from '../types';

const credentialId = defineModel<string>({ default: '' });
defineProps<AgentChannelViewProps>();
const emit = defineEmits<{
	create: [];
	edit: [];
}>();
const viewRef = ref<AgentChannelViewExpose>();
const validationError = computed(() => viewRef.value?.validationError ?? null);

defineExpose({ validationError });
</script>

<template>
	<AgentChannelStandardEditView
		ref="viewRef"
		v-bind="$props"
		v-model="credentialId"
		:details-component="AgentChannelDiscordSetup"
		@create="emit('create')"
		@edit="emit('edit')"
	/>
</template>
