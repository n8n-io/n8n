import type { ExecutionStatus, IDataObject, INode, IPinData, IRunData } from 'n8n-workflow';
import type { ExecutionFilterType, ExecutionsQueryFilter } from '@/Interface';
import { isEmpty } from '@/utils/typesUtils';
import { FORM_TRIGGER_NODE_TYPE, WAIT_NODE_TYPE } from '../constants';

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
		window.open(url, '_blank');
	} else {
		const height = options?.width || 700;
		const width = options?.height || window.innerHeight - 50;
		const left = (window.innerWidth - height) / 2;
		const top = 50;
		const features = `width=${height},height=${width},left=${left},top=${top},resizable=yes,scrollbars=yes`;

		window.open(url, '_blank', features);
	}
};

export function displayForm({
	nodes,
	runData,
	pinData,
	destinationNode,
	directParentNodes,
	formWaitingUrl,
	executionId,
	source,
	getTestUrl,
	shouldShowForm,
}: {
	nodes: INode[];
	runData: IRunData | undefined;
	pinData: IPinData;
	destinationNode: string | undefined;
	directParentNodes: string[];
	formWaitingUrl: string;
	executionId: string | undefined;
	source: string | undefined;
	getTestUrl: (node: INode) => string;
	shouldShowForm: (node: INode) => boolean;
}) {
	for (const node of nodes) {
		const hasNodeRun = runData && runData?.hasOwnProperty(node.name);

		if (hasNodeRun || pinData[node.name]) continue;

		if (![FORM_TRIGGER_NODE_TYPE, WAIT_NODE_TYPE].includes(node.type)) {
			continue;
		}

		if (
			destinationNode &&
			destinationNode !== node.name &&
			!directParentNodes.includes(node.name)
		) {
			continue;
		}

		if (node.name === destinationNode || !node.disabled) {
			let testUrl = '';

			if (node.type === FORM_TRIGGER_NODE_TYPE) {
				testUrl = getTestUrl(node);
			}

			if (node.type === WAIT_NODE_TYPE && node.parameters.resume === 'form' && executionId) {
				if (!shouldShowForm(node)) continue;

				const { webhookSuffix } = (node.parameters.options ?? {}) as IDataObject;
				const suffix =
					webhookSuffix && typeof webhookSuffix !== 'object' ? `/${webhookSuffix}` : '';
				testUrl = `${formWaitingUrl}/${executionId}${suffix}`;
			}

			if (testUrl && source !== 'RunData.ManualChatMessage') openPopUpWindow(testUrl);
		}
	}
}
