<template>
	<div :class="$style.arrowConnector"></div>
</template>

<style module lang="scss">
.arrowConnector {
	$arrow-width: 12px;
	$arrow-height: 8px;
	$stalk-width: 2px;
	$color: var(--color-text-dark);

	position: relative;
	height: var(--arrow-height, 3rem);
	margin: 0.5rem 0;

	&::before,
	&::after {
		content: '';
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
	}

	&::before {
		top: 0;
		width: $stalk-width;
		height: calc(100% - #{$arrow-height});
		background-color: $color;
	}

	&::after {
		bottom: 0;
		width: 0;
		height: 0;
		border-left: calc($arrow-width / 2) solid transparent;
		border-right: calc($arrow-width / 2) solid transparent;
		border-top: $arrow-height solid $color;
	}
}
</style>
