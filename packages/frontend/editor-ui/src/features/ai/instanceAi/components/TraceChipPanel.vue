<script lang="ts" setup>
import type { InstanceAiTimelineEntry, InstanceAiToolCallState } from '@n8n/api-types';
import { N8nCallout } from '@n8n/design-system';
import { computed } from 'vue';
import ToolResultJson from './ToolResultJson.vue';
import ToolResultRenderer from './ToolResultRenderer.vue';

type ReasoningEntry = Extract<InstanceAiTimelineEntry, { type: 'reasoning' }>;

export type TraceChipSource =
	| { kind: 'reasoning'; entry: ReasoningEntry }
	| { kind: 'tool-call'; toolCall: InstanceAiToolCallState };

/** Detail content of one expanded trace chip: reasoning text, or tool args + result. */
const props = defineProps<{
	source?: TraceChipSource;
}>();

const reasoning = computed(() =>
	props.source?.kind === 'reasoning' ? props.source.entry : undefined,
);
const toolCall = computed(() =>
	props.source?.kind === 'tool-call' ? props.source.toolCall : undefined,
);
</script>

<template>
	<div>
		<div v-if="reasoning" :class="$style.reasoningScroll">
			<span :class="$style.reasoningContent">{{ reasoning.content }}</span>
		</div>
		<template v-else-if="toolCall">
			<ToolResultJson v-if="toolCall.args" :value="toolCall.args" />
			<ToolResultRenderer
				v-if="toolCall.result !== undefined"
				:result="toolCall.result"
				:tool-name="toolCall.toolName"
				:tool-args="toolCall.args"
			/>
			<N8nCallout v-if="toolCall.error" theme="danger" :class="$style.errorCallout">
				{{ toolCall.error }}
			</N8nCallout>
		</template>
	</div>
</template>

<style lang="scss" module>
.reasoningScroll {
	max-height: 200px;
	overflow-x: hidden;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: light-dark(var(--color--neutral-300), var(--color--neutral-700)) transparent;
}

.reasoningContent {
	display: block;
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--color--text--tint-1);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	word-break: break-word;
}

.errorCallout {
	margin-top: var(--spacing--2xs);
	max-width: 90%;
}
</style>
