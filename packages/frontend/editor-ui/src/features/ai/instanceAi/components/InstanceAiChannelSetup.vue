<script lang="ts" setup>
import { computed, ref } from 'vue';
import AgentChannelModal, {
	type ChannelView,
} from '@/features/agents/components/AgentChannelModal.vue';
import { useThread } from '../instanceAi.store';

const props = defineProps<{
	requestId: string;
	integrationType: string;
	agentId: string;
	projectId: string;
}>();

const thread = useThread();

const open = ref(true);
const submitted = ref(false);

// Map the integration type to the modal's per-channel setup view. Unknown types
// fall back to the channel list (the modal renders nothing for an unmatched type).
const SETUP_VIEWS: Record<string, ChannelView> = {
	slack: 'slack_setup',
	telegram: 'telegram_setup',
	linear: 'linear_setup',
};
const view = computed<ChannelView>(() => SETUP_VIEWS[props.integrationType] ?? 'list');

// Resume the suspended configure_channel tool: approved = connected, else skipped.
// Guarded so the connect-triggered close doesn't also fire a skip.
function finish(approved: boolean, resolution: 'approved' | 'deferred') {
	if (submitted.value || thread.resolvedConfirmationIds.has(props.requestId)) return;
	submitted.value = true;
	open.value = false;
	void thread.confirmAction(props.requestId, { kind: 'approval', approved }).then((ok) => {
		if (ok) thread.resolveConfirmation(props.requestId, resolution);
		else submitted.value = false;
	});
}

function onOpenChange(value: boolean) {
	if (!value) finish(false, 'deferred');
}
</script>

<template>
	<AgentChannelModal
		:open="open"
		:agent-id="agentId"
		:project-id="projectId"
		:view="view"
		:connected-channels="[]"
		:is-published="false"
		:force-new-credential="true"
		@update:open="onOpenChange"
		@channel-connected="finish(true, 'approved')"
	/>
</template>
