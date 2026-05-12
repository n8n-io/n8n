import { CalendarDate } from '@internationalized/date';
import { waitFor } from '@testing-library/vue';
import { ref } from 'vue';
import { vi } from 'vitest';
import { SCHEDULE_TRIGGER_NODE_TYPE } from '../lib/schedule.utils';
import { useScheduleData } from './useScheduleData';

const searchWorkflowsMock = vi.fn();
const fetchWorkflowMock = vi.fn();
const makeRestApiRequestMock = vi.fn();
const mockRootStore = {
	restApiContext: {},
	timezone: 'UTC',
};

vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: () => ({
		searchWorkflows: searchWorkflowsMock,
		fetchWorkflow: fetchWorkflowMock,
	}),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => mockRootStore,
}));

vi.mock('@n8n/rest-api-client', () => ({
	makeRestApiRequest: (...args: unknown[]) => makeRestApiRequestMock(...args),
}));

const createScheduledWorkflowSummary = () => ({
	id: 'workflow-a',
	name: 'Workflow A',
	active: true,
	homeProject: null,
});

const createScheduledWorkflowDetail = () => ({
	id: 'workflow-a',
	name: 'Workflow A',
	active: true,
	homeProject: null,
	settings: {
		timezone: 'UTC',
	},
	nodes: [
		{
			id: 'trigger-node',
			name: 'Schedule Trigger',
			type: SCHEDULE_TRIGGER_NODE_TYPE,
			parameters: {
				rule: {
					interval: [
						{
							field: 'days',
							daysInterval: 1,
							triggerAtHour: 8,
							triggerAtMinute: 0,
						},
					],
				},
			},
		},
	],
});

const createQuarterHourWorkflowDetail = () => ({
	id: 'workflow-a',
	name: 'Workflow A',
	active: true,
	homeProject: null,
	settings: {
		timezone: 'UTC',
	},
	nodes: [
		{
			id: 'trigger-node',
			name: 'Schedule Trigger',
			type: SCHEDULE_TRIGGER_NODE_TYPE,
			parameters: {
				rule: {
					interval: [
						{
							field: 'minutes',
							minutesInterval: 15,
						},
					],
				},
			},
		},
	],
});

const createExecutionSummary = ({
	id,
	mode,
	startedAt,
}: {
	id: string;
	mode: 'trigger' | 'manual' | 'webhook';
	startedAt: string;
}) => ({
	id,
	finished: true,
	mode,
	status: 'success' as const,
	startedAt,
	createdAt: startedAt,
	workflowId: 'workflow-a',
	scopes: [],
});

const createExecutionsPage = (
	results: Array<ReturnType<typeof createExecutionSummary>>,
	count = results.length,
) => ({
	count,
	results,
	estimated: false,
	concurrentExecutionsCount: 0,
});

describe('useScheduleData', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
		mockRootStore.timezone = 'UTC';
		searchWorkflowsMock.mockResolvedValue([createScheduledWorkflowSummary()]);
		fetchWorkflowMock.mockResolvedValue(createScheduledWorkflowDetail());
	});

	it('should accept the native last-7-days insights range even when it spans eight calendar days', async () => {
		makeRestApiRequestMock.mockResolvedValue(createExecutionsPage([], 0));

		const scheduleData = useScheduleData({
			startDate: ref(new CalendarDate(2026, 3, 25)),
			endDate: ref(new CalendarDate(2026, 4, 1)),
			projectId: ref(undefined),
			rangeMode: ref('n8n'),
			customWindowPreset: ref('today'),
			customTimeMode: ref('calculated'),
		});

		await waitFor(() => {
			expect(scheduleData.isLoading.value).toBe(false);
		});

		expect(scheduleData.error.value).toBeNull();
		expect(scheduleData.dayPanels.value).toHaveLength(8);
		expect(scheduleData.dayPanels.value[0]?.heatmapCells).toHaveLength(96);
	});

	it('should keep only trigger-mode executions in historical v1 counts', async () => {
		makeRestApiRequestMock.mockResolvedValue(
			createExecutionsPage([
				createExecutionSummary({
					id: 'execution-trigger',
					mode: 'trigger',
					startedAt: '2026-03-25T08:02:00.000Z',
				}),
				createExecutionSummary({
					id: 'execution-manual',
					mode: 'manual',
					startedAt: '2026-03-25T08:04:00.000Z',
				}),
				createExecutionSummary({
					id: 'execution-webhook',
					mode: 'webhook',
					startedAt: '2026-03-25T08:06:00.000Z',
				}),
			]),
		);

		const scheduleData = useScheduleData({
			startDate: ref(new CalendarDate(2026, 3, 25)),
			endDate: ref(new CalendarDate(2026, 3, 25)),
			projectId: ref(undefined),
			rangeMode: ref('n8n'),
			customWindowPreset: ref('today'),
			customTimeMode: ref('calculated'),
		});

		await waitFor(() => {
			expect(scheduleData.isLoading.value).toBe(false);
		});

		expect(scheduleData.historicalRows.value).toHaveLength(1);
		expect(scheduleData.historicalRows.value[0]?.startsInRange).toBe(1);
		expect(
			scheduleData.dayPanels.value[0]?.heatmapCells.reduce(
				(total, cell) => total + cell.activationCount,
				0,
			),
		).toBe(1);
	});

	it('should surface a partial historical-load state when the execution fetch exceeds the frontend cap', async () => {
		let pageCallCount = 0;
		makeRestApiRequestMock.mockImplementation(() => {
			pageCallCount += 1;
			return Promise.resolve(
				createExecutionsPage(
					Array.from({ length: 100 }, (_, index) =>
						createExecutionSummary({
							id: `execution-${pageCallCount}-${index}`,
							mode: 'trigger',
							startedAt: '2026-03-25T08:02:00.000Z',
						}),
					),
					2_500,
				),
			);
		});

		const scheduleData = useScheduleData({
			startDate: ref(new CalendarDate(2026, 3, 25)),
			endDate: ref(new CalendarDate(2026, 3, 26)),
			projectId: ref(undefined),
			rangeMode: ref('n8n'),
			customWindowPreset: ref('today'),
			customTimeMode: ref('calculated'),
		});

		await waitFor(() => {
			expect(scheduleData.isLoading.value).toBe(false);
		});

		expect(scheduleData.executionLoadState.value).toEqual({
			isPartial: true,
			loadedExecutionCount: 2_000,
			maxExecutionCount: 2_000,
		});
		expect(pageCallCount).toBe(20);
	});

	it('should merge actual executions into completed custom slots in real-time mode', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.setSystemTime(new Date('2026-03-25T08:20:00.000Z'));
		fetchWorkflowMock.mockResolvedValue(createQuarterHourWorkflowDetail());
		makeRestApiRequestMock.mockResolvedValue(
			createExecutionsPage([
				createExecutionSummary({
					id: 'execution-trigger',
					mode: 'trigger',
					startedAt: '2026-03-25T08:02:00.000Z',
				}),
				createExecutionSummary({
					id: 'execution-manual',
					mode: 'manual',
					startedAt: '2026-03-25T08:04:00.000Z',
				}),
			]),
		);

		const scheduleData = useScheduleData({
			startDate: ref(undefined),
			endDate: ref(undefined),
			projectId: ref(undefined),
			rangeMode: ref('custom'),
			customWindowPreset: ref('today'),
			customTimeMode: ref('realTime'),
		});

		await waitFor(() => {
			expect(scheduleData.isLoading.value).toBe(false);
		});

		const completedSlot = scheduleData.dayPanels.value[0]?.heatmapCells.find(
			(cell) => cell.slotStart === '2026-03-25T08:00:00.000Z',
		);
		const currentSlot = scheduleData.dayPanels.value[0]?.heatmapCells.find(
			(cell) => cell.slotStart === '2026-03-25T08:15:00.000Z',
		);

		expect(completedSlot).toMatchObject({
			activationCount: 1,
			triggerCount: 1,
			triggers: [
				{
					workflowName: 'Workflow A',
					triggerName: 'Actual executions',
					activationCount: 1,
				},
			],
		});
		expect(currentSlot).toMatchObject({
			activationCount: 1,
			triggerCount: 1,
			triggers: [
				{
					workflowName: 'Workflow A',
					triggerName: 'Schedule Trigger',
					activationCount: 1,
				},
			],
		});
		expect(scheduleData.executionLoadState.value).toEqual({
			isPartial: false,
			loadedExecutionCount: 2,
			maxExecutionCount: 2_000,
		});
	});

	it('should keep the next-7-days custom window forecast-only even if real-time mode is selected', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.setSystemTime(new Date('2026-03-25T08:20:00.000Z'));

		const scheduleData = useScheduleData({
			startDate: ref(undefined),
			endDate: ref(undefined),
			projectId: ref(undefined),
			rangeMode: ref('custom'),
			customWindowPreset: ref('nextSevenDays'),
			customTimeMode: ref('realTime'),
		});

		await waitFor(() => {
			expect(scheduleData.isLoading.value).toBe(false);
		});

		expect(makeRestApiRequestMock).not.toHaveBeenCalled();
		expect(scheduleData.executionLoadState.value).toBeNull();
	});

	it('should build custom today windows from the instance timezone instead of UTC midnight', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		vi.setSystemTime(new Date('2026-04-01T15:47:00.000Z'));
		mockRootStore.timezone = 'America/New_York';

		const scheduleData = useScheduleData({
			startDate: ref(undefined),
			endDate: ref(undefined),
			projectId: ref(undefined),
			rangeMode: ref('custom'),
			customWindowPreset: ref('today'),
			customTimeMode: ref('calculated'),
		});

		await waitFor(() => {
			expect(scheduleData.isLoading.value).toBe(false);
		});

		expect(scheduleData.forecastWindow.value).toMatchObject({
			start: '2026-04-01T04:00:00.000Z',
			end: '2026-04-02T04:00:00.000Z',
			slotMinutes: 15,
		});
		expect(scheduleData.dayPanels.value[0]).toMatchObject({
			label: 'Wed, 01 Apr',
		});
		expect(scheduleData.dayPanels.value[0]?.heatmapCells[0]?.slotStart).toBe(
			'2026-04-01T04:00:00.000Z',
		);
	});
});
