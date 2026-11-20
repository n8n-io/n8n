<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { ToolCall } from '@/features/ai/shared/agentsChat/types';
import ToolDataBlock from '@/features/ai/shared/components/ToolDataBlock/ToolDataBlock.vue';
import ToolDataViews from '@/features/ai/shared/components/ToolDataBlock/ToolDataViews.vue';

import ToolResultTable from '../components/ToolResultTable.vue';
import { extractTableRows } from '../toolResultTable';

/** The output of an Assistant list tool, as a table that can switch to the raw JSON. */
const props = defineProps<{
	toolCall: ToolCall;
	label: string;
}>();

const i18n = useI18n();

const rows = computed(() => extractTableRows(props.toolCall.output));
</script>

<template>
	<ToolDataViews
		:label="label"
		:value="toolCall.output"
		:view-label="i18n.baseText('instanceAi.toolResult.view.table')"
		data-test-id="assistant-tool-result-table"
	>
		<div v-if="rows" :class="$style.table">
			<ToolResultTable :rows="rows" />
		</div>
		<ToolDataBlock v-else :value="toolCall.output" />
	</ToolDataViews>
</template>

<style module>
.table {
	border: 0.5px solid var(--border-color);
	border-radius: var(--radius);
	overflow: hidden;
}
</style>
