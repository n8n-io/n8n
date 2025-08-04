<script lang="ts" setup>
type BlockUiProps = {
	show: boolean;
};

withDefaults(defineProps<BlockUiProps>(), {
	show: false,
});
</script>

<template>
	<transition name="fade" mode="out-in">
		<div
			v-show="show"
			:class="['n8n-block-ui', $style.uiBlocker]"
			role="dialog"
			:aria-hidden="true"
		/>
	</transition>
</template>

<style lang="scss" module>
.uiBlocker {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-color: var(--color-block-ui-overlay);
	z-index: 10;
	opacity: 0.6;
	border-radius: var(--border-radius-large);
}
</style>

<style lang="scss" scoped>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 200ms;
}
.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}
</style>
