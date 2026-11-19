<script setup lang="ts">
import { N8nBadge, N8nTag, N8nTooltip } from '@n8n/design-system';
import { computed } from 'vue';

import { splitVisibleTags } from '../../task-board.utils';

/** The tags of a task as chips. With a `limit`, a counter stands for the tags that do not fit. */
const props = defineProps<{ tags: string[]; limit?: number }>();

const visible = computed(() => splitVisibleTags(props.tags, props.limit ?? props.tags.length));
const hiddenTags = computed(() => props.tags.slice(visible.value.shown.length).join(', '));
</script>

<template>
	<ul v-if="tags.length > 0" :class="$style.tags" data-test-id="task-board-task-tags">
		<li v-for="tag in visible.shown" :key="tag" :class="$style.item">
			<N8nTag :text="tag" :clickable="false" :title="tag" data-test-id="task-board-task-tag" />
		</li>
		<li v-if="visible.hiddenCount > 0">
			<N8nTooltip :content="hiddenTags">
				<N8nBadge variant="ghost" size="xsmall" data-test-id="task-board-task-tags-more">
					+{{ visible.hiddenCount }}
				</N8nBadge>
			</N8nTooltip>
		</li>
	</ul>
</template>

<style lang="scss" module>
.tags {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--4xs);
	min-width: 0;
	margin: 0;
	padding: 0;
	list-style: none;
}

.item {
	/* A long tag gets an ellipsis and does not push the card wider. */
	--tag--min-width: 0;
	--tag--max-width: 100%;

	display: flex;
	min-width: 0;
	max-width: 100%;
}
</style>
