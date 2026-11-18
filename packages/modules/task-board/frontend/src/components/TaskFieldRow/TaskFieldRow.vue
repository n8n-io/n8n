<script setup lang="ts">
import { N8nText } from '@n8n/design-system';

/** One row of the side column of a task: a label, and the value or the control beside it. */
defineProps<{
	label: string;
	/** The id of the control in the row. Without a control, the label is plain text. */
	inputId?: string;
}>();
</script>

<template>
	<div :class="$style.row">
		<N8nText
			:tag="inputId ? 'label' : 'span'"
			:for="inputId"
			size="small"
			color="text-light"
			:class="$style.label"
		>
			{{ label }}
		</N8nText>
		<div :class="$style.value"><slot /></div>
	</div>
</template>

<style lang="scss" module>
.row {
	display: grid;
	/* The labels share one width, so the values line up. No spacing token is this wide. */
	grid-template-columns: 5.5rem minmax(0, 1fr);
	align-items: start;
	gap: var(--spacing--xs);
}

.label {
	/* The label sits on the text line of a medium control. */
	padding-top: var(--spacing--2xs);
}

.value {
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: var(--spacing--3xs);
	min-width: 0;
	min-height: var(--height--md);
}
</style>
