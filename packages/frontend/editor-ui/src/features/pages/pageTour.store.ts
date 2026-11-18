import type { PageTourStep } from '@n8n/api-types';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { usePagePeekStore } from './pagePeek.store';

/** What a tour shows: the title of its page and its steps in order. */
export type PageTourContent = { pageTitle: string; steps: PageTourStep[] };

const FIRST_STEP_INDEX = 0;

/** Holds the tour that the canvas shows. A tour without steps means that no tour runs. */
export const usePageTourStore = defineStore('pageTour', () => {
	const peekStore = usePagePeekStore();

	const pageTitle = ref('');
	const steps = ref<PageTourStep[]>([]);
	const stepIndex = ref(FIRST_STEP_INDEX);

	const stepCount = computed(() => steps.value.length);
	const isActive = computed(() => stepCount.value > 0);
	const currentStep = computed(() => steps.value.at(stepIndex.value));
	/** The position of the current step for a reader. The first step has number 1. */
	const stepNumber = computed(() => stepIndex.value + 1);
	const isFirstStep = computed(() => stepIndex.value === FIRST_STEP_INDEX);
	const isLastStep = computed(() => stepNumber.value === stepCount.value);

	/** Starts a tour at its first step and closes the page side panel. A running tour is replaced. */
	function start(content: PageTourContent): void {
		pageTitle.value = content.pageTitle;
		steps.value = content.steps;
		stepIndex.value = FIRST_STEP_INDEX;
		peekStore.close();
	}

	function end(): void {
		pageTitle.value = '';
		steps.value = [];
		stepIndex.value = FIRST_STEP_INDEX;
	}

	/** Goes to the next step. On the last step it ends the tour. */
	function next(): void {
		if (isLastStep.value) {
			end();
		} else {
			stepIndex.value += 1;
		}
	}

	/** Goes to the step before. On the first step it does nothing. */
	function previous(): void {
		if (!isFirstStep.value) {
			stepIndex.value -= 1;
		}
	}

	return {
		pageTitle,
		stepCount,
		isActive,
		currentStep,
		stepNumber,
		isFirstStep,
		isLastStep,
		start,
		end,
		next,
		previous,
	};
});
