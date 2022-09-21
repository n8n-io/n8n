<template>
	<transition
		name="slide"
		v-bind="animationClasses"
	>
		<slot></slot>
	</transition>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	props: ['absolute'],
	name: 'SlideTransition',
	computed: {
		animationClasses() {
			const absouteClass = this.absolute ? 'absolute' : '';
			return {
				'enter-active-class': `slide-enter-active ${absouteClass}`,
				'leave-active-class': `slide-leave-active ${absouteClass}`,
			};
		},
	},
});
</script>

<style lang="scss" scoped>
.slide-leave-active,
.slide-enter-active {
	transition: 0.3s ease;

	&.absolute {
		position: absolute;
		left: 0;
		right: 0;
	}
}
.slide-leave-to,
.slide-enter {
	transform: translateX(100%);
}

</style>
