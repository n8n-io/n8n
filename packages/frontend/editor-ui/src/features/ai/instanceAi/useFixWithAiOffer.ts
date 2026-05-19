import { ref } from 'vue';

export interface FixWithAiError {
	nodeName: string;
	errorMessage: string;
}

export interface FixWithAiOfferState {
	workflowId: string;
	workflowName?: string;
	executionId: string;
	errors: FixWithAiError[];
}

export interface RegisterFixWithAiOfferInput {
	workflowId: string;
	workflowName?: string;
	executionId: string;
	errors: FixWithAiError[];
}

export function useFixWithAiOffer() {
	const offersByWorkflow = ref(new Map<string, FixWithAiOfferState>());
	const dismissedExecutionIds = ref(new Set<string>());

	function registerOffer(input: RegisterFixWithAiOfferInput) {
		if (input.errors.length === 0) return;

		const next = new Map(offersByWorkflow.value);

		next.set(input.workflowId, {
			workflowId: input.workflowId,
			workflowName: input.workflowName,
			executionId: input.executionId,
			errors: input.errors,
		});

		offersByWorkflow.value = next;
	}

	function dismiss(executionId: string) {
		dismissedExecutionIds.value = new Set([...dismissedExecutionIds.value, executionId]);
	}

	function isDismissed(executionId: string): boolean {
		return dismissedExecutionIds.value.has(executionId);
	}

	function cleanup() {
		offersByWorkflow.value = new Map();
		dismissedExecutionIds.value = new Set();
	}

	return {
		offersByWorkflow,
		registerOffer,
		dismiss,
		isDismissed,
		cleanup,
	};
}
