<script setup lang="ts">
import { computed } from 'vue';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { N8nBadge } from '@n8n/design-system';
import { getExecutionEngineLabel } from '../executions.utils';

const props = defineProps<{
	executionId: string;
}>();

const settingsStore = useSettingsStore();

// The engine select in the workflow settings uses the same gate.
const isEngineV2Active = computed(() => settingsStore.isModuleActive('engine-v2'));
const label = computed(() => getExecutionEngineLabel(props.executionId));
</script>

<template>
	<N8nBadge v-if="isEngineV2Active" data-test-id="execution-engine-badge">{{ label }}</N8nBadge>
</template>
