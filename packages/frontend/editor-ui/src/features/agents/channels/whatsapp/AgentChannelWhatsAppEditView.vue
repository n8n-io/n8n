<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { computed, ref, toRef } from 'vue';

import { MODAL_CONFIRM } from '@/app/constants';

import { useAgentConfirmationModal } from '../../composables/useAgentConfirmationModal';
import AgentChannelStandardEditView from '../AgentChannelStandardEditView.vue';
import type { AgentChannelRestart, AgentChannelViewExpose, AgentChannelViewProps } from '../types';
import AgentChannelWhatsAppMetaCallout from './AgentChannelWhatsAppMetaCallout.vue';
import AgentChannelWhatsAppSetup from './AgentChannelWhatsAppSetup.vue';
import { useWhatsAppMetaStatus } from './useWhatsAppMetaStatus';

const credentialId = defineModel<string>({ default: '' });
const props = defineProps<AgentChannelViewProps>();
const emit = defineEmits<{
	create: [];
	edit: [];
	restart: [restart: AgentChannelRestart];
}>();
const i18n = useI18n();
const { openAgentConfirmationModal } = useAgentConfirmationModal();

/**
 * A number that is gone needs the full setup: a swapped credential skips the
 * webhook and verify steps, and Meta would not send messages to the agent.
 * The restart skips the remove dialog, so this view asks first.
 */
async function setUpAgain() {
	const confirmed = await openAgentConfirmationModal({
		title: i18n.baseText('agents.channels.whatsapp.restart.confirmTitle'),
		description: i18n.baseText('agents.channels.whatsapp.restart.confirmMessage'),
		confirmButtonText: i18n.baseText('agents.channels.whatsapp.meta.action.setUpAgain'),
		cancelButtonText: i18n.baseText('generic.cancel'),
	});
	if (confirmed === MODAL_CONFIRM) emit('restart', { credentialId: '' });
}
// The status is for the credential the saved channel runs on. Picking another
// one in the select is not saved yet, so it must not change the callout.
const savedCredentialId = computed(() =>
	props.connected ? props.savedCredentialId || undefined : undefined,
);
const { status: metaStatus } = useWhatsAppMetaStatus(
	toRef(props, 'projectId'),
	toRef(props, 'agentId'),
	savedCredentialId,
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
			<AgentChannelWhatsAppMetaCallout
				:status="metaStatus"
				:can-setup="credentialPermissions.create"
				@setup="setUpAgain"
			/>
		</template>
	</AgentChannelStandardEditView>
</template>
