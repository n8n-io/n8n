<script lang="ts" setup>
/**
 * Thin adapter around the shared `ChannelSetupCard` (body + composable wiring
 * lives there). This surface turns the shared `resolve` event into a single
 * `decide` event, and the parent sends the answer.
 */
import { ref } from 'vue';

import ChannelSetupCard from '@/features/ai/shared/components/ChannelSetupCard.vue';

defineProps<{
	integrationType: string;
	agentId: string;
	projectId: string;
}>();

const emit = defineEmits<{
	/** Whether the user finished the channel setup. The parent sends it. */
	decide: [approved: boolean];
}>();

const submitted = ref(false);

function onResolve({ approved }: { approved: boolean }) {
	if (submitted.value) return;
	submitted.value = true;
	emit('decide', approved);
}
</script>

<template>
	<ChannelSetupCard
		v-if="!submitted"
		data-test-id="instance-ai-channel-setup"
		:integration-type="integrationType"
		:agent-id="agentId"
		:project-id="projectId"
		:disabled="submitted"
		@resolve="onResolve"
	/>
</template>
