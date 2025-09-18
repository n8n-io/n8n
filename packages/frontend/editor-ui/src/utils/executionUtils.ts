import {
	MANUAL_TRIGGER_NODE_TYPE,
	SEND_AND_WAIT_OPERATION,
	TRIMMED_TASK_DATA_CONNECTIONS_KEY,
} from 'n8n-workflow';
import type {
	ITaskData,
	ExecutionStatus,
	IDataObject,
	INode,
	IPinData,
	IRunData,
	ExecutionError,
	INodeTypeBaseDescription,
	INodeExecutionData,
} from 'n8n-workflow';
import type {
	ExecutionFilterType,
	ExecutionsQueryFilter,
	IExecutionFlattedResponse,
	IExecutionResponse,
	INodeUi,
} from '@/Interface';
import { isEmpty } from '@/utils/typesUtils';
import {
	CORE_NODES_CATEGORY,
	ERROR_TRIGGER_NODE_TYPE,
	FORM_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	GITHUB_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	WEBHOOK_NODE_TYPE,
	WORKFLOW_TRIGGER_NODE_TYPE,
} from '../constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { i18n } from '@n8n/i18n';
import { h } from 'vue';
import NodeExecutionErrorMessage from '@/components/NodeExecutionErrorMessage.vue';
import { parse } from 'flatted';

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

	if (filter.startDate) {
		queryFilter.startedAfter = filter.startDate;
	}

	if (filter.endDate) {
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

let formPopupWindow = false;

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

export async function displayForm({
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

		const hasNodeRunAndIsNotFormTrigger =
			runData?.hasOwnProperty(node.name) && node.type !== FORM_TRIGGER_NODE_TYPE;

		if (hasNodeRunAndIsNotFormTrigger || pinData[node.name]) continue;

		if (![FORM_TRIGGER_NODE_TYPE].includes(node.type)) continue;

		if (destinationNode && destinationNode !== node.name && !directParentNodes.includes(node.name))
			continue;

		if (node.name === destinationNode || !node.disabled) {
			let testUrl = '';
			if (node.type === FORM_TRIGGER_NODE_TYPE) testUrl = getTestUrl(node);

			try {
				const res = await fetch(testUrl, { method: 'GET' });
				if (!res.ok) continue;
			} catch (error) {
				continue;
			}

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
				return i18n.baseText('ndv.output.waitNodeWaiting.description.timer');
			}

			const { webhookSuffix } = (node.parameters.options ?? {}) as { webhookSuffix: string };
			const suffix = webhookSuffix && typeof webhookSuffix !== 'object' ? `/${webhookSuffix}` : '';

			let message = '';
			let resumeUrl = '';

			if (resume === 'form') {
				resumeUrl = `${useRootStore().formWaitingUrl}/${useWorkflowsStore().activeExecutionId}${suffix}`;
				message = i18n.baseText('ndv.output.waitNodeWaiting.description.form');
			}

			if (resume === 'webhook') {
				resumeUrl = `${useRootStore().webhookWaitingUrl}/${useWorkflowsStore().activeExecutionId}${suffix}`;
				message = i18n.baseText('ndv.output.waitNodeWaiting.description.webhook');
			}

			if (message && resumeUrl) {
				return `${message}<a href="${resumeUrl}" target="_blank">${resumeUrl}</a>`;
			}
		}

		if (node?.type === FORM_NODE_TYPE) {
			const message = i18n.baseText('ndv.output.waitNodeWaiting.description.form');
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
 * Check whether node execution data contains a trimmed item.
 */
export function isTrimmedNodeExecutionData(data: INodeExecutionData[] | null) {
	return data?.some((entry) => entry.json?.[TRIMMED_TASK_DATA_CONNECTIONS_KEY]);
}

/**
 * Check whether task data contains a trimmed item.
 *
 * In manual executions in scaling mode, the payload in push messages may be
 * arbitrarily large. To protect Redis as it relays run data from workers to
 * the main process, we set a limit on payload size. If the payload is oversize,
 * we replace it with a placeholder, which is later overridden on execution
 * finish, when the client receives the full data.
 */
export function isTrimmedTaskData(taskData: ITaskData) {
	return taskData.data?.main?.some((main) => isTrimmedNodeExecutionData(main));
}

/**
 * Check whether task data contains a trimmed item.
 *
 * See {@link isTrimmedTaskData} for more details.
 */
export function hasTrimmedTaskData(taskData: ITaskData[]) {
	return taskData.some(isTrimmedTaskData);
}

/**
 * Check whether run data contains any trimmed items.
 *
 * See {@link hasTrimmedTaskData} for more details.
 */
export function hasTrimmedRunData(runData: IRunData) {
	return Object.keys(runData).some((nodeName) => hasTrimmedTaskData(runData[nodeName]));
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
}: {
	error?: ExecutionError;
	lastNodeExecuted?: string;
}): string {
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
}: {
	error: ExecutionError;
	lastNodeExecuted?: string;
}) {
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

/**
 * Unflattens the Execution data.
 *
 * @param {IExecutionFlattedResponse} fullExecutionData The data to unflatten
 */
export function unflattenExecutionData(fullExecutionData: IExecutionFlattedResponse) {
	// Unflatten the data
	const returnData: IExecutionResponse = {
		...fullExecutionData,
		workflowData: fullExecutionData.workflowData,
		data: parse(fullExecutionData.data),
	};

	returnData.finished = returnData.finished ? returnData.finished : false;

	if (fullExecutionData.id) {
		returnData.id = fullExecutionData.id;
	}

	return returnData;
}

export function findTriggerNodeToAutoSelect(
	triggerNodes: INodeUi[],
	getNodeType: (type: string, typeVersion: number) => INodeTypeBaseDescription | null,
) {
	const autoSelectPriorities: Record<string, number | undefined> = {
		[FORM_TRIGGER_NODE_TYPE]: 10,
		[WEBHOOK_NODE_TYPE]: 9,
		// ..."Other apps"
		[SCHEDULE_TRIGGER_NODE_TYPE]: 7,
		[MANUAL_TRIGGER_NODE_TYPE]: 6,
		[WORKFLOW_TRIGGER_NODE_TYPE]: 5,
		[ERROR_TRIGGER_NODE_TYPE]: 4,
	};

	function isCoreNode(node: INodeUi): boolean {
		const nodeType = getNodeType(node.type, node.typeVersion);

		return nodeType?.codex?.categories?.includes(CORE_NODES_CATEGORY) ?? false;
	}

	return triggerNodes
		.toSorted((a, b) => {
			const aPriority = autoSelectPriorities[a.type] ?? (isCoreNode(a) ? 0 : 8);
			const bPriority = autoSelectPriorities[b.type] ?? (isCoreNode(b) ? 0 : 8);

			return bPriority - aPriority;
		})
		.find((node) => !node.disabled);
}
