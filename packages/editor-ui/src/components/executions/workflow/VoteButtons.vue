<template>
	<div :class="$style.ratingIcon">
		<n8n-icon-button
			:class="{ [$style.highlight]: vote === 'up' }"
			type="tertiary"
			text
			size="medium"
			icon="thumbs-up"
			@click="onVoteClick('up')"
		/>
		<n8n-icon-button
			:class="{ [$style.highlight]: vote === 'down' }"
			type="tertiary"
			text
			size="medium"
			icon="thumbs-down"
			@click="onVoteClick('down')"
		/>
	</div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import type { AnnotationVote } from 'n8n-workflow';

defineProps<{
	vote: AnnotationVote | null;
}>();

const emit = defineEmits<{
	'vote-click': [vote: AnnotationVote];
}>();

const onVoteClick = (vote: AnnotationVote) => {
	emit('vote-click', vote);
};
</script>

<style module lang="scss">
.ratingIcon {
	display: flex;
	flex-direction: row;

	.highlight {
		color: var(--color-primary);
	}
}
</style>
