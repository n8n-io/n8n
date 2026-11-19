<script lang="ts" setup>
import { N8nSegmentControl } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import type { ToolCall } from '@/features/ai/shared/agentsChat/types';
import ToolDataBlock from '@/features/ai/shared/components/ToolDataBlock/ToolDataBlock.vue';

import ToolResultTable from '../components/ToolResultTable.vue';
import { extractTableRows } from '../toolResultTable';

/** The output of an Assistant list tool, as a table that can switch to the raw JSON. */
const props = defineProps<{
	toolCall: ToolCall;
}>();

type OutputView = 'table' | 'json';

const i18n = useI18n();
const view = ref<OutputView>('table');

const rows = computed(() => extractTableRows(props.toolCall.output));
const viewOptions = computed(() => [
	{ label: i18n.baseText('instanceAi.toolResult.view.table'), value: 'table' as const },
	{ label: i18n.baseText('instanceAi.toolResult.view.json'), value: 'json' as const },
]);
</script>

<template>
	<div :class="$style.output" data-test-id="assistant-tool-result-table">
		<N8nSegmentControl v-model="view" :options="viewOptions" size="mini" :class="$style.toggle" />
		<div v-if="view === 'table' && rows" :class="$style.table">
			<ToolResultTable :rows="rows" />
		</div>
		<ToolDataBlock v-else :value="toolCall.output" />
	</div>
</template>

<style module>
.output {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.toggle {
	align-self: flex-start;
}

.table {
	border: 0.5px solid var(--border-color);
	border-radius: var(--radius);
	overflow: hidden;
}
</style>
