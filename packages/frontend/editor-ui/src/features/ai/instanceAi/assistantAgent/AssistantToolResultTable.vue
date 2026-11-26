<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { ToolCall } from '@/features/ai/shared/agentsChat/types';
import ToolDataViews from '@/features/ai/shared/components/ToolDataBlock/ToolDataViews.vue';

import ToolResultTable from '@/features/ai/shared/components/ToolResult/ToolResultTable.vue';
import { extractTableRows } from '@/features/ai/shared/components/ToolResult/toolResultTable';

/**
 * The output of an Assistant list tool, as a table that can switch to the raw
 * JSON. The extension only matches outputs that have rows.
 */
const props = defineProps<{
	toolCall: ToolCall;
	label: string;
}>();

const i18n = useI18n();

const rows = computed(() => extractTableRows(props.toolCall.output) ?? []);
</script>

<template>
	<ToolDataViews
		:label="label"
		:value="toolCall.output"
		:view-label="i18n.baseText('instanceAi.toolResult.view.table')"
		data-test-id="assistant-tool-result-table"
	>
		<div :class="$style.table">
			<ToolResultTable :rows="rows" />
		</div>
	</ToolDataViews>
</template>

<style module>
.table {
	border: 0.5px solid var(--border-color);
	border-radius: var(--radius);
	overflow: hidden;
}
</style>
