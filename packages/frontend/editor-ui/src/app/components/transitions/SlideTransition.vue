<template>
	<Transition name="slide">
		<slot />
	</Transition>
</template>

<style lang="scss" scoped>
.slide-leave-active,
.slide-enter-active {
	// Keep this in sync with ASK_AI_SLIDE_OUT_DURATION_MS
	transition: 200ms ease;
}
.slide-leave-to,
.slide-enter-from {
	transform: translateX(100%);
}
</style>
