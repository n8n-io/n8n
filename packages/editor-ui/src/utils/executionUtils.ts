import type { ExecutionStatus, ExecutionSummary, IDataObject } from 'n8n-workflow';
import type { ExecutionFilterType, ExecutionsQueryFilter } from '@/Interface';
import { isEmpty } from '@/utils/typesUtils';

export function filterExecutions(data: ExecutionSummary[], filter: ExecutionFilterType) {
	const queryFilter = executionFilterToQueryFilter(filter);
	return data.filter((execution) => {
		let matches = true;

		if (filter.workflowId === 'all') {
			matches = matches && true;
		} else {
			matches = matches && execution.workflowId === filter.workflowId;
		}

		if (filter.status === 'all') {
			matches = matches && true;
		} else {
			matches = matches && (queryFilter.status ?? []).includes(execution.status as ExecutionStatus);
		}

		const startDate = new Date(filter.startDate);
		if (filter.startDate === '') {
			matches = matches && true;
		} else {
			matches = matches && new Date(execution.startedAt) >= startDate;
		}

		const endDate = new Date(filter.endDate);
		if (filter.endDate === '') {
			matches = matches && true;
		} else {
			matches = matches && new Date(execution.startedAt) <= endDate;
		}

		// @TODO IMPLEMENT CUSTOM DATA FILTER

		return matches;
	});
}

export function getDefaultExecutionFilters(): ExecutionFilterType {
	return {
		workflowId: 'all',
		status: 'all',
		startDate: '',
		endDate: '',
		tags: [],
		metadata: [],
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
			queryFilter.status = ['failed', 'crashed', 'error'];
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
