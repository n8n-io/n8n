<template>
	<Transition name="slide">
		<slot />
	</Transition>
</template>

<style lang="scss" scoped>
@use '@n8n/design-system/css/mixins/motion';
.slide-leave-active,
.slide-enter-active {
	transition: 200ms ease;
	@include motion.reduced-motion;
}
.slide-leave-to,
.slide-enter-from {
	transform: translateX(100%);
}
</style>
