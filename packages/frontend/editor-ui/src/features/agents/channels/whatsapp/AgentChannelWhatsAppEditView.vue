<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue';

import AgentChannelStandardEditView from '../AgentChannelStandardEditView.vue';
import type { AgentChannelViewExpose, AgentChannelViewProps } from '../types';
import AgentChannelWhatsAppMetaCallout from './AgentChannelWhatsAppMetaCallout.vue';
import AgentChannelWhatsAppSetup from './AgentChannelWhatsAppSetup.vue';
import { useWhatsAppMetaStatus } from './useWhatsAppMetaStatus';

const credentialId = defineModel<string>({ default: '' });
const props = defineProps<AgentChannelViewProps>();
const emit = defineEmits<{
	create: [];
	edit: [];
}>();
// The status is for the credential the channel runs on. Picking another one in
// the select is not saved yet, so it must not change the callout.
const connectedCredentialId = ref(props.connected ? credentialId.value : '');
watch([() => props.connected, credentialId], () => {
	if (props.connected && !connectedCredentialId.value) {
		connectedCredentialId.value = credentialId.value;
	}
});
const { status: metaStatus } = useWhatsAppMetaStatus(
	toRef(props, 'projectId'),
	toRef(props, 'agentId'),
	computed(() => connectedCredentialId.value || undefined),
);
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
		:details-component="AgentChannelWhatsAppSetup"
		@create="emit('create')"
		@edit="emit('edit')"
	>
		<template #top>
			<AgentChannelWhatsAppMetaCallout :status="metaStatus" />
		</template>
	</AgentChannelStandardEditView>
</template>
