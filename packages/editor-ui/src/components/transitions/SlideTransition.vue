<template>
	<transition name="slide">
		<slot></slot>
	</transition>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	name: 'SlideTransition',
});
</script>

<style lang="scss" scoped>
.slide-leave-active,
.slide-enter-active {
	transition: 0.3s ease;
}
.slide-leave-to,
.slide-enter {
	transform: translateX(100%);
}
</style>