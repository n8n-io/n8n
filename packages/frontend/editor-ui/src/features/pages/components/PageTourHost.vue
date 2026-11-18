<script setup lang="ts">
import { usePageTour } from '../composables/usePageTour';
import { usePageTourStore } from '../pageTour.store';
import PageTourCard from './PageTourCard.vue';

/**
 * Runs the page tour of the open workflow and shows the card of the current step.
 * The card sits at the bottom centre of the positioned parent, above the buttons of the canvas.
 * Mount it inside the canvas area of a loaded workflow.
 */
const tourStore = usePageTourStore();

usePageTour();
</script>

<template>
	<Transition :enter-from-class="$style.hidden" :enter-active-class="$style.fading">
		<div v-if="tourStore.currentStep" :class="$style.anchor">
			<PageTourCard
				:page-title="tourStore.pageTitle"
				:text="tourStore.currentStep.text"
				:step-number="tourStore.stepNumber"
				:step-count="tourStore.stepCount"
				@previous="tourStore.previous"
				@next="tourStore.next"
				@close="tourStore.end"
			/>
		</div>
	</Transition>
</template>

<style lang="scss" module>
.anchor {
	position: absolute;
	// Leaves room for the run button, which sits at the bottom centre of the canvas.
	bottom: calc(var(--height--xl) + var(--spacing--xl));
	left: 50%;
	width: min(calc(100% - var(--spacing--xl)), calc(var(--spacing--5xl) * 2));
	transform: translateX(-50%);
	pointer-events: auto;
}

.fading {
	transition: opacity var(--duration--snappy) var(--easing--ease-out);
}

.hidden {
	opacity: 0;
}
</style>
