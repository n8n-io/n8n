import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import type { DateValue } from '@internationalized/date';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { DateTime } from 'luxon';
import { ref, watch, type Ref } from 'vue';
import {
	buildScheduleDayPanelsFromTimelineCells,
	mergeScheduleTimelineActuals,
	buildScheduleHistoricalWorkflowRows,
	buildScheduleHistoricalTimelineData,
	buildScheduleTimelineData,
	buildScheduleOverview,
	buildScheduleTriggerDefinitions,
	SUPPORTED_SCHEDULE_NODE_TYPES,
} from '../lib/schedule.utils';
import type {
	ExecutionSummaryWithScopes,
	IExecutionsListResponse,
} from '@/features/execution/executions/executions.types';
import type {
	ScheduleCustomTimeMode,
	ScheduleCustomWindowPreset,
	ScheduleDayPanel,
	ScheduleExecutionLoadState,
	ScheduleHeatmapCell,
	ScheduleHistoricalWorkflowRow,
	ScheduleOverviewStats,
	ScheduleRangeMode,
	ScheduleTriggerRow,
} from '../lib/types';

const EMPTY_SCHEDULE_OVERVIEW: ScheduleOverviewStats = {
	trackedWorkflows: 0,
	scheduledActivations: 0,
	busiestSlotActivations: 0,
};

const EMPTY_SCHEDULE_ROWS: ScheduleTriggerRow[] = [];
const EMPTY_HISTORICAL_ROWS: ScheduleHistoricalWorkflowRow[] = [];
const EMPTY_HEATMAP_CELLS: ScheduleHeatmapCell[] = [];
const DAY_SLOT_MINUTES = 15;
const MAX_CUSTOM_DAY_PANELS = 7;
const MAX_N8N_DAY_PANELS = 8;
const EXECUTIONS_PAGE_SIZE = 100;
const HISTORICAL_EXECUTION_MAX_PAGES = 20;
const MAX_HISTORICAL_EXECUTION_COUNT = EXECUTIONS_PAGE_SIZE * HISTORICAL_EXECUTION_MAX_PAGES;
const SCHEDULE_HISTORICAL_EXECUTION_MODE = 'trigger';

const normalizeInstanceTimeZone = (value: string | undefined) => {
	const normalizedValue = value?.trim() ?? '';
	return normalizedValue !== '' && DateTime.now().setZone(normalizedValue).isValid
		? normalizedValue
		: 'UTC';
};

const formatDayWindowLabel = (dayStart: DateTime) =>
	dayStart.setLocale('en-GB').toFormat('ccc, dd LLL');

const buildDayWindow = (dayStart: DateTime) => {
	const dayEnd = dayStart.plus({ days: 1 });

	return {
		id: dayStart.toUTC().toISO() ?? dayStart.toUTC().toJSDate().toISOString(),
		start: dayStart.toUTC().toJSDate(),
		end: dayEnd.toUTC().toJSDate(),
		label: formatDayWindowLabel(dayStart),
	};
};

const buildZonedDayWindows = (startDate: DateValue, endDate: DateValue, timeZone: string) => {
	const windows: Array<{ id: string; start: Date; end: Date; label: string }> = [];

	let currentStart = DateTime.fromISO(startDate.toString(), { zone: timeZone }).startOf('day');
	const finalStart = DateTime.fromISO(endDate.toString(), { zone: timeZone }).startOf('day');

	while (currentStart.toMillis() <= finalStart.toMillis()) {
		windows.push(buildDayWindow(currentStart));
		currentStart = currentStart.plus({ days: 1 });
	}

	return windows;
};

const getCurrentSlotStart = (now: Date, timeZone: string) => {
	const zonedNow = DateTime.fromJSDate(now, { zone: timeZone });
	const flooredMinute = Math.floor(zonedNow.minute / DAY_SLOT_MINUTES) * DAY_SLOT_MINUTES;

	return zonedNow
		.set({
			minute: flooredMinute,
			second: 0,
			millisecond: 0,
		})
		.toUTC()
		.toJSDate();
};

const buildCustomDayWindows = (now: Date, preset: ScheduleCustomWindowPreset, timeZone: string) => {
	const todayStart = DateTime.fromJSDate(now, { zone: timeZone }).startOf('day');

	if (preset === 'nextSevenDays') {
		return Array.from({ length: MAX_CUSTOM_DAY_PANELS }, (_, index) =>
			buildDayWindow(todayStart.plus({ days: index })),
		);
	}

	if (preset === 'todayPlusMinusThree') {
		return Array.from({ length: MAX_CUSTOM_DAY_PANELS }, (_, index) =>
			buildDayWindow(todayStart.plus({ days: index - 3 })),
		);
	}

	return [buildDayWindow(todayStart)];
};

const mapExecutionSummaryToHistoricalExecution = (
	execution: ExecutionSummaryWithScopes,
	scheduledWorkflowIds: Set<string>,
	workflowNameById: Map<string, string>,
) => {
	if (execution.mode !== SCHEDULE_HISTORICAL_EXECUTION_MODE) {
		return null;
	}

	if (typeof execution.workflowId !== 'string' || !scheduledWorkflowIds.has(execution.workflowId)) {
		return null;
	}

	return {
		executionId: execution.id,
		workflowId: execution.workflowId,
		workflowName: workflowNameById.get(execution.workflowId) ?? 'Unknown workflow',
		startedAt: execution.startedAt,
	};
};

const searchScheduledWorkflows = async (
	workflowsListStore: ReturnType<typeof useWorkflowsListStore>,
	projectId?: string,
) => {
	const select = ['id', 'name', 'active', 'homeProject', 'isArchived'];
	const baseFilter = {
		projectId,
		select,
		isArchived: false,
	};

	const workflows = await workflowsListStore.searchWorkflows({
		...baseFilter,
		nodeTypes: [...SUPPORTED_SCHEDULE_NODE_TYPES],
	});

	const fallbackWorkflows =
		workflows.length > 0
			? workflows
			: await workflowsListStore.searchWorkflows({
					...baseFilter,
					triggerNodeTypes: [...SUPPORTED_SCHEDULE_NODE_TYPES],
				});

	return await Promise.all(
		fallbackWorkflows.map(async (workflow) => {
			const detailedWorkflow = await workflowsListStore.fetchWorkflow(workflow.id);

			return {
				...workflow,
				...detailedWorkflow,
				homeProject: workflow.homeProject ?? detailedWorkflow.homeProject ?? null,
				active: workflow.active ?? detailedWorkflow.active ?? false,
				name: workflow.name ?? detailedWorkflow.name,
			};
		}),
	);
};

const fetchExecutionHistory = async (
	restApiContext: ReturnType<typeof useRootStore>['restApiContext'],
	options: { start: Date; end: Date; projectId?: string },
) => {
	const results: ExecutionSummaryWithScopes[] = [];
	let lastId: string | undefined;
	let totalMatchingExecutions = 0;

	for (let pageIndex = 0; pageIndex < HISTORICAL_EXECUTION_MAX_PAGES; pageIndex++) {
		const page = await makeRestApiRequest<IExecutionsListResponse>(
			restApiContext,
			'GET',
			'/executions',
			{
				filter: {
					startedAfter: options.start.toISOString(),
					startedBefore: options.end.toISOString(),
					...(options.projectId ? { projectId: options.projectId } : {}),
				},
				limit: EXECUTIONS_PAGE_SIZE,
				...(lastId ? { lastId } : {}),
			},
		);

		totalMatchingExecutions = Math.max(totalMatchingExecutions, page.count);

		results.push(...page.results);

		if (page.results.length < EXECUTIONS_PAGE_SIZE) {
			break;
		}

		if (pageIndex === HISTORICAL_EXECUTION_MAX_PAGES - 1) {
			break;
		}

		lastId = page.results.at(-1)?.id;
		if (!lastId) {
			break;
		}
	}

	return {
		results,
		isPartial: totalMatchingExecutions > results.length,
		maxExecutionCount: MAX_HISTORICAL_EXECUTION_COUNT,
		loadedExecutionCount: results.length,
	};
};

export const useScheduleData = ({
	startDate,
	endDate,
	projectId,
	rangeMode,
	customWindowPreset,
	customTimeMode,
}: {
	startDate: Ref<DateValue | undefined>;
	endDate: Ref<DateValue | undefined>;
	projectId: Ref<string | undefined>;
	rangeMode: Ref<ScheduleRangeMode>;
	customWindowPreset: Ref<ScheduleCustomWindowPreset>;
	customTimeMode: Ref<ScheduleCustomTimeMode>;
}) => {
	const workflowsListStore = useWorkflowsListStore();
	const rootStore = useRootStore();
	const overview = ref<ScheduleOverviewStats>({ ...EMPTY_SCHEDULE_OVERVIEW });
	const rows = ref<ScheduleTriggerRow[]>([...EMPTY_SCHEDULE_ROWS]);
	const historicalRows = ref<ScheduleHistoricalWorkflowRow[]>([...EMPTY_HISTORICAL_ROWS]);
	const executionLoadState = ref<ScheduleExecutionLoadState | null>(null);
	const heatmapCells = ref<ScheduleHeatmapCell[]>([...EMPTY_HEATMAP_CELLS]);
	const dayPanels = ref<ScheduleDayPanel[]>([]);
	const forecastWindow = ref<{ start: string; end: string; slotMinutes: number } | null>(null);
	const isLoading = ref(false);
	const error = ref<string | null>(null);

	const resetData = () => {
		overview.value = { ...EMPTY_SCHEDULE_OVERVIEW };
		rows.value = [...EMPTY_SCHEDULE_ROWS];
		historicalRows.value = [...EMPTY_HISTORICAL_ROWS];
		executionLoadState.value = null;
		dayPanels.value = [];
		forecastWindow.value = null;
		heatmapCells.value = [...EMPTY_HEATMAP_CELLS];
	};

	const loadCustom = async () => {
		const now = new Date();
		const instanceTimezone = normalizeInstanceTimeZone(rootStore.timezone);
		const customDayWindows = buildCustomDayWindows(now, customWindowPreset.value, instanceTimezone);
		const timelineStart = customDayWindows[0].start;
		const timelineEnd = customDayWindows[customDayWindows.length - 1].end;
		const currentSlotStart = getCurrentSlotStart(now, instanceTimezone);
		const effectiveCustomTimeMode =
			customWindowPreset.value === 'nextSevenDays' ? 'calculated' : customTimeMode.value;

		forecastWindow.value = {
			start: timelineStart.toISOString(),
			end: timelineEnd.toISOString(),
			slotMinutes: DAY_SLOT_MINUTES,
		};

		const scheduledWorkflows = await searchScheduledWorkflows(workflowsListStore, projectId.value);

		const scheduleTriggers = buildScheduleTriggerDefinitions(scheduledWorkflows, {
			instanceTimezone: instanceTimezone,
		});
		const predictedTimelineData = buildScheduleTimelineData(scheduleTriggers, {
			start: timelineStart,
			end: timelineEnd,
			slotMinutes: DAY_SLOT_MINUTES,
			upcomingFrom: now,
		});
		let renderedHeatmapCells = predictedTimelineData.heatmapCells;

		if (effectiveCustomTimeMode === 'realTime') {
			const workflowNameById = new Map(
				scheduledWorkflows.map((workflow) => [workflow.id, workflow.name]),
			);
			const scheduledWorkflowIds = new Set(scheduleTriggers.map((trigger) => trigger.workflowId));
			const actualExecutionEnd = new Date(
				Math.min(currentSlotStart.getTime(), timelineEnd.getTime()),
			);

			if (actualExecutionEnd.getTime() > timelineStart.getTime()) {
				const executionHistory = await fetchExecutionHistory(rootStore.restApiContext, {
					start: timelineStart,
					end: actualExecutionEnd,
					projectId: projectId.value,
				});
				executionLoadState.value = {
					isPartial: executionHistory.isPartial,
					loadedExecutionCount: executionHistory.loadedExecutionCount,
					maxExecutionCount: executionHistory.maxExecutionCount,
				};

				const actualExecutions = executionHistory.results
					.map((execution) =>
						mapExecutionSummaryToHistoricalExecution(
							execution,
							scheduledWorkflowIds,
							workflowNameById,
						),
					)
					.filter((execution): execution is NonNullable<typeof execution> => execution !== null);

				const actualTimelineCells = buildScheduleHistoricalTimelineData(actualExecutions, {
					start: timelineStart,
					end: timelineEnd,
					slotMinutes: DAY_SLOT_MINUTES,
					triggerName: 'Actual executions',
				});

				renderedHeatmapCells = mergeScheduleTimelineActuals(
					predictedTimelineData.heatmapCells,
					actualTimelineCells,
					currentSlotStart,
				);
			}
		}
		const customDayPanels = buildScheduleDayPanelsFromTimelineCells(
			customDayWindows,
			renderedHeatmapCells,
		);

		dayPanels.value = customDayPanels;
		heatmapCells.value = customDayPanels[0]?.heatmapCells ?? [];
		overview.value = buildScheduleOverview(
			scheduleTriggers,
			customDayPanels.flatMap((panel) => panel.heatmapCells),
		);
		rows.value = predictedTimelineData.rows.sort((left, right) => {
			return (
				left.workflowName.localeCompare(right.workflowName) ||
				Number(right.workflowActive) - Number(left.workflowActive) ||
				Number(right.triggerActive) - Number(left.triggerActive) ||
				(left.nextActivation ?? '').localeCompare(right.nextActivation ?? '') ||
				right.activationsInRange - left.activationsInRange ||
				left.triggerName.localeCompare(right.triggerName)
			);
		});
	};

	const loadHistorical = async () => {
		if (!startDate.value || !endDate.value) {
			resetData();
			return;
		}

		const instanceTimezone = normalizeInstanceTimeZone(rootStore.timezone);
		const dayWindows = buildZonedDayWindows(startDate.value, endDate.value, instanceTimezone);
		if (dayWindows.length === 0) {
			resetData();
			return;
		}

		if (dayWindows.length > MAX_N8N_DAY_PANELS) {
			resetData();
			error.value = 'Select a range up to 8 calendar days to view the historical schedule charts.';
			return;
		}

		const scheduledWorkflows = await searchScheduledWorkflows(workflowsListStore, projectId.value);
		const scheduleTriggers = buildScheduleTriggerDefinitions(scheduledWorkflows, {
			instanceTimezone: instanceTimezone,
		});
		const workflowNameById = new Map(
			scheduledWorkflows.map((workflow) => [workflow.id, workflow.name]),
		);
		const scheduledWorkflowIds = new Set(scheduleTriggers.map((trigger) => trigger.workflowId));
		const historicalRangeStart = dayWindows[0].start;
		const historicalRangeEnd = new Date(
			Math.min(dayWindows[dayWindows.length - 1].end.getTime(), Date.now()),
		);

		const executionHistory = await fetchExecutionHistory(rootStore.restApiContext, {
			start: historicalRangeStart,
			end: historicalRangeEnd,
			projectId: projectId.value,
		});
		executionLoadState.value = {
			isPartial: executionHistory.isPartial,
			loadedExecutionCount: executionHistory.loadedExecutionCount,
			maxExecutionCount: executionHistory.maxExecutionCount,
		};

		const historicalExecutions = executionHistory.results
			.map((execution) =>
				mapExecutionSummaryToHistoricalExecution(execution, scheduledWorkflowIds, workflowNameById),
			)
			.filter((execution): execution is NonNullable<typeof execution> => execution !== null);

		const historicalTimelineCells = buildScheduleHistoricalTimelineData(historicalExecutions, {
			start: dayWindows[0].start,
			end: dayWindows[dayWindows.length - 1].end,
			slotMinutes: DAY_SLOT_MINUTES,
		});

		dayPanels.value = buildScheduleDayPanelsFromTimelineCells(dayWindows, historicalTimelineCells);
		heatmapCells.value = dayPanels.value[0]?.heatmapCells ?? [];

		overview.value = buildScheduleOverview(
			scheduleTriggers,
			dayPanels.value.flatMap((panel) => panel.heatmapCells),
		);
		historicalRows.value = buildScheduleHistoricalWorkflowRows(
			scheduleTriggers,
			historicalExecutions,
		);
	};

	const load = async () => {
		resetData();
		isLoading.value = true;
		error.value = null;

		try {
			if (rangeMode.value === 'n8n') {
				await loadHistorical();
			} else {
				await loadCustom();
			}
		} catch (loadError) {
			resetData();
			error.value = loadError instanceof Error ? loadError.message : 'Unable to load schedule data';
		} finally {
			isLoading.value = false;
		}
	};

	watch(
		[projectId, startDate, endDate, rangeMode, customWindowPreset, customTimeMode],
		() => {
			void load();
		},
		{ immediate: true },
	);

	return {
		overview,
		rows,
		historicalRows,
		executionLoadState,
		heatmapCells,
		dayPanels,
		forecastWindow,
		isLoading,
		error,
	};
};
