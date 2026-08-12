<script setup lang="ts">
/**
 * The frame every pane in the builder shares: a titled, bordered column that
 * scrolls inside itself. One component rather than a copied block of CSS, so
 * the four panes cannot drift apart.
 */
defineOptions({ name: 'PaneShell' });

defineProps<{ title: string; flush?: boolean }>();
</script>

<template>
	<aside class="ui-pane">
		<div class="ui-pane__header">
			<span>{{ title }}</span>
			<slot name="header" />
		</div>

		<div class="ui-pane__body" :class="{ 'ui-pane__body--flush': flush }">
			<slot />
		</div>
	</aside>
</template>

<style scoped>
.ui-pane {
	display: flex;
	flex-direction: column;
	min-height: 0;
	border: var(--border);
	border-radius: var(--radius);
	background: var(--background--subtle);
	overflow: hidden;
}

.ui-pane__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-shrink: 0;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border-bottom: var(--border);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.ui-pane__body {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	padding: var(--spacing--2xs);
}

/*
 * Rows that run edge to edge, so a selected background reads as a full row.
 * Their indent comes from each row's own padding instead.
 */
.ui-pane__body--flush {
	padding: var(--spacing--3xs) 0;
}
</style>
