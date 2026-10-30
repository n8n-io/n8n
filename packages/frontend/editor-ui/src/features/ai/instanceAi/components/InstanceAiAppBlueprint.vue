<script setup lang="ts">
import type { AppBlueprint, InstanceAiConfirmRequest } from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useRootStore } from '@n8n/stores/useRootStore';
import { ref } from 'vue';

import { useThread } from '../instanceAi.store';
import { appBlueprintInputs, trackInputCompleted } from '../confirmationTelemetry';
import AppBlueprintCard from './AppBlueprintCard.vue';

const props = defineProps<{
	requestId: string;
	inputThreadId?: string;
	blueprint: AppBlueprint;
	readOnly?: boolean;
}>();

const thread = useThread();
const telemetry = useTelemetry();
const rootStore = useRootStore();
const submitted = ref(false);

async function submit(body: InstanceAiConfirmRequest) {
	if (submitted.value || props.readOnly) return;
	submitted.value = true;
	const confirmed = await thread.confirmAction(props.requestId, body);
	if (!confirmed) {
		submitted.value = false;
		return;
	}
	if (body.kind !== 'appBlueprint') return;
	trackInputCompleted(
		telemetry,
		{
			threadId: thread.id,
			inputThreadId: props.inputThreadId,
			instanceId: rootStore.instanceId,
			actionSource: thread.resolveActionSource(),
			type: 'app-blueprint',
			runtime: 'instance-ai',
		},
		appBlueprintInputs(body.approved),
	);
	thread.resolveConfirmation(props.requestId, body.approved ? 'approved' : 'denied');
}
</script>

<template>
	<AppBlueprintCard :blueprint="blueprint" :read-only="readOnly || submitted" @submit="submit" />
</template>
