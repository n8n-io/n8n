<template>
	<div :class="$style.preview">
		<slot />
	</div>
</template>

<style lang="scss" module>
.preview {
	font-family: monospace;
	font-size: var(--font-size--sm);
	color: var(--color--text);
	word-break: break-all;
	padding: var(--spacing--2xs);
	background: light-dark(var(--color--background), var(--color--neutral-850));
	border-radius: var(--radius);
	border: var(--border);
}
</style>
