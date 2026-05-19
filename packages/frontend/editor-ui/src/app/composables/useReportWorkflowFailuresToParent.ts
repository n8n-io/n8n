import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { VIEWS } from '@/app/constants';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import type { IRunData } from 'n8n-workflow';

function collectErrorsFromRunData(
	runData: IRunData,
): Array<{ nodeName: string; errorMessage: string }> {
	const errors: Array<{ nodeName: string; errorMessage: string }> = [];

	for (const [nodeName, tasks] of Object.entries(runData)) {
		const lastTask = tasks?.at(-1);
		const error = lastTask?.error;

		if (!error) continue;

		const description = error.description ? ` (${error.description})` : '';

		errors.push({
			nodeName,
			errorMessage: `${error.message ?? 'Unknown error'}${description}`,
		});
	}

	return errors;
}

export function useReportWorkflowFailuresToParent(workflowName?: () => string | undefined) {
	if (window.parent === window) return;

	const route = useRoute();
	const workflowsStore = useWorkflowsStore();
	const isEnabled = computed(() => route.name === VIEWS.DEMO && route.query.canExecute === 'true');
	let lastReportedKey: string | null = null;

	watch(
		[
			isEnabled,
			() => workflowsStore.getWorkflowRunData,
			() => workflowsStore.isWorkflowRunning,
			() => workflowsStore.workflowId,
			() => workflowsStore.getWorkflowExecution?.id,
		],
		() => {
			if (!isEnabled.value || workflowsStore.isWorkflowRunning) return;

			const workflowId = workflowsStore.workflowId;
			const runData = workflowsStore.getWorkflowRunData;

			if (!workflowId || !runData) return;

			const errors = collectErrorsFromRunData(runData);

			if (errors.length === 0) return;

			const executionId = workflowsStore.getWorkflowExecution?.id;
			const fingerprint = errors
				.map((e) => `${e.nodeName}:${e.errorMessage}`)
				.sort()
				.join('|');

			const dismissKey = executionId ?? fingerprint;

			if (!dismissKey || lastReportedKey === dismissKey) return;

			lastReportedKey = dismissKey;

			window.parent.postMessage(
				JSON.stringify({
					command: 'reportWorkflowFailures',
					workflowId,
					workflowName: workflowName?.(),
					executionId: dismissKey,
					errors,
				}),
				window.location.origin,
			);
		},
		{ deep: true },
	);
}
