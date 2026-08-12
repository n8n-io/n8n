import { watch, type MaybeRefOrGetter, toValue } from 'vue';
import { useI18n } from '@n8n/i18n';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';

import { useInstanceAiProactiveOffer } from './useInstanceAiProactiveOffer';
import { buildExecutionErrorSeedMessage, executionErrorOfferKey } from '../instanceAiProactive';

/**
 * What the offer needs to know about a failed run. Deliberately a plain shape
 * rather than `IExecutionResponse` — reading an execution is the executions
 * feature's job, phrasing the offer is this one's.
 */
export interface FailedExecutionSummary {
	executionId: string;
	status: string;
	workflowId: string;
	workflowName: string;
	/** Empty when the run failed before any node reported. */
	nodeName: string;
	nodeType: string;
	errorMessage: string;
}

/**
 * Map a stored run to the offer summary, or `null` when it isn't a failure
 * worth explaining (success, canceled, still running, missing).
 */
export function summarizeFailedExecution(
	data: IExecutionResponse | null | undefined,
): FailedExecutionSummary | null {
	if (!data || (data.status !== 'error' && data.status !== 'crashed')) return null;

	const resultData = data.data?.resultData;
	const nodeName = resultData?.lastNodeExecuted ?? '';

	return {
		executionId: data.id,
		status: data.status,
		workflowId: data.workflowData.id,
		workflowName: data.workflowData.name,
		nodeName,
		nodeType: data.workflowData.nodes.find((node) => node.name === nodeName)?.type ?? '',
		errorMessage: resultData?.error?.message ?? '',
	};
}

/**
 * Offers to explain a failed execution — either one the user opened in the
 * executions preview, or the latest canvas Execute-workflow run that failed.
 *
 * Restraint comes from `useInstanceAiProactiveOffer`: the dwell delay means
 * clicking through a list of failed runs raises nothing, and the
 * `executionErrorOfferKey` means one offer per execution, ever.
 *
 * The workflow rides along as an attachment carrying the `executionId`, so the
 * agent reads the run itself through `executions.tool.ts` rather than trusting
 * the summary inlined in the message.
 */
export function useInstanceAiExecutionErrorOffer(
	failedExecution: MaybeRefOrGetter<FailedExecutionSummary | null>,
) {
	const i18n = useI18n();
	const { raise } = useInstanceAiProactiveOffer();

	watch(
		() => toValue(failedExecution),
		(execution) => {
			if (!execution) return;

			raise({
				key: executionErrorOfferKey(execution.executionId),
				title: i18n.baseText('instanceAi.proactiveOffer.executionError.title'),
				message: buildExecutionErrorSeedMessage({
					workflowName: execution.workflowName,
					workflowId: execution.workflowId,
					executionId: execution.executionId,
					executionStatus: execution.status,
					nodeName: execution.nodeName,
					nodeType: execution.nodeType,
					errorMessage: execution.errorMessage,
				}),
				attachments: [
					{
						type: 'workflow',
						id: execution.workflowId,
						name: execution.workflowName,
						executionId: execution.executionId,
					},
				],
				source: 'proactive_offer',
			});
		},
		{ immediate: true },
	);
}
