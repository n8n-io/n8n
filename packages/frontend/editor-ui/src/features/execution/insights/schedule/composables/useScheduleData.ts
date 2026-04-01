import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import type { DateValue } from '@internationalized/date';
import { ref, watch, type Ref } from 'vue';
import {
	buildScheduleTimelineData,
	buildScheduleOverview,
	buildScheduleTriggerDefinitions,
	SUPPORTED_SCHEDULE_NODE_TYPES,
} from '../lib/schedule.utils';
import type { ScheduleHeatmapCell, ScheduleOverviewStats, ScheduleTriggerRow } from '../lib/types';

const EMPTY_SCHEDULE_OVERVIEW: ScheduleOverviewStats = {
	trackedWorkflows: 0,
	scheduledActivations: 0,
	busiestSlotActivations: 0,
};

const EMPTY_SCHEDULE_ROWS: ScheduleTriggerRow[] = [];
const EMPTY_HEATMAP_CELLS: ScheduleHeatmapCell[] = [];
const DAY_SLOT_MINUTES = 15;
const DAY_SLOT_COUNT = 96;

const getCurrentUtcDayWindow = (now: Date) => {
	const start = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
	);
	const end = new Date(start.getTime() + DAY_SLOT_COUNT * DAY_SLOT_MINUTES * 60_000);

	return { start, end };
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

export const useScheduleData = ({
	startDate: _startDate,
	endDate: _endDate,
	projectId,
}: {
	startDate: Ref<DateValue | undefined>;
	endDate: Ref<DateValue | undefined>;
	projectId: Ref<string | undefined>;
}) => {
	const workflowsListStore = useWorkflowsListStore();
	const overview = ref<ScheduleOverviewStats>({ ...EMPTY_SCHEDULE_OVERVIEW });
	const rows = ref<ScheduleTriggerRow[]>([...EMPTY_SCHEDULE_ROWS]);
	const heatmapCells = ref<ScheduleHeatmapCell[]>([...EMPTY_HEATMAP_CELLS]);
	const forecastWindow = ref<{ start: string; end: string; slotMinutes: number } | null>(null);
	const isLoading = ref(false);
	const error = ref<string | null>(null);

	const initializeDayWindow = (now: Date) => {
		const { start, end } = getCurrentUtcDayWindow(now);
		const { heatmapCells: emptyHeatmap } = buildScheduleTimelineData([], {
			start,
			end,
			slotMinutes: DAY_SLOT_MINUTES,
		});

		forecastWindow.value = {
			start: start.toISOString(),
			end: end.toISOString(),
			slotMinutes: DAY_SLOT_MINUTES,
		};
		heatmapCells.value = emptyHeatmap;

		return { start, end };
	};

	const resetData = () => {
		overview.value = { ...EMPTY_SCHEDULE_OVERVIEW };
		rows.value = [...EMPTY_SCHEDULE_ROWS];
	};

	const load = async () => {
		const now = new Date();
		const { start: timelineStart, end: timelineEnd } = initializeDayWindow(now);
		resetData();
		isLoading.value = true;
		error.value = null;

		try {
			const scheduledWorkflows = await searchScheduledWorkflows(
				workflowsListStore,
				projectId.value,
			);

			const scheduleTriggers = buildScheduleTriggerDefinitions(scheduledWorkflows);
			const timelineData = buildScheduleTimelineData(scheduleTriggers, {
				start: timelineStart,
				end: timelineEnd,
				slotMinutes: DAY_SLOT_MINUTES,
				upcomingFrom: now,
			});

			heatmapCells.value = timelineData.heatmapCells;
			overview.value = buildScheduleOverview(scheduleTriggers, timelineData.heatmapCells);
			rows.value = timelineData.rows.sort((left, right) => {
				return (
					left.workflowName.localeCompare(right.workflowName) ||
					Number(right.workflowActive) - Number(left.workflowActive) ||
					Number(right.triggerActive) - Number(left.triggerActive) ||
					(left.startTime ?? '').localeCompare(right.startTime ?? '') ||
					right.activationsInRange - left.activationsInRange ||
					left.triggerName.localeCompare(right.triggerName)
				);
			});
		} catch (loadError) {
			resetData();
			error.value = loadError instanceof Error ? loadError.message : 'Unable to load schedule data';
		} finally {
			isLoading.value = false;
		}
	};

	watch(
		[projectId],
		() => {
			void load();
		},
		{ immediate: true },
	);

	return {
		overview,
		rows,
		heatmapCells,
		forecastWindow,
		isLoading,
		error,
	};
};
