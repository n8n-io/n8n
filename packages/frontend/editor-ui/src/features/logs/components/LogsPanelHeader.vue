<script setup lang="ts">
import { N8nText } from '@n8n/design-system';

const { title, isClickable } = defineProps<{ title?: string; isClickable: boolean }>();

defineSlots<{ actions: {}; title?: {} }>();

const emit = defineEmits<{ click: [] }>();

function handleClick() {
	if (isClickable) {
		emit('click');
	}
}
</script>

<template>
	<header :class="[$style.container, { [$style.clickable]: isClickable }]" @click="handleClick">
		<N8nText :class="$style.title" :bold="true" size="small">
			<slot name="title">{{ title }}</slot>
		</N8nText>
		<div :class="$style.actions">
			<slot name="actions" />
		</div>
	</header>
</template>

<style lang="scss" module>
.container {
	font-size: var(--font-size--2xs);
	text-align: left;
	padding-inline-start: var(--spacing--sm);
	padding-inline-end: var(--spacing--2xs);
	padding-block: var(--spacing--2xs);
	background-color: var(--color--foreground--tint-2);
	display: flex;
	justify-content: space-between;
	align-items: center;
	line-height: var(--line-height--sm);

	&.clickable {
		cursor: pointer;
	}

	&:not(:last-child) {
		/** Panel open */
		border-bottom: var(--border);
	}
}

.title {
	flex-grow: 1;
	flex-shrink: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.actions {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	color: var(--color--text);
	max-width: 70%;
	/* Let button heights not affect the header height */
	margin-block: calc(-1 * var(--spacing--sm));
}
</style>
