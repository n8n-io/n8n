import { ref, computed, type Ref } from 'vue';

interface UseWizardNavigationOptions {
	/** Total number of steps. Can be a ref for dynamic step counts. */
	totalSteps: Ref<number> | number;
	/** Starting step index (default 0). */
	initialStep?: number;
}

export function useWizardNavigation(options: UseWizardNavigationOptions) {
	const totalSteps = computed(() =>
		typeof options.totalSteps === 'number' ? options.totalSteps : options.totalSteps.value,
	);

	const currentStepIndex = ref(options.initialStep ?? 0);

	const isPrevDisabled = computed(() => currentStepIndex.value === 0);
	const isNextDisabled = computed(() => currentStepIndex.value >= totalSteps.value - 1);
	const isFirstStep = computed(() => currentStepIndex.value === 0);
	const isLastStep = computed(() => currentStepIndex.value >= totalSteps.value - 1);

	function goToNext() {
		if (!isNextDisabled.value) {
			currentStepIndex.value++;
		}
	}

	function goToPrev() {
		if (!isPrevDisabled.value) {
			currentStepIndex.value--;
		}
	}

	function goToStep(index: number) {
		if (index >= 0 && index < totalSteps.value) {
			currentStepIndex.value = index;
		}
	}

	return {
		currentStepIndex,
		totalSteps,
		isPrevDisabled,
		isNextDisabled,
		isFirstStep,
		isLastStep,
		goToNext,
		goToPrev,
		goToStep,
	};
}
