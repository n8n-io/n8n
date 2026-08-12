<script setup lang="ts">
/**
 * Three drop points, and the only component that decides where its children go
 * rather than stacking them. The header and footer keep their own layout, so an
 * author composing a header does not have to nest a horizontal stack by hand.
 */
defineOptions({ name: 'UiCard' });

withDefaults(defineProps<{ padded?: boolean }>(), { padded: true });
</script>

<template>
	<section class="ui-card" :class="{ 'ui-card--padded': padded }">
		<header class="ui-card__header">
			<slot name="header" />
		</header>

		<div class="ui-card__body">
			<slot />
		</div>

		<footer class="ui-card__footer">
			<slot name="footer" />
		</footer>
	</section>
</template>

<style scoped>
.ui-card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs, 8px);
	border: 1px solid var(--color--foreground, #dbdfe7);
	border-radius: var(--radius, 4px);
	background: var(--background--surface, #fff);
}

.ui-card--padded {
	padding: var(--spacing--sm, 16px);
}

.ui-card__header,
.ui-card__footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs, 8px);
}

.ui-card__header:empty,
.ui-card__footer:empty {
	display: none;
}

.ui-card__body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs, 8px);
}
</style>
