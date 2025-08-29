<script setup lang="ts">
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
		<div :class="$style['message-container']">
			<transition :name="animationType" mode="out-in">
				<N8nText v-if="message" :key="message" :class="$style.message" :shimmer="true">{{
					message
				}}</N8nText>
			</transition>
		</div>
	</div>
</template>

<style module lang="scss">
@use '../../css/mixins/animations';

.container {
	display: flex;
	align-items: center;
	gap: var(--spacing-3xs);
	user-select: none;
}

.message-container {
	display: inline-flex;
	position: relative;
	overflow: hidden;
	line-height: 1.4rem;
	height: var(--spacing-xl);
	align-items: center;
}
.message {
	margin: 0;
	padding: 0;
	font-weight: var(--font-weight-bold);
	font-size: var(--font-size-2xs);
	color: var(--color-text-base);
	text-align: left;

	@include animations.shimmer;
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
