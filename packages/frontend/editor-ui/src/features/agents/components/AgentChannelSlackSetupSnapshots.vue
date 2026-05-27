<template>
	<div :class="$style.row">
		<article></article>
		<article></article>
		<article></article>
	</div>
</template>

<style module lang="scss">
.row {
	display: flex;
	gap: var(--spacing--sm);
	width: 100%;

	article {
		aspect-ratio: 4/3;
		width: 13rem;
		background-color: var(--background--subtle);
		border-radius: var(--radius--xs);
		border: var(--border);
		overflow: hidden;
	}
}
</style>
