<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { InstanceAiMcpConnectServer } from '@n8n/api-types';

import { mcpConnectInputs, trackInputCompleted } from '../confirmationTelemetry';
import { useThread } from '../instanceAi.store';
import InstanceAiMcpConnectCard from './InstanceAiMcpConnectCard.vue';

const props = defineProps<{
	requestId: string;
	inputThreadId?: string;
	servers: InstanceAiMcpConnectServer[];
	readOnly?: boolean;
	expired?: boolean;
}>();

const thread = useThread();
const telemetry = useTelemetry();
const rootStore = useRootStore();

const MAX_CONFIRM_ATTEMPTS = 2;

const submitted = ref(false);

const isResolved = computed(
	() =>
		submitted.value ||
		Boolean(props.readOnly) ||
		Boolean(props.expired) ||
		thread.resolvedConfirmationIds.has(props.requestId),
);

async function onResolve({
	approved,
	connectedSlugs,
}: {
	approved: boolean;
	connectedSlugs: string[];
}) {
	if (isResolved.value) return;
	submitted.value = true;

	let confirmed = false;
	for (let attempt = 0; attempt < MAX_CONFIRM_ATTEMPTS && !confirmed; attempt++) {
		confirmed = await thread.confirmAction(props.requestId, {
			kind: 'mcpConnect',
			approved,
			connectedSlugs,
		});
	}
	if (!confirmed) {
		submitted.value = false;
		return;
	}

	trackInputCompleted(
		telemetry,
		{
			threadId: thread.id,
			inputThreadId: props.inputThreadId,
			instanceId: rootStore.instanceId,
			actionSource: thread.resolveActionSource(),
			type: 'mcp-connect',
			runtime: 'instance-ai',
		},
		mcpConnectInputs(props.servers, approved, connectedSlugs),
	);
	thread.resolveConfirmation(props.requestId, approved ? 'approved' : 'deferred');
}
</script>

<template>
	<InstanceAiMcpConnectCard
		:servers="servers"
		:read-only="isResolved"
		:expired="expired"
		@resolve="onResolve"
	/>
</template>
