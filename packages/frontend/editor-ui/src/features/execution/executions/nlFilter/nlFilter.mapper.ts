import type { ExecutionFilterType } from '../executions.types';
import { getDefaultExecutionFilters } from '../executions.utils';
import type { NlExecutionFilterAiResponse } from './nlFilter.types';

export type NlMapperWorkflow = { id: string; name: string };

function isIsoDateString(value: string): boolean {
	const parsed = Date.parse(value);
	if (Number.isNaN(parsed)) return false;
	// A loose check that the string at least looks like an ISO-8601 date.
	return /^\d{4}-\d{2}-\d{2}T/.test(value);
}

function resolveWorkflowId(
	response: NlExecutionFilterAiResponse,
	workflows: NlMapperWorkflow[],
): ExecutionFilterType['workflowId'] {
	if (response.workflowId) {
		const match = workflows.find((wf) => wf.id === response.workflowId);
		if (match) return match.id;
	}

	if (response.workflowName) {
		const target = response.workflowName.trim().toLowerCase();
		const match = workflows.find((wf) => wf.name.trim().toLowerCase() === target);
		if (match) return match.id;
	}

	return 'all';
}

/**
 * Pure mapper: validated AI response → ExecutionFilterType.
 * Unknown workflow references and malformed dates are silently ignored
 * (we keep the default for that field). The caller decides how to surface
 * partial misses to the user.
 */
export function aiResponseToExecutionFilter(
	response: NlExecutionFilterAiResponse,
	workflows: NlMapperWorkflow[],
): ExecutionFilterType {
	const filter = getDefaultExecutionFilters();

	if (response.status) {
		filter.status = response.status;
	}

	filter.workflowId = resolveWorkflowId(response, workflows);

	if (response.startedAfter && isIsoDateString(response.startedAfter)) {
		filter.startDate = response.startedAfter;
	}

	if (response.startedBefore && isIsoDateString(response.startedBefore)) {
		filter.endDate = response.startedBefore;
	}

	return filter;
}
