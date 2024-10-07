import {
	SEND_AND_WAIT_OPERATION,
	type ExecutionStatus,
	type IDataObject,
	type INode,
	type IPinData,
	type IRunData,
} from 'n8n-workflow';
import type { ExecutionFilterType, ExecutionsQueryFilter } from '@/Interface';
import { isEmpty } from '@/utils/typesUtils';
import { FORM_TRIGGER_NODE_TYPE } from '../constants';
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

export const openPopUpWindow = (
	url: string,
	options?: { width?: number; height?: number; alwaysInNewTab?: boolean },
) => {
	const windowWidth = window.innerWidth;
	const smallScreen = windowWidth <= 800;
	if (options?.alwaysInNewTab || smallScreen) {
		return window.open(url, '_blank');
	} else {
		const height = options?.width || 700;
		const width = options?.height || window.innerHeight - 50;
		const left = (window.innerWidth - height) / 2;
		const top = 50;
		const features = `width=${height},height=${width},left=${left},top=${top},resizable=yes,scrollbars=yes`;
		const windowName = `form-waiting-since-${Date.now()}`;
		return window.open(url, windowName, features);
	}
};

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
			if (testUrl && source !== 'RunData.ManualChatMessage') openPopUpWindow(testUrl);
		}
	}
}

export const waitingNodeTooltip = () => {
	try {
		const lastNode =
			useWorkflowsStore().workflowExecutionData?.data?.executionData?.nodeExecutionStack[0]?.node;
		const resume = lastNode?.parameters?.resume;

		if (resume) {
			if (!['webhook', 'form'].includes(resume as string)) {
				return i18n.baseText('ndv.output.waitNodeWaiting');
			}

			const { webhookSuffix } = (lastNode.parameters.options ?? {}) as { webhookSuffix: string };
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

		if (lastNode?.parameters.operation === SEND_AND_WAIT_OPERATION) {
			return i18n.baseText('ndv.output.sendAndWaitWaitingApproval');
		}
	} catch (error) {
		// do not throw error if could not compose tooltip
	}

	return '';
};
