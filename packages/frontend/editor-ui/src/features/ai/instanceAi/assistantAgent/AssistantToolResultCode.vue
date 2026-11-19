<script lang="ts" setup>
import { N8nCodeBlock } from '@n8n/design-system';
import { computed } from 'vue';

import type { ToolCall } from '@/features/ai/shared/agentsChat/types';

import { getAssistantToolCallCode } from './assistantToolResultCode';

/** The workflow code or node type definitions in the output of an Assistant tool, highlighted. */
const props = defineProps<{
	toolCall: ToolCall;
}>();

const code = computed(() => getAssistantToolCallCode(props.toolCall) ?? '');
</script>

<template>
	<N8nCodeBlock
		:code="code"
		language="typescript"
		:class="$style.code"
		data-test-id="assistant-tool-result-code"
	/>
</template>

<style module>
.code {
	font-size: var(--font-size--2xs);
	background-color: var(--background--surface);
}
</style>
