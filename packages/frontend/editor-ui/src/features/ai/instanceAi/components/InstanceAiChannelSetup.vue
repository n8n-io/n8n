<script lang="ts" setup>
/**
 * Thin transport adapter around the shared `ChannelSetupCard` (body +
 * composable wiring lives there) — this surface only translates the shared
 * `resolve` event into instance AI's own confirm transport
 * (`thread.confirmAction` + `thread.resolveConfirmation`, with the
 * MAX_CONFIRM_ATTEMPTS retry semantics this surface has always had).
 */
import { computed, ref } from 'vue';

import ChannelSetupCard from '@/features/ai/shared/components/ChannelSetupCard.vue';

import { useConfirmationTransport, type ConfirmationSubmit } from '../confirmationTransport';

const props = defineProps<{
	requestId: string;
	integrationType: string;
	agentId: string;
	projectId: string;
	/** Sends the answer through the caller (Agents chat resume) instead of the thread. */
	submit?: ConfirmationSubmit;
}>();

const transport = useConfirmationTransport(props.submit);

const MAX_CONFIRM_ATTEMPTS = 2;

const submitted = ref(false);

// Extra external gate passed to the shared component: guards against a
// stray resolve slipping through when the request was already resolved by
// another path (e.g. a concurrent confirmation), independent of this
// adapter's own `submitted` guard below.
const isResolvedOrSubmitted = computed(
	() => submitted.value || transport.isResolved(props.requestId),
);

async function onResolve({ approved }: { approved: boolean }) {
	if (isResolvedOrSubmitted.value) return;
	submitted.value = true;

	const resolution = approved ? 'approved' : 'deferred';
	for (let attempt = 0; attempt < MAX_CONFIRM_ATTEMPTS; attempt++) {
		if (await transport.confirm(props.requestId, { kind: 'approval', approved })) break;
	}
	transport.resolve(props.requestId, resolution);
}
</script>

<template>
	<ChannelSetupCard
		v-if="!submitted"
		data-test-id="instance-ai-channel-setup"
		:integration-type="integrationType"
		:agent-id="agentId"
		:project-id="projectId"
		:disabled="isResolvedOrSubmitted"
		@resolve="onResolve"
	/>
</template>
