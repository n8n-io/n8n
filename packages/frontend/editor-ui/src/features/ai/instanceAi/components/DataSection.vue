<template>
	<div :class="$style.dataSection">
		<slot />
	</div>
</template>

<style lang="scss" module>
.dataSection {
	font-size: var(--font-size--sm);
	color: var(--color--text--tint-2);
	background: var(--color--foreground--tint-2);
	border-radius: var(--radius);
	padding: var(--spacing--2xs);
	margin-top: var(--spacing--2xs);
	border: var(--border);
	max-width: 90%;

	:global(pre) {
		background: transparent;
		margin: 0;
		padding: 0;
	}

	& + & {
		margin-top: var(--spacing--4xs);
	}
}
</style>
