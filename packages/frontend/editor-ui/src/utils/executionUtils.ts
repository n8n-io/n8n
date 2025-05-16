import { SEND_AND_WAIT_OPERATION, TRIMMED_TASK_DATA_CONNECTIONS_KEY } from 'n8n-workflow';
import type {
	ITaskData,
	ExecutionStatus,
	IDataObject,
	INode,
	IPinData,
	IRunData,
	ExecutionError,
} from 'n8n-workflow';
import type { ExecutionFilterType, ExecutionsQueryFilter, INodeUi } from '@/Interface';
import { isEmpty } from '@/utils/typesUtils';
import { FORM_NODE_TYPE, FORM_TRIGGER_NODE_TYPE, GITHUB_NODE_TYPE } from '../constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { i18n } from '@/plugins/i18n';
import { h } from 'vue';
import NodeExecutionErrorMessage from '@/components/NodeExecutionErrorMessage.vue';

export function getDefaultExecutionFilters(): ExecutionFilterType {
	return {
		workflowId: 'all',
		status: 'all',
		startDate: '',
		endDate: '',
		tags: [],
		annotationTags: [],
		metadata: [],
		vote: 'all',
	};
}

export const executionFilterToQueryFilter = (
	filter: Partial<ExecutionFilterType>,
): ExecutionsQueryFilter => {
	const queryFilter: IDataObject = {};
	if (filter.workflowId !== 'all') {
		queryFilter.workflowId = filter.workflowId;
	}

	if (!isEmpty(filter.tags)) {
		queryFilter.tags = filter.tags;
	}

	if (!isEmpty(filter.annotationTags)) {
		queryFilter.annotationTags = filter.annotationTags;
	}

	if (filter.vote !== 'all') {
		queryFilter.vote = filter.vote;
	}

	if (!isEmpty(filter.metadata)) {
		queryFilter.metadata = filter.metadata;
	}

	if (!!filter.startDate) {
		queryFilter.startedAfter = filter.startDate;
	}

	if (!!filter.endDate) {
		queryFilter.startedBefore = filter.endDate;
	}

	switch (filter.status as ExecutionStatus) {
		case 'waiting':
			queryFilter.status = ['waiting'];
			break;
		case 'error':
			queryFilter.status = ['crashed', 'error'];
			break;
		case 'success':
			queryFilter.status = ['success'];
			break;
		case 'running':
			queryFilter.status = ['running', 'new'];
			break;
		case 'canceled':
			queryFilter.status = ['canceled'];
			break;
		case 'new':
			queryFilter.status = ['new'];
			break;
	}

	return queryFilter;
};

let formPopupWindow: boolean = false;

export const openFormPopupWindow = (url: string) => {
	if (!formPopupWindow) {
		const height = 700;
		const width = window.innerHeight - 50;
		const left = (window.innerWidth - height) / 2;
		const top = 50;
		const features = `width=${height},height=${width},left=${left},top=${top},resizable=yes,scrollbars=yes`;
		const windowName = `form-waiting-since-${Date.now()}`;
		window.open(url, windowName, features);
		formPopupWindow = true;
	}
};

export const clearPopupWindowState = () => (formPopupWindow = false);

export function displayForm({
	nodes,
	runData,
	pinData,
	destinationNode,
	triggerNode,
	directParentNodes,
	source,
	getTestUrl,
}: {
	nodes: INode[];
	runData: IRunData | undefined;
	pinData: IPinData;
	destinationNode: string | undefined;
	triggerNode: string | undefined;
	directParentNodes: string[];
	source: string | undefined;
	getTestUrl: (node: INode) => string;
}) {
	for (const node of nodes) {
		if (triggerNode !== undefined && triggerNode !== node.name) continue;

		const hasNodeRun = runData && runData?.hasOwnProperty(node.name);

		if (hasNodeRun || pinData[node.name]) continue;

		if (![FORM_TRIGGER_NODE_TYPE].includes(node.type)) continue;

		if (destinationNode && destinationNode !== node.name && !directParentNodes.includes(node.name))
			continue;

		if (node.name === destinationNode || !node.disabled) {
			let testUrl = '';
			if (node.type === FORM_TRIGGER_NODE_TYPE) testUrl = getTestUrl(node);
			if (testUrl && source !== 'RunData.ManualChatMessage') {
				clearPopupWindowState();
				openFormPopupWindow(testUrl);
			}
		}
	}
}

export const waitingNodeTooltip = (node: INodeUi | null | undefined) => {
	if (!node) return '';
	try {
		const resume = node?.parameters?.resume;

		if (node?.type === GITHUB_NODE_TYPE && node.parameters?.operation === 'dispatchAndWait') {
			const resumeUrl = `${useRootStore().webhookWaitingUrl}/${useWorkflowsStore().activeExecutionId}`;
			const message = i18n.baseText('ndv.output.githubNodeWaitingForWebhook');
			return `${message}<a href="${resumeUrl}" target="_blank">${resumeUrl}</a>`;
		}
		if (resume) {
			if (!['webhook', 'form'].includes(resume as string)) {
				return i18n.baseText('ndv.output.waitNodeWaiting');
			}

			const { webhookSuffix } = (node.parameters.options ?? {}) as { webhookSuffix: string };
			const suffix = webhookSuffix && typeof webhookSuffix !== 'object' ? `/${webhookSuffix}` : '';

			let message = '';
			let resumeUrl = '';

			if (resume === 'form') {
				resumeUrl = `${useRootStore().formWaitingUrl}/${useWorkflowsStore().activeExecutionId}${suffix}`;
				message = i18n.baseText('ndv.output.waitNodeWaitingForFormSubmission');
			}

			if (resume === 'webhook') {
				resumeUrl = `${useRootStore().webhookWaitingUrl}/${useWorkflowsStore().activeExecutionId}${suffix}`;
				message = i18n.baseText('ndv.output.waitNodeWaitingForWebhook');
			}

			if (message && resumeUrl) {
				return `${message}<a href="${resumeUrl}" target="_blank">${resumeUrl}</a>`;
			}
		}

		if (node?.type === FORM_NODE_TYPE) {
			const message = i18n.baseText('ndv.output.waitNodeWaitingForFormSubmission');
			const resumeUrl = `${useRootStore().formWaitingUrl}/${useWorkflowsStore().activeExecutionId}`;
			return `${message}<a href="${resumeUrl}" target="_blank">${resumeUrl}</a>`;
		}

		if (node?.parameters.operation === SEND_AND_WAIT_OPERATION) {
			return i18n.baseText('ndv.output.sendAndWaitWaitingApproval');
		}
	} catch (error) {
		// do not throw error if could not compose tooltip
	}

	return '';
};

/**
 * Check whether task data contains a trimmed item.
 *
 * In manual executions in scaling mode, the payload in push messages may be
 * arbitrarily large. To protect Redis as it relays run data from workers to
 * main process, we set a limit on payload size. If the payload is oversize,
 * we replace it with a placeholder, which is later overridden on execution
 * finish, when the client receives the full data.
 */
export function hasTrimmedItem(taskData: ITaskData[]) {
	return taskData[0]?.data?.main?.[0]?.[0]?.json?.[TRIMMED_TASK_DATA_CONNECTIONS_KEY] ?? false;
}

/**
 * Check whether run data contains any trimmed items.
 *
 * See {@link hasTrimmedItem} for more details.
 */
export function hasTrimmedData(runData: IRunData) {
	return Object.keys(runData).some((nodeName) => hasTrimmedItem(runData[nodeName]));
}

export function executionRetryMessage(executionStatus: ExecutionStatus):
	| {
			title: string;
			type: 'error' | 'info' | 'success';
	  }
	| undefined {
	if (executionStatus === 'success') {
		return {
			title: i18n.baseText('executionsList.showMessage.retrySuccess.title'),
			type: 'success',
		};
	}

	if (executionStatus === 'waiting') {
		return {
			title: i18n.baseText('executionsList.showMessage.retryWaiting.title'),
			type: 'info',
		};
	}

	if (executionStatus === 'running') {
		return {
			title: i18n.baseText('executionsList.showMessage.retryRunning.title'),
			type: 'info',
		};
	}

	if (executionStatus === 'crashed') {
		return {
			title: i18n.baseText('executionsList.showMessage.retryCrashed.title'),
			type: 'error',
		};
	}

	if (executionStatus === 'canceled') {
		return {
			title: i18n.baseText('executionsList.showMessage.retryCanceled.title'),
			type: 'error',
		};
	}

	if (executionStatus === 'error') {
		return {
			title: i18n.baseText('executionsList.showMessage.retryError.title'),
			type: 'error',
		};
	}

	return undefined;
}

/**
 * Returns the error message from the execution object if it exists,
 * or a fallback error message otherwise
 */
export function getExecutionErrorMessage({
	error,
	lastNodeExecuted,
}: { error?: ExecutionError; lastNodeExecuted?: string }): string {
	let errorMessage: string;

	if (lastNodeExecuted && error) {
		errorMessage = error.message ?? error.description ?? '';
	} else {
		errorMessage = i18n.baseText('pushConnection.executionError', {
			interpolate: { error: '!' },
		});

		if (error?.message) {
			let nodeName: string | undefined;
			if ('node' in error) {
				nodeName = typeof error.node === 'string' ? error.node : error.node?.name;
			}

			const receivedError = nodeName ? `${nodeName}: ${error.message}` : error.message;
			errorMessage = i18n.baseText('pushConnection.executionError', {
				interpolate: {
					error: `.${i18n.baseText('pushConnection.executionError.details', {
						interpolate: {
							details: receivedError,
						},
					})}`,
				},
			});
		}
	}

	return errorMessage;
}

export function getExecutionErrorToastConfiguration({
	error,
	lastNodeExecuted,
}: { error: ExecutionError; lastNodeExecuted?: string }) {
	const message = getExecutionErrorMessage({ error, lastNodeExecuted });

	if (error.name === 'SubworkflowOperationError') {
		return { title: error.message, message: error.description ?? '' };
	}

	if (
		(error.name === 'NodeOperationError' || error.name === 'NodeApiError') &&
		error.functionality === 'configuration-node'
	) {
		// If the error is a configuration error of the node itself doesn't get executed so we can't use lastNodeExecuted for the title
		const nodeErrorName = 'node' in error && error.node?.name ? error.node.name : '';

		return {
			title: nodeErrorName ? `Error in sub-node ‘${nodeErrorName}‘` : 'Problem executing workflow',
			message: h(NodeExecutionErrorMessage, {
				errorMessage: error.description ?? message,
				nodeName: nodeErrorName,
			}),
		};
	}

	return {
		title: lastNodeExecuted
			? `Problem in node ‘${lastNodeExecuted}‘`
			: 'Problem executing workflow',
		message,
	};
}
