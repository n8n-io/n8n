<template>
	<div :class="$style.wrapper">
		<slot name="header" />
		<main :class="$style.content">
			<slot />
		</main>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	flex-direction: column;
	height: 100%;
	width: 100%;
	max-width: var(--content-container-width);
	box-sizing: border-box;
	align-content: start;
	padding: var(--spacing-l) var(--spacing-2xl) 0;

	@include mixins.breakpoint('sm-and-down') {
		padding: var(--spacing-s) var(--spacing-s) 0;
	}
}

.content {
	display: grid;
	height: 100%;
}
</style>
