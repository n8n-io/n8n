<template>
	<span class="blinking-cursor"></span>
</template>

<style lang="scss">
@use '../../css/mixins/motion';

.blinking-cursor {
	--animation--blink-background--duration: 1s;

	display: inline-block;
	height: var(--font-size--md);
	width: var(--spacing--3xs);
	border-radius: var(--radius--sm);
	margin-left: var(--spacing--4xs);

	@include motion.blink-background;
}
</style>
