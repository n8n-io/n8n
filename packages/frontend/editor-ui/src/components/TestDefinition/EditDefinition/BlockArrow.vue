<script setup lang="ts"></script>

<template>
	<div :class="$style.blockArrow">
		<div :class="$style.stalk"></div>
		<div :class="$style.arrowHead"></div>
	</div>
</template>

<style module lang="scss">
.blockArrow {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.stalk {
	min-height: 14px;
	width: 2px;
	background-color: var(--color-foreground-xdark);
	flex: 1;
}

.arrowHead {
	width: 0;
	height: 0;
	border-left: 5px solid transparent;
	border-right: 5px solid transparent;

	border-top: 10px solid var(--color-foreground-xdark);
}
</style>
