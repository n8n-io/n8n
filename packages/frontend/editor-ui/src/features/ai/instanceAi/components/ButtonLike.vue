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
	font-size: var(--font-size--xs);
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--3xs);

	:global(.n8n-icon) {
		flex-shrink: 0;
	}
}
</style>
