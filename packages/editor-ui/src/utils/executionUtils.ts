import {
	SEND_AND_WAIT_OPERATION,
	type ExecutionStatus,
	type IDataObject,
	type INode,
	type IPinData,
	type IRunData,
} from 'n8n-workflow';
import type { ExecutionFilterType, ExecutionsQueryFilter, INodeUi } from '@/Interface';
import { isEmpty } from '@/utils/typesUtils';
import { FORM_NODE_TYPE, FORM_TRIGGER_NODE_TYPE } from '../constants';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useRootStore } from '@/stores/root.store';
import { i18n } from '@/plugins/i18n';

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
	directParentNodes,
	source,
	getTestUrl,
}: {
	nodes: INode[];
	runData: IRunData | undefined;
	pinData: IPinData;
	destinationNode: string | undefined;
	directParentNodes: string[];
	source: string | undefined;
	getTestUrl: (node: INode) => string;
}) {
	for (const node of nodes) {
		const hasNodeRun = runData && runData?.hasOwnProperty(node.name);

		if (hasNodeRun || pinData[node.name]) continue;

		if (![FORM_TRIGGER_NODE_TYPE].includes(node.type)) continue;

		if (destinationNode && destinationNode !== node.name && !directParentNodes.includes(node.name))
			continue;

		if (node.name === destinationNode || !node.disabled) {
			let testUrl = '';
			if (node.type === FORM_TRIGGER_NODE_TYPE) testUrl = getTestUrl(node);
			if (testUrl && source !== 'RunData.ManualChatMessage') openFormPopupWindow(testUrl);
		}
	}
}

export const waitingNodeTooltip = (node: INodeUi | null | undefined) => {
	if (!node) return '';
	try {
		const resume = node?.parameters?.resume;

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
