<template>
	<div :class="$style.resultSection">
		<slot />
	</div>
</template>

<style lang="scss" module>
.resultSection {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-2);
	background: var(--color--foreground--tint-2);
	border-radius: var(--radius--xs);
	margin-top: var(--spacing--2xs);
	border: var(--border);
	max-width: 90%;
	max-height: 200px;
	overflow-y: auto;
	scrollbar-width: thin;
	scrollbar-color: light-dark(var(--color--neutral-300), var(--color--neutral-700)) transparent;

	:global(pre) {
		color: var(--text-color--subtler);
		background: transparent;
		margin: 0;
		padding: var(--spacing--2xs);
	}

	& + & {
		margin-top: var(--spacing--4xs);
	}
}
</style>
