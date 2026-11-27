<script setup lang="ts">
import { N8nDialogHeader, N8nDialogTitle, N8nIcon, N8nText } from '@n8n/design-system';

/** The header of each skill source dialog: the title, then the repository and branch. */
defineProps<{
	title: string;
	/** The repository and branch, such as `acme/skills · main`. Hidden while empty. */
	sourceLine?: string;
}>();

defineSlots<{
	/** Content at the end of the title line, such as the scope badge. */
	trailing?: () => unknown;
	/** A second line below the title and the repository, such as the commit. */
	details?: () => unknown;
}>();
</script>

<template>
	<N8nDialogHeader :class="$style.header">
		<N8nDialogTitle>{{ title }}</N8nDialogTitle>
		<N8nText
			v-if="sourceLine"
			size="small"
			color="text-light"
			:class="$style.source"
			data-test-id="skill-source-summary"
		>
			<N8nIcon icon="git-branch" size="small" />
			<span :class="$style.sourceLabel" :title="sourceLine">{{ sourceLine }}</span>
		</N8nText>
		<slot name="trailing" />
		<div v-if="$slots.details" :class="$style.details">
			<slot name="details" />
		</div>
	</N8nDialogHeader>
</template>

<style lang="scss" module>
.header {
	flex-flow: row wrap;
	align-items: center;
	column-gap: var(--spacing--sm);
	row-gap: var(--spacing--xs);
}

.source {
	display: flex;
	flex: 1;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.sourceLabel {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* The details take a full row, so they sit below the title and the repository. */
.details {
	flex-basis: 100%;
	min-width: 0;
}
</style>
