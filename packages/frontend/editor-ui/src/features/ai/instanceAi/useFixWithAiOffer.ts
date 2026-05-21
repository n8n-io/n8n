import { ref } from 'vue';
import { useI18n } from '@n8n/i18n';

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

export function isFixWithAiError(value: unknown): value is FixWithAiError {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as { nodeName?: unknown }).nodeName === 'string' &&
		typeof (value as { errorMessage?: unknown }).errorMessage === 'string'
	);
}

export function buildFixWithAiPrompt(
	context: Pick<FixWithAiOfferState, 'workflowName' | 'errors'>,
): string {
	const i18n = useI18n();

	if (context.errors.length === 1) {
		const { nodeName, errorMessage } = context.errors[0];

		if (context.workflowName) {
			return i18n.baseText('instanceAi.fixWithAi.prompt.singleInWorkflow', {
				interpolate: { nodeName, errorMessage, workflowName: context.workflowName },
			});
		}

		return i18n.baseText('instanceAi.fixWithAi.prompt.single', {
			interpolate: { nodeName, errorMessage },
		});
	}

	const errorList = context.errors
		.map(({ nodeName, errorMessage }) =>
			i18n.baseText('instanceAi.fixWithAi.prompt.errorLine', {
				interpolate: { nodeName, errorMessage },
			}),
		)
		.join('\n');

	if (context.workflowName) {
		return i18n.baseText('instanceAi.fixWithAi.prompt.multipleInWorkflow', {
			interpolate: { errorList, workflowName: context.workflowName },
		});
	}

	return i18n.baseText('instanceAi.fixWithAi.prompt.multiple', {
		interpolate: { errorList },
	});
}

export function useFixWithAiOffer() {
	const offersByWorkflow = ref(new Map<string, FixWithAiOfferState>());
	const dismissedExecutionIds = ref(new Set<string>());

	function registerOffer(input: FixWithAiOfferState) {
		if (input.errors.length === 0) return;

		const next = new Map(offersByWorkflow.value);
		next.set(input.workflowId, input);
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
