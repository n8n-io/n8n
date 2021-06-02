<template>
	<transition name="slide">
		<slot></slot>
	</transition>
</template>

<script lang="ts">
import Vue from 'vue';

import NodeCreateIterator from './NodeCreateIterator.vue';
import SlideTransition from '../transitions/SlideTransition.vue';

export default Vue.extend({
	name: 'SlideTransition',
	props: ['leaveToPercent'],
});
</script>

<style lang="scss" scoped>
.slide-leave-active,
.slide-enter-active {
	transition: 0.3s ease;
}
.slide-enter {
	transform: translateX(100%);
}

.slide-leave-to {
	transform: translateX(120%);
}
</style>