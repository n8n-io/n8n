import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useWorkflowTourStore = defineStore('workflowTour', () => {
	const isActive = ref(false);
	const currentStepIndex = ref(0);

	const isFirstStep = computed(() => currentStepIndex.value === 0);

	function start() {
		currentStepIndex.value = 0;
		isActive.value = true;
	}

	function setCurrentStepIndex(index: number) {
		currentStepIndex.value = Math.max(0, index);
	}

	function exit() {
		isActive.value = false;
		currentStepIndex.value = 0;
	}

	return {
		isActive,
		currentStepIndex,
		isFirstStep,
		start,
		setCurrentStepIndex,
		exit,
	};
});
