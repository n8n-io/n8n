import type { ExecutionStatus, IDataObject } from 'n8n-workflow';
import type { ExecutionFilterType, ExecutionsQueryFilter } from '@/Interface';
import { isEmpty } from '@/utils/typesUtils';

export const executionFilterToQueryFilter = (
	filter: ExecutionFilterType,
): ExecutionsQueryFilter => {
	const queryFilter: IDataObject = {};
	if (filter.workflowId !== 'all') {
		queryFilter.workflowId = filter.workflowId;
	}

	if (!isEmpty(filter.tags)) {
		queryFilter.tags = filter.tags;
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
