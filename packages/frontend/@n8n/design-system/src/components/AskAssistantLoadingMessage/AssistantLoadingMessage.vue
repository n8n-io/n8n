<script setup lang="ts">
import N8nIcon from '../N8nIcon';
import N8nText from '../N8nText';

withDefaults(
	defineProps<{
		message: string;
		animationType?: 'slide-vertical' | 'slide-horizontal' | 'fade';
	}>(),
	{
		animationType: 'slide-vertical',
	},
);
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.loadingSpinner">
			<N8nIcon icon="spinner" spin color="secondary" size="large" />
		</div>
		<Transition :name="animationType" mode="out-in">
			<N8nText v-if="message" :key="message" size="small" bold>{{ message }}</N8nText>
		</Transition>
	</div>
</template>

<style module lang="scss">
@use '../../css/mixins/animations';

.container {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	user-select: none;
}

.loadingSpinner {
	display: flex;
	align-items: center;
	justify-content: center;
	width: var(--spacing--md);
	flex-shrink: 0;
}
</style>

<style lang="scss" scoped>
// Vertical Slide transition
.slide-vertical-enter-active,
.slide-vertical-leave-active {
	transition:
		transform 0.5s ease,
		opacity 0.5s ease;
}

.slide-vertical-enter {
	transform: translateY(100%);
	opacity: 0;
}

.slide-vertical-leave-to {
	transform: translateY(-100%);
	opacity: 0;
}

// Horizontal Slide transition
.slide-horizontal-enter-active,
.slide-horizontal-leave-active {
	transition:
		transform 0.5s ease,
		opacity 0.5s ease;
}

.slide-horizontal-enter {
	transform: translateX(100%);
	opacity: 0;
}

.slide-horizontal-leave-to {
	transform: translateX(-100%);
	opacity: 0;
}

// Fade transition
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.5s ease;
}

.fade-enter {
	opacity: 0;
}

.fade-leave-to /* .fade-leave-active in <2.1.8 */ {
	opacity: 0;
}
</style>
