import { range as _range } from 'lodash-es';
import type { IExecutionsSummary, ExecutionStatus, IDataObject } from 'n8n-workflow';
import type { ExecutionFilterType, ExecutionsQueryFilter } from '@/Interface';
import { isEmpty } from '@/utils/typesUtils';
import { findGaps } from '@/utils/arrayUtils';

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

export const mergeExecutionsAfterLoadingMore = (
	existingExecutions: IExecutionsSummary[],
	newExecutions: IExecutionsSummary[],
	activeExecution: IExecutionsSummary | null,
): {
	executions: IExecutionsSummary[];
	updateActiveExecution: IExecutionsSummary | null;
} => {
	const alreadyPresentExecutionIds = existingExecutions.map((exec) => parseInt(exec.id, 10));
	let lastId = 0;
	const gaps = [] as number[];
	let updatedActiveExecution: IExecutionsSummary | null = null;

	for (let i = newExecutions.length - 1; i >= 0; i--) {
		const currentItem = newExecutions[i];
		const currentId = parseInt(currentItem.id, 10);
		if (lastId !== 0 && !isNaN(currentId)) {
			if (currentId - lastId > 1) {
				const range = _range(lastId + 1, currentId);
				gaps.push(...range);
			}
		}
		lastId = parseInt(currentItem.id, 10) || 0;

		const executionIndex = alreadyPresentExecutionIds.indexOf(currentId);
		if (executionIndex !== -1) {
			const existingExecution = existingExecutions.find((ex) => ex.id === currentItem.id);
			const existingStillRunning =
				(existingExecution && existingExecution.finished === false) ||
				existingExecution?.stoppedAt === undefined;
			const currentFinished = currentItem.finished === true || currentItem.stoppedAt !== undefined;

			if (existingStillRunning && currentFinished) {
				existingExecutions[executionIndex] = currentItem;
				if (currentItem.id === activeExecution?.id) {
					updatedActiveExecution = currentItem;
				}
			}
			continue;
		}

		let j;
		for (j = existingExecutions.length - 1; j >= 0; j--) {
			if (currentId < parseInt(existingExecutions[j].id, 10)) {
				existingExecutions.splice(j + 1, 0, currentItem);
				break;
			}
		}
		if (j === -1) {
			existingExecutions.unshift(currentItem);
		}
	}

	return {
		executions: existingExecutions.filter(
			(execution) =>
				!gaps.includes(parseInt(execution.id, 10)) && lastId >= parseInt(execution.id, 10),
		),
		updateActiveExecution,
	};
};
