<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import AgentChannelTeamsSetup from './AgentChannelTeamsSetup.vue';
import AgentChannelStandardEditView from '../AgentChannelStandardEditView.vue';
import type { AgentChannelRestart, AgentChannelViewExpose, AgentChannelViewProps } from '../types';
import type { TeamsChannelRuntime } from './useTeamsChannelRuntime';
import { useTeamsSetupRestart } from './useTeamsSetupRestart';

const credentialId = defineModel<string>({ default: '' });
// Narrowed from `AgentChannelRuntime`: the settings reach for the Teams-only
// parts of it to offer publishing, which the shared type does not carry.
const props = defineProps<
	Omit<AgentChannelViewProps, 'runtime'> & { runtime: TeamsChannelRuntime }
>();
const emit = defineEmits<{
	create: [];
	edit: [];
	restart: [restart: AgentChannelRestart];
}>();
const { confirmRestart } = useTeamsSetupRestart();
const viewRef = ref<AgentChannelViewExpose>();
const currentSettings = computed(() => viewRef.value?.currentSettings);
const validationError = computed(() => viewRef.value?.validationError ?? null);
const saveLabel = computed(() => viewRef.value?.saveLabel);
const beforeSave = async () => await viewRef.value?.beforeSave?.();
const afterSave = async () => await viewRef.value?.afterSave?.();

// Another credential is another bot, which needs its own check and Azure Bot,
// so it cannot be swapped in: the user sets the channel up again instead.
watch(credentialId, async (next) => {
	const saved = props.savedCredentialId;
	if (!saved || !next || next === saved) return;
	credentialId.value = saved;
	if (await confirmRestart()) emit('restart', { credentialId: next });
});

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
