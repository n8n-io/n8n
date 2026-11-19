<script lang="ts" setup>
import { N8nCodeBlock, N8nSegmentControl } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import type { ToolCall } from '@/features/ai/shared/agentsChat/types';
import ToolDataBlock from '@/features/ai/shared/components/ToolDataBlock/ToolDataBlock.vue';

import { getAssistantToolCallCode } from './assistantCodeToolResults';

/**
 * The workflow code or node type definitions in the output of an Assistant
 * tool, highlighted. It can switch to the raw JSON, which also holds the
 * fields that the code view leaves out.
 */
const props = defineProps<{
	toolCall: ToolCall;
}>();

type OutputView = 'code' | 'json';

const i18n = useI18n();
const view = ref<OutputView>('code');

const code = computed(() => getAssistantToolCallCode(props.toolCall));
const viewOptions = computed(() => [
	{ label: i18n.baseText('instanceAi.toolResult.view.code'), value: 'code' as const },
	{ label: i18n.baseText('instanceAi.toolResult.view.json'), value: 'json' as const },
]);
</script>

<template>
	<div :class="$style.output" data-test-id="assistant-tool-result-code">
		<N8nSegmentControl v-model="view" :options="viewOptions" size="mini" :class="$style.toggle" />
		<N8nCodeBlock
			v-if="view === 'code' && code"
			:code="code"
			language="typescript"
			:class="$style.code"
		/>
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

.code {
	font-size: var(--font-size--2xs);
	background-color: var(--background--surface);
}
</style>
