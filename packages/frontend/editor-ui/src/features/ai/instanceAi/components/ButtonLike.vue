<template>
	<div :class="$style.buttonLike">
		<slot />
	</div>
</template>

<style module>
.buttonLike {
	min-height: var(--height--sm);
	padding: 0 var(--spacing--xs);
	border-radius: var(--radius--3xs);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	color: var(--color--text--tint-1);
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);

	:global(.n8n-icon) {
		flex-shrink: 0;
		align-self: baseline;
		margin-top: var(--spacing--2xs);
	}
}
</style>
