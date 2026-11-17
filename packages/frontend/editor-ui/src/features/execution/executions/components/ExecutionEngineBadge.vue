<script setup lang="ts">
import { computed } from 'vue';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { N8nBadge } from '@n8n/design-system';
import {
	getExecutionEngine,
	getExecutionEngineLabel,
} from '@/features/execution/executions/executions.utils';

const props = defineProps<{
	executionId: string;
}>();

const settingsStore = useSettingsStore();

const label = computed(() => getExecutionEngineLabel(getExecutionEngine(props.executionId)));
</script>

<template>
	<N8nBadge v-if="settingsStore.isEngineV2Enabled" data-test-id="execution-engine-badge">{{
		label
	}}</N8nBadge>
</template>
