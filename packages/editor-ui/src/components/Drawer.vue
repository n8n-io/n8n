<template>
	<SlideTransition>
		<div>
			<slot></slot>
		</div>
	</SlideTransition>
</template>

<script lang="ts">
import Vue from "vue";
import SlideTransition from "./transitions/SlideTransition.vue";

export default Vue.extend({
	name: "Modal",
	props: ['name'],
	components: {
		SlideTransition,
	},
	computed: {
	},
});
</script>

<style lang="scss" scoped>
/deep/ *, *:before, *:after {
	box-sizing: border-box;
}

div {
	position: fixed;
	width: 480px;
	height: 100%;
	background-color: $--drawer-background-color;
	z-index: 200;
}
</style>