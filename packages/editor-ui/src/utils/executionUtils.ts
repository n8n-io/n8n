import type { ExecutionStatus, IDataObject } from 'n8n-workflow';
import type { ExecutionFilterType, ExecutionsQueryFilter } from '@/Interface';
import { isEmpty } from '@/utils/typesUtils';

export const executionFilterToQueryFilter = (
	filter: ExecutionFilterType,
): ExecutionsQueryFilter => {
	const queryFilter: IDataObject = {};
	if (filter.status === 'waiting') {
		queryFilter.waitTill = true;
	} else if (filter.status !== 'all') {
		queryFilter.finished = filter.status === 'success';
	}

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
			queryFilter.status = ['failed', 'crashed'];
			break;
		case 'success':
			queryFilter.status = ['success'];
			break;
		case 'running':
			queryFilter.status = ['running'];
			break;
	}
	return queryFilter;
};
