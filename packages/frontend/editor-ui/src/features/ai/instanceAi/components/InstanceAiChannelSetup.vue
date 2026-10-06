<script lang="ts" setup>
/**
 * Thin transport adapter around the shared `ChannelSetupCard` (body +
 * composable wiring lives there). This surface only translates the shared
 * `resolve` event into the Assistant confirm body for the Agents chat resume.
 */
import { ref } from 'vue';

import ChannelSetupCard from '@/features/ai/shared/components/ChannelSetupCard.vue';

import type { ConfirmationSubmit } from '../confirmationTransport';

const props = defineProps<{
	requestId: string;
	integrationType: string;
	agentId: string;
	projectId: string;
	/** Sends the answer through the caller (Agents chat resume). */
	submit: ConfirmationSubmit;
}>();

const submitted = ref(false);

function onResolve({ approved }: { approved: boolean }) {
	// The shared card can emit twice before it re-renders; only the first counts.
	if (submitted.value) return;
	submitted.value = true;
	props.submit({ kind: 'approval', approved });
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
