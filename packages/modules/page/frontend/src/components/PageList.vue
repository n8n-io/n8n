<script setup lang="ts">
import type { PageSummary } from '@n8n/api-types';
import { N8nTimeAgo } from '@n8n/design-system';
import { computed } from 'vue';

import { toResourceDisplay } from '../resources/resourceDisplay';
import ResourceIcon from '../resources/ResourceIcon.vue';

const props = defineProps<{
	pages: PageSummary[];
	selectedPageId?: string;
}>();

const emit = defineEmits<{
	select: [pageId: string];
}>();

const rows = computed(() =>
	props.pages.map((page) => ({ page, display: toResourceDisplay('page', page.title) })),
);
</script>

<template>
	<ul :class="$style.list" data-test-id="page-list">
		<li v-for="{ page, display } in rows" :key="page.id">
			<button
				type="button"
				:class="[$style.item, page.id === selectedPageId ? $style.selected : '']"
				:aria-current="page.id === selectedPageId ? 'page' : undefined"
				data-test-id="page-list-item"
				@click="emit('select', page.id)"
			>
				<ResourceIcon
					:icon="display.icon"
					:emoji="display.emoji"
					size="medium"
					:class="$style.icon"
				/>
				<span :class="$style.text">
					<span :class="$style.title">{{ display.text }}</span>
					<span :class="$style.updated"><N8nTimeAgo :date="page.updatedAt" /></span>
				</span>
			</button>
		</li>
	</ul>
</template>

<style lang="scss" module>
.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.item {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: 0;
	border-radius: var(--radius--md);
	background-color: transparent;
	color: var(--text-color);
	font-family: inherit;
	text-align: left;
	cursor: pointer;
	transition: background-color var(--duration--snappy) var(--easing--ease-out);

	&:hover {
		background-color: var(--background--hover);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--focus--border-color);
	}
}

.selected,
.selected:hover {
	background-color: var(--background--active);
}

.icon {
	flex-shrink: 0;
	margin-top: var(--spacing--5xs);
	color: var(--text-color--subtle);
}

.text {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.title {
	overflow: hidden;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--medium);
	line-height: var(--line-height--md);
	text-overflow: ellipsis;
	white-space: nowrap;
}

.updated {
	color: var(--text-color--subtler);
	font-size: var(--font-size--2xs);
}
</style>
