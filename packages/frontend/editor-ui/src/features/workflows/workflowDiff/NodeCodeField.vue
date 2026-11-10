<script setup lang="ts">
// Prototype: a code field of the node diff. Code keeps a line diff, in a box with a label.
import { N8nInputLabel } from '@n8n/design-system';

import NodeDiff from './NodeDiff.vue';

defineProps<{
	fieldKey: string;
	label: string;
	before: string;
	after: string;
	language?: string;
}>();
</script>

<template>
	<N8nInputLabel
		:label="label"
		:bold="false"
		size="small"
		color="text-dark"
		:data-review-field="fieldKey"
	>
		<div :class="$style.box">
			<NodeDiff
				:old-string="before"
				:new-string="after"
				:language="language ?? 'plaintext'"
				output-format="line-by-line"
			/>
		</div>
	</N8nInputLabel>
</template>

<style lang="scss" module>
.box {
	overflow: auto;
	border-radius: var(--radius--xs);
	box-shadow: 0 0 0 1px var(--border-color);
	font-size: var(--font-size--2xs);
}
</style>
