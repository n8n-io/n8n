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
}

.content {
	display: grid;
	height: 100%;
}
</style>
