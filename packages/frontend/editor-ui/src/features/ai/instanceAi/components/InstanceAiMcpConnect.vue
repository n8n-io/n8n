<script lang="ts" setup>
import { computed, ref } from 'vue';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { InstanceAiMcpConnectServer } from '@n8n/api-types';

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

function resolutionEventProps(approved: boolean, connectedSlugs: string[]) {
	const options = props.servers.map((server) => server.serverSlug);
	return {
		thread_id: thread.id,
		input_thread_id: props.inputThreadId ?? '',
		instance_id: rootStore.instanceId,
		type: 'mcp-connect',
		provided_inputs: approved
			? [{ label: 'mcp-connect', options, option_chosen: connectedSlugs }]
			: [],
		skipped_inputs: approved ? [] : [{ label: 'mcp-connect', options }],
	};
}

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

	telemetry.track('User finished providing input', resolutionEventProps(approved, connectedSlugs));
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
