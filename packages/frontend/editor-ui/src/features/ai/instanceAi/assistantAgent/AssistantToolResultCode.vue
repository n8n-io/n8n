<script lang="ts" setup>
import { N8nCodeBlock } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import type { ToolCall } from '@/features/ai/shared/agentsChat/types';
import ToolDataBlock from '@/features/ai/shared/components/ToolDataBlock/ToolDataBlock.vue';
import ToolDataViews from '@/features/ai/shared/components/ToolDataBlock/ToolDataViews.vue';

import { getAssistantToolCallCode } from './assistantCodeToolResults';

/**
 * The workflow code or node type definitions in the output of an Assistant
 * tool, highlighted. It can switch to the raw JSON, which also holds the
 * fields that the code view leaves out.
 */
const props = defineProps<{
	toolCall: ToolCall;
	label: string;
}>();

const i18n = useI18n();

const code = computed(() => getAssistantToolCallCode(props.toolCall));
</script>

<template>
	<ToolDataViews
		:label="label"
		:value="toolCall.output"
		:view-label="i18n.baseText('instanceAi.toolResult.view.code')"
		data-test-id="assistant-tool-result-code"
	>
		<N8nCodeBlock v-if="code" :code="code" language="typescript" :class="$style.code" />
		<ToolDataBlock v-else :value="toolCall.output" />
	</ToolDataViews>
</template>

<style module>
.code {
	font-size: var(--font-size--2xs);
	background-color: var(--background--surface);
}
</style>
