<script setup lang="ts">
import { N8nSegmentControl, N8nText } from '@n8n/design-system';

import type { ToolMode } from './ToolDonut.vue';

const mode = defineModel<ToolMode>({ required: true });

const options: Array<{ label: string; value: ToolMode }> = [
	{ label: 'Calls', value: 'calls' },
	{ label: 'Time', value: 'time' },
	{ label: 'Tokens', value: 'tokens' },
];
</script>

<template>
	<div :class="$style.control">
		<N8nSegmentControl v-model="mode" :options="options" size="small" />
		<N8nText size="xsmall" color="text-light">
			<template v-if="mode === 'time'">
				Derived: a tool gets the gap between the model step that called it and the next model step
				(tool run plus harness overhead), split evenly when one step made several calls. Model
				generation time is its own slice.
			</template>
			<template v-else-if="mode === 'tokens'">
				Derived: a tool gets the input and output tokens of the model step that called it, split
				evenly when one step made several calls. Steps without a tool call count as text answer.
			</template>
			<template v-else>Tool calls from the transcript.</template>
		</N8nText>
	</div>
</template>

<style module>
.control {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
	flex-wrap: wrap;
}
</style>
