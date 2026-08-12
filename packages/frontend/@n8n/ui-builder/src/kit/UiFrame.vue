<script setup lang="ts">
/**
 * The root of a multi-page app: a header and a footer that stay, around a
 * content region whose children are pages, of which the renderer shows one.
 *
 * It renders no navigation of its own. The moment a frame draws its own tabs it
 * owns their styling, placement and behaviour, and every app wanting something
 * else has to fight it. A repeat over `$pages` with a button inside is a nav
 * bar, and the header is where it goes.
 */
// `defaultPage` is the renderer's, so it should not end up on the div.
defineOptions({ name: 'UiFrame', inheritAttrs: false });
</script>

<template>
	<div class="ui-frame">
		<header class="ui-frame__header">
			<slot name="header" />
		</header>

		<main class="ui-frame__content">
			<slot />
		</main>

		<footer class="ui-frame__footer">
			<slot name="footer" />
		</footer>
	</div>
</template>

<style scoped>
.ui-frame {
	display: flex;
	flex-direction: column;
	min-height: 100%;
	font-family: var(--font-family, sans-serif);
	color: var(--color--text--shade-1, #2d2e2e);
}

.ui-frame__header,
.ui-frame__footer {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs, 8px);
}

.ui-frame__header:not(:empty),
.ui-frame__footer:not(:empty) {
	padding: var(--spacing--2xs, 8px) var(--spacing--lg, 24px);
}

.ui-frame__header:not(:empty) {
	border-bottom: 1px solid var(--color--foreground, #dbdfe7);
}

.ui-frame__footer:not(:empty) {
	border-top: 1px solid var(--color--foreground, #dbdfe7);
}

/* The page inside brings its own padding, so the content region adds none. */
.ui-frame__content {
	flex: 1;
	min-height: 0;
}
</style>
