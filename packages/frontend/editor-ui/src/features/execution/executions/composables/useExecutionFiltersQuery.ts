import { onScopeDispose, watch } from 'vue';
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

export function useExecutionFiltersQuery(workflowId?: () => string | undefined) {
	const route = useRoute();
	const router = useRouter();
	const executionsStore = useExecutionsStore();
	let active = true;
	let requestId = 0;
	onScopeDispose(() => {
		active = false;
		requestId++;
	});

	function parseFilters(rawFilters: typeof route.query.executionFilters): ExecutionFilterType {
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
		const currentWorkflowId = workflowId?.();
		if (currentWorkflowId) {
			if (filters.workflowId !== 'all' && filters.workflowId !== currentWorkflowId) {
				filters.workflowVersionId = 'all';
			}
			filters.workflowId = currentWorkflowId;
		}
		return filters;
	}

	const rawFilters = route.query.executionFilters;
	const restorePreviousFilters =
		rawFilters === undefined &&
		JSON.stringify(executionsStore.filters) !== JSON.stringify(getDefaultExecutionFilters());
	if (rawFilters !== undefined) {
		executionsStore.setFilters(parseFilters(rawFilters));
	} else if (workflowId?.() && executionsStore.filters.workflowId !== workflowId()) {
		executionsStore.setFilters({
			...executionsStore.filters,
			workflowId: workflowId() ?? 'all',
			workflowVersionId: 'all',
		});
	}

	async function restoreQuery() {
		if (restorePreviousFilters && active) {
			await router.replace({
				query: { ...route.query, executionFilters: JSON.stringify(executionsStore.filters) },
			});
		}
	}

	async function initialize() {
		const currentRequest = ++requestId;
		const currentWorkflowId = workflowId?.();
		const isCurrent = () =>
			active && currentRequest === requestId && workflowId?.() === currentWorkflowId;
		if (isCurrent()) await executionsStore.initialize(currentWorkflowId, isCurrent);
	}

	async function updateFilters(newFilters: ExecutionFilterType, targetWorkflowId?: string) {
		if (!active) return;
		executionsStore.reset();
		executionsStore.setFilters(newFilters);
		await router.replace({
			query: { ...route.query, executionFilters: JSON.stringify(newFilters) },
		});
		if (active && workflowId?.() === targetWorkflowId) await initialize();
	}

	watch(
		() => route.query.executionFilters,
		(raw) => {
			if (!active) return;
			const filters = parseFilters(raw);
			if (JSON.stringify(filters) === JSON.stringify(executionsStore.filters)) return;
			executionsStore.reset();
			executionsStore.setFilters(filters);
			void initialize();
		},
	);

	if (workflowId) {
		watch(workflowId, (id, previousId) => {
			if (!id || id === previousId) return;
			void updateFilters(
				{ ...executionsStore.filters, workflowId: id, workflowVersionId: 'all' },
				id,
			);
		});
	}

	return { restoreQuery, initialize, updateFilters, isActive: () => active };
}
