<script setup lang="ts">
import type { AnnotationVote } from 'n8n-workflow';

import { N8nIconButton } from '@n8n/design-system';
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

<template>
	<div :class="$style.ratingIcon">
		<N8nIconButton
			:class="[$style.icon, vote === 'up' && $style.up]"
			type="tertiary"
			text
			size="small"
			icon="thumbs-up"
			@click="onVoteClick('up')"
		/>
		<N8nIconButton
			:class="[$style.icon, vote === 'down' && $style.down]"
			type="tertiary"
			text
			size="small"
			icon="thumbs-down"
			@click="onVoteClick('down')"
		/>
	</div>
</template>

<style module lang="scss">
.ratingIcon {
	display: flex;
	flex-direction: row;

	.icon {
		color: var(--color--text--tint-1);

		&:not(.up):not(.down):hover {
			color: var(--color--primary);
		}
	}

	.up {
		color: var(--color--success);
	}

	.down {
		color: var(--color--danger);
	}
}
</style>
