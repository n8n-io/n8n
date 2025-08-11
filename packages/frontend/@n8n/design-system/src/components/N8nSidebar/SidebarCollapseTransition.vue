<script lang="ts" setup>
const beforeEnter = (el: Element) => {
	(el as HTMLElement).style.height = '0';
	(el as HTMLElement).style.paddingTop = '0';
	(el as HTMLElement).style.paddingBottom = '0';
	(el as HTMLElement).style.marginBottom = '0';
};

const enter = (el: Element) => {
	const htmlEl = el as HTMLElement;
	// Get the natural height without any transforms
	htmlEl.style.height = 'auto';
	const height = htmlEl.offsetHeight;
	htmlEl.style.height = '0';
	// Force reflow
	htmlEl.offsetHeight;
	// Animate to natural height
	htmlEl.style.height = height + 'px';
	htmlEl.style.paddingTop = '';
	htmlEl.style.paddingBottom = '';
	htmlEl.style.marginBottom = '';
};

const afterEnter = (el: Element) => {
	(el as HTMLElement).style.height = 'auto';
};

const beforeLeave = (el: Element) => {
	(el as HTMLElement).style.height = (el as HTMLElement).offsetHeight + 'px';
};

const leave = (el: Element) => {
	(el as HTMLElement).style.height = '0';
	(el as HTMLElement).style.paddingTop = '0';
	(el as HTMLElement).style.paddingBottom = '0';
	(el as HTMLElement).style.marginBottom = '0';
};

const afterLeave = (el: Element) => {
	const htmlEl = el as HTMLElement;
	htmlEl.style.height = '';
	htmlEl.style.paddingTop = '';
	htmlEl.style.paddingBottom = '';
	htmlEl.style.marginBottom = '';
};
</script>

<template>
	<Transition
		name="collapse-transition"
		@before-enter="beforeEnter"
		@enter="enter"
		@after-enter="afterEnter"
		@before-leave="beforeLeave"
		@leave="leave"
		@after-leave="afterLeave"
	>
		<slot />
	</Transition>
</template>

<style lang="scss" scoped>
.collapse-transition-enter-active,
.collapse-transition-leave-active {
	transition:
		height 0.3s cubic-bezier(0.645, 0.045, 0.355, 1),
		padding 0.3s cubic-bezier(0.645, 0.045, 0.355, 1),
		margin 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
	overflow: hidden;
}
</style>
