<template>
	<div :class="$style.tabPanel"><slot /></div>
</template>
<style lang="scss" module>
.tabPanel {
	display: flex;
	flex: 0 0 auto;
	flex-direction: column;
	gap: var(--spacing--lg);
	width: 100%;
	padding: 0 0 var(--spacing--2xl);
}
</style>
