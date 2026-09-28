import { useRoute, useRouter } from 'vue-router';
import { z } from 'zod';
import { useExecutionsStore } from '../executions.store';
import type { ExecutionFilterType } from '../executions.types';
import { getDefaultExecutionFilters } from '../executions.utils';

const filterSchema = z
	.object({
		status: z.enum(['all', 'error', 'canceled', 'new', 'running', 'success', 'waiting']),
		workflowId: z.string(),
		startDate: z.string(),
		endDate: z.string(),
		annotationTags: z.array(z.string()),
		vote: z.enum(['all', 'up', 'down']),
		metadata: z.array(
			z.object({ key: z.string(), value: z.string(), exactMatch: z.boolean().optional() }),
		),
		workflowVersionId: z.string(),
	})
	.partial();

function parseDate(value?: string): Date | '' {
	if (!value) return '';
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? '' : date;
}

export function useExecutionFiltersQuery() {
	const route = useRoute();
	const router = useRouter();
	const executionsStore = useExecutionsStore();

	const rawFilters = route.query.executionFilters;
	const restorePreviousFilters =
		rawFilters === undefined &&
		JSON.stringify(executionsStore.filters) !== JSON.stringify(getDefaultExecutionFilters());
	if (rawFilters !== undefined) {
		let filters = getDefaultExecutionFilters();
		try {
			if (typeof rawFilters === 'string') {
				const parsed = filterSchema.safeParse(JSON.parse(rawFilters));
				if (parsed.success) {
					filters = {
						...filters,
						...parsed.data,
						startDate: parseDate(parsed.data.startDate),
						endDate: parseDate(parsed.data.endDate),
					};
				}
			}
		} catch {
			// Ignore invalid filter links.
		}
		executionsStore.setFilters(filters);
	}

	async function restoreQuery() {
		if (restorePreviousFilters) {
			await router.replace({
				query: { ...route.query, executionFilters: JSON.stringify(executionsStore.filters) },
			});
		}
	}

	async function updateFilters(newFilters: ExecutionFilterType, workflowId?: string) {
		executionsStore.reset();
		executionsStore.setFilters(newFilters);
		await router.replace({
			query: { ...route.query, executionFilters: JSON.stringify(newFilters) },
		});
		await executionsStore.initialize(workflowId);
	}

	return { restoreQuery, updateFilters };
}
