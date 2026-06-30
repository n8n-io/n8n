<script setup lang="ts">
import { useTelemetry } from '@/app/composables/useTelemetry';
import { STOP_MANY_EXECUTIONS_MODAL_KEY } from '@/app/constants';
import { useUIStore } from '@/app/stores/ui.store';
import { useI18n } from '@n8n/i18n';
import type { ExecutionSummary } from 'n8n-workflow';
import { computed } from 'vue';
import { N8nText } from '@n8n/design-system';

const props = defineProps<{
	executions: ExecutionSummary[];
}>();

const uiStore = useUIStore();
const i18n = useI18n();

const hasCancellableExecution = computed(() =>
	props.executions.find((x) => ['new', 'running', 'waiting'].includes(x.status)),
);

const telemetry = useTelemetry();

function onStopManyExecutions() {
	telemetry.track('User initiated stop many executions');
	uiStore.openModal(STOP_MANY_EXECUTIONS_MODAL_KEY);
}
</script>

<template>
	<N8nText
		v-if="hasCancellableExecution"
		:class="$style.stopAll"
		size="small"
		color="text-base"
		@click="onStopManyExecutions"
		>{{ i18n.baseText('generic.stopAll') }}</N8nText
	>
</template>

<style module lang="scss">
.stopAll {
	cursor: pointer;
	&:hover {
		text-decoration: underline;
	}
}
</style>
