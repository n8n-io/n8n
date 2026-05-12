<template>
	<Transition name="slide">
		<slot />
	</Transition>
</template>

<style lang="scss" scoped>
.slide-leave-active,
.slide-enter-active {
	transition: 200ms ease;
}
.slide-leave-to,
.slide-enter-from {
	transform: translateX(100%);
}
</style>
