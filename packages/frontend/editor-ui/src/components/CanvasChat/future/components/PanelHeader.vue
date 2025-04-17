<script setup lang="ts">
import { N8nText } from '@n8n/design-system';

const { title } = defineProps<{ title?: string }>();

defineSlots<{ actions: {}; title?: {} }>();

const emit = defineEmits<{ click: [] }>();
</script>

<template>
	<header :class="$style.container" @click="emit('click')">
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
	font-size: var(--font-size-2xs);
	text-align: left;
	padding-inline-start: var(--spacing-s);
	padding-inline-end: var(--spacing-xs);
	padding-block: var(--spacing-2xs);
	background-color: var(--color-foreground-xlight);
	display: flex;
	justify-content: space-between;
	align-items: center;
	line-height: var(--font-line-height-compact);

	&:last-child {
		/** Panel collapsed */
		cursor: pointer;
	}

	&:not(:last-child) {
		/** Panel open */
		border-bottom: var(--border-base);
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
	color: var(--color-text-base);
	max-width: 70%;
	/* Let button heights not affect the header height */
	margin-block: calc(-1 * var(--spacing-s));
}
</style>
