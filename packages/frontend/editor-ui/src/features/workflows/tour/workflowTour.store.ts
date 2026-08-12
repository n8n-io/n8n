import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useWorkflowTourStore = defineStore('workflowTour', () => {
	const isActive = ref(false);
	const currentStepIndex = ref(0);
	const pendingWorkflowId = ref<string | null>(null);

	const isFirstStep = computed(() => currentStepIndex.value === 0);

	function start() {
		pendingWorkflowId.value = null;
		currentStepIndex.value = 0;
		isActive.value = true;
	}

	function setCurrentStepIndex(index: number) {
		currentStepIndex.value = Math.max(0, index);
	}

	function exit() {
		isActive.value = false;
		currentStepIndex.value = 0;
		pendingWorkflowId.value = null;
	}

	function requestTour(workflowId: string) {
		pendingWorkflowId.value = workflowId;
	}

	function consumePendingTour() {
		const workflowId = pendingWorkflowId.value;
		pendingWorkflowId.value = null;
		return workflowId;
	}

	return {
		isActive,
		currentStepIndex,
		pendingWorkflowId,
		isFirstStep,
		start,
		setCurrentStepIndex,
		exit,
		requestTour,
		consumePendingTour,
	};
});
