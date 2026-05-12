import { createTestingPinia } from '@pinia/testing';
import { CalendarDate } from '@internationalized/date';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { ref } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import ScheduleControlPanel from '@/features/execution/insights/schedule/components/ScheduleControlPanel.vue';
import type { ScheduleTriggerRow } from '@/features/execution/insights/schedule/lib/types';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		timezone: 'UTC',
	}),
}));

const createCustomRow = (overrides: Partial<ScheduleTriggerRow> = {}): ScheduleTriggerRow => ({
	triggerId: 'trigger-default',
	workflowId: 'workflow-default',
	workflowName: 'Workflow',
	triggerName: 'Trigger',
	projectName: null,
	workflowActive: true,
	triggerActive: true,
	triggerLogic: 'Every 1 day at 08:00',
	triggerSource: 'scheduleTrigger',
	effectiveTimezone: 'UTC',
	timezoneSource: 'instance',
	cronExpression: '0 0 8 * * *',
	nextActivation: '2025-01-01T08:00:00.000Z',
	firstActivationInRange: '2025-01-01T08:00:00.000Z',
	lastActivationInRange: '2025-01-01T08:00:00.000Z',
	activationsInRange: 1,
	...overrides,
});

const baseRows = [
	createCustomRow({
		triggerId: 'trigger-active',
		workflowId: 'workflow-active',
		workflowName: 'Published Workflow',
		triggerName: 'Primary Trigger',
		triggerLogic: 'Every 15 minutes',
		cronExpression: '0 */15 * * * *',
		nextActivation: '2025-01-01T00:15:00.000Z',
		firstActivationInRange: '2025-01-01T00:15:00.000Z',
		lastActivationInRange: '2025-01-01T01:00:00.000Z',
		activationsInRange: 4,
	}),
	createCustomRow({
		triggerId: 'trigger-unpublished',
		workflowId: 'workflow-unpublished',
		workflowName: 'Unpublished Workflow',
		triggerName: 'Hidden Workflow Trigger',
		workflowActive: false,
		triggerLogic: 'Every 1 day at 09:00',
		cronExpression: '0 0 9 * * *',
		nextActivation: '2025-01-01T09:00:00.000Z',
		firstActivationInRange: '2025-01-01T09:00:00.000Z',
		lastActivationInRange: '2025-01-01T09:00:00.000Z',
	}),
	createCustomRow({
		triggerId: 'trigger-disabled',
		workflowId: 'workflow-disabled',
		workflowName: 'Workflow With Disabled Trigger',
		triggerName: 'Disabled Trigger',
		triggerActive: false,
		triggerLogic: 'Every 1 day at 14:00',
		cronExpression: '0 0 14 * * *',
		nextActivation: null,
		firstActivationInRange: null,
		lastActivationInRange: null,
		activationsInRange: 0,
	}),
	createCustomRow({
		triggerId: 'trigger-zero-hit',
		workflowId: 'workflow-zero-hit',
		workflowName: 'Workflow With Zero Hits',
		triggerName: 'Zero Hit Trigger',
		triggerLogic: 'Every 1 day at 22:00',
		cronExpression: '0 0 22 * * *',
		nextActivation: null,
		firstActivationInRange: null,
		lastActivationInRange: null,
		activationsInRange: 0,
	}),
];

const baseHeatmapCells = [
	{
		slotStart: '2025-01-01T00:00:00.000Z',
		slotEnd: '2025-01-01T00:15:00.000Z',
		activationCount: 1,
		triggerCount: 1,
		triggers: [
			{
				triggerId: 'trigger-active',
				workflowId: 'workflow-active',
				workflowName: 'Published Workflow',
				triggerName: 'Primary Trigger',
				activationCount: 1,
			},
		],
	},
	{
		slotStart: '2025-01-01T00:15:00.000Z',
		slotEnd: '2025-01-01T00:30:00.000Z',
		activationCount: 0,
		triggerCount: 0,
		triggers: [],
	},
];

const mockScheduleData = {
	overview: ref({ trackedWorkflows: 4, scheduledActivations: 5, busiestSlotActivations: 1 }),
	rows: ref(structuredClone(baseRows)),
	historicalRows: ref([]),
	executionLoadState: ref(null),
	heatmapCells: ref(structuredClone(baseHeatmapCells)),
	dayPanels: ref([]),
	forecastWindow: ref({
		start: '2025-01-01T00:00:00.000Z',
		end: '2025-01-02T00:00:00.000Z',
		slotMinutes: 15,
	}),
	isLoading: ref(false),
	error: ref<string | null>(null),
};

vi.mock('@/features/execution/insights/schedule/composables/useScheduleData', () => ({
	useScheduleData: () => mockScheduleData,
}));

describe('ScheduleControlPanel', () => {
	const renderComponent = createComponentRenderer(ScheduleControlPanel, {
		pinia: createTestingPinia({
			initialState: {
				root: {
					timezone: 'UTC',
				},
			},
		}),
		global: {
			stubs: {
				RouterLink: {
					template: '<a><slot /></a>',
				},
			},
		},
	});

	beforeEach(() => {
		vi.useRealTimers();
		localStorage.clear();
		mockScheduleData.overview.value = {
			trackedWorkflows: 4,
			scheduledActivations: 5,
			busiestSlotActivations: 1,
		};
		mockScheduleData.rows.value = structuredClone(baseRows);
		mockScheduleData.historicalRows.value = [];
		mockScheduleData.executionLoadState.value = null;
		mockScheduleData.heatmapCells.value = structuredClone(baseHeatmapCells);
		mockScheduleData.dayPanels.value = [];
		mockScheduleData.forecastWindow.value = {
			start: '2025-01-01T00:00:00.000Z',
			end: '2025-01-02T00:00:00.000Z',
			slotMinutes: 15,
		};
		mockScheduleData.isLoading.value = false;
		mockScheduleData.error.value = null;
	});

	it('should filter table rows without changing the rendered timeline bars', async () => {
		renderComponent();
		const user = userEvent.setup();

		expect(screen.getByText('Published Workflow')).toBeInTheDocument();
		expect(screen.getByText('Unpublished Workflow')).toBeInTheDocument();
		expect(screen.getByText('Disabled Trigger')).toBeInTheDocument();
		expect(screen.getByText('Zero Hit Trigger')).toBeInTheDocument();

		const timelineBarCount = screen.getAllByTestId('schedule-timeline-bar').length;

		await user.click(screen.getByRole('button', { name: 'Open schedule settings' }));
		await user.click(screen.getByRole('checkbox', { name: 'Show unpublished workflows' }));
		await user.click(screen.getByRole('checkbox', { name: 'Show disabled triggers' }));
		await user.click(screen.getByRole('checkbox', { name: 'Show zero-hit rows' }));

		await waitFor(() => {
			expect(screen.queryByText('Unpublished Workflow')).not.toBeInTheDocument();
			expect(screen.queryByText('Disabled Trigger')).not.toBeInTheDocument();
			expect(screen.queryByText('Zero Hit Trigger')).not.toBeInTheDocument();
		});

		expect(screen.getByText('Published Workflow')).toBeInTheDocument();
		expect(screen.getAllByTestId('schedule-timeline-bar')).toHaveLength(timelineBarCount);
	});

	it('should show a filtered empty state when filters remove all table rows', async () => {
		mockScheduleData.rows.value = [
			createCustomRow({
				triggerId: 'trigger-hidden',
				workflowId: 'workflow-hidden',
				workflowName: 'Only Hidden Workflow',
				triggerName: 'Only Hidden Trigger',
				workflowActive: false,
				triggerActive: false,
				triggerLogic: 'Every 1 day at 18:00',
				cronExpression: '0 0 18 * * *',
				nextActivation: null,
				firstActivationInRange: null,
				lastActivationInRange: null,
				activationsInRange: 0,
			}),
		];

		renderComponent();
		const user = userEvent.setup();

		await user.click(screen.getByRole('button', { name: 'Open schedule settings' }));
		await user.click(screen.getByRole('checkbox', { name: 'Show unpublished workflows' }));

		await waitFor(() => {
			expect(
				screen.getByText('No scheduled triggers match the current table filters.'),
			).toBeInTheDocument();
		});
	});

	it('should switch to n8n mode, render historical day panels, and persist the chosen mode', async () => {
		mockScheduleData.overview.value = {
			trackedWorkflows: 2,
			scheduledActivations: 3,
			busiestSlotActivations: 2,
		};
		mockScheduleData.dayPanels.value = [
			{
				id: '2026-03-25T00:00:00.000Z',
				label: 'Wed, 25 Mar',
				heatmapCells: structuredClone(baseHeatmapCells),
			},
			{
				id: '2026-03-26T00:00:00.000Z',
				label: 'Thu, 26 Mar',
				heatmapCells: structuredClone(baseHeatmapCells),
			},
		];
		mockScheduleData.historicalRows.value = [
			{
				workflowId: 'workflow-active',
				workflowName: 'Published Workflow',
				projectName: null,
				workflowActive: true,
				triggerStatus: 'mixed',
				startsInRange: 3,
				firstStartedAt: '2026-03-25T08:00:00.000Z',
				lastStartedAt: '2026-03-26T10:15:00.000Z',
				enabledTriggerCount: 1,
				disabledTriggerCount: 1,
			},
		];
		renderComponent({
			props: {
				startDate: new CalendarDate(2026, 3, 25),
				endDate: new CalendarDate(2026, 4, 1),
			},
		});
		const user = userEvent.setup();

		await user.click(screen.getByTestId('schedule-mode-button-n8n'));

		await waitFor(() => {
			expect(screen.getAllByTestId('schedule-day-panel')).toHaveLength(2);
		});

		expect(screen.getByText('25 Mar - 1 Apr, 2026')).toBeInTheDocument();
		expect(screen.getByText('Published Workflow')).toBeInTheDocument();
		expect(screen.getByText('Mixed')).toBeInTheDocument();
		expect(localStorage.getItem('n8n.insights.schedule.rangeMode')).toBe('n8n');
	});

	it('should show a non-blocking warning when historical results are truncated by the fetch cap', async () => {
		mockScheduleData.dayPanels.value = [
			{
				id: '2026-03-25T00:00:00.000Z',
				label: 'Wed, 25 Mar',
				heatmapCells: structuredClone(baseHeatmapCells),
			},
		];
		mockScheduleData.executionLoadState.value = {
			isPartial: true,
			loadedExecutionCount: 2_000,
			maxExecutionCount: 2_000,
		};

		renderComponent({
			props: {
				startDate: new CalendarDate(2026, 3, 25),
				endDate: new CalendarDate(2026, 4, 1),
			},
		});
		const user = userEvent.setup();

		await user.click(screen.getByTestId('schedule-mode-button-n8n'));

		await waitFor(() => {
			expect(
				screen.getByText(
					'Historical schedule results are currently capped to the first 2,000 executions fetched for this range. Counts may be incomplete.',
				),
			).toBeInTheDocument();
		});
	});

	it('should render multi-day custom forecast panels in compact mode by default for 7 days', () => {
		mockScheduleData.dayPanels.value = Array.from({ length: 7 }, (_, index) => ({
			id: `2026-03-${25 + index}T00:00:00.000Z`,
			label: `Day ${index + 1}`,
			heatmapCells: structuredClone(baseHeatmapCells),
		}));
		mockScheduleData.forecastWindow.value = {
			start: '2026-03-25T00:00:00.000Z',
			end: '2026-04-01T00:00:00.000Z',
			slotMinutes: 15,
		};

		renderComponent();

		const dayPanels = screen.getAllByTestId('schedule-day-panel');
		expect(dayPanels).toHaveLength(7);
		for (const panel of dayPanels) {
			expect(panel).toHaveAttribute('data-compact', 'true');
		}
	});

	it('should render range-aware custom KPI labels while keeping the explanatory text hidden behind hints', () => {
		mockScheduleData.dayPanels.value = Array.from({ length: 7 }, (_, index) => ({
			id: `2026-03-${25 + index}T00:00:00.000Z`,
			label: `Day ${index + 1}`,
			heatmapCells: structuredClone(baseHeatmapCells),
		}));
		mockScheduleData.forecastWindow.value = {
			start: '2026-03-25T00:00:00.000Z',
			end: '2026-04-01T00:00:00.000Z',
			slotMinutes: 15,
		};

		renderComponent();

		expect(screen.getByText('Activations in forecast range')).toBeInTheDocument();
		expect(screen.getByText('Server time')).toBeInTheDocument();
		expect(screen.getByText('UTC time')).toBeInTheDocument();
		expect(
			screen.queryByText(
				'All scheduled trigger activations that fall inside the current custom forecast range.',
			),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText(
				'Highest predicted activation load inside a single quarter-hour slot across the current custom forecast range.',
			),
		).not.toBeInTheDocument();
		expect(
			screen.queryByText(
				'Custom forecast windows stay limited to 7 days so the per-day charts remain readable.',
			),
		).not.toBeInTheDocument();
	});

	it('should render range-aware custom table metadata and sort workflow groups by multi-day hits', () => {
		mockScheduleData.dayPanels.value = Array.from({ length: 7 }, (_, index) => ({
			id: `2026-03-${25 + index}T00:00:00.000Z`,
			label: `Day ${index + 1}`,
			heatmapCells: structuredClone(baseHeatmapCells),
		}));
		mockScheduleData.rows.value = [
			createCustomRow({
				triggerId: 'trigger-secondary',
				workflowId: 'workflow-secondary',
				workflowName: 'Secondary Workflow',
				triggerName: 'Secondary Trigger',
				triggerLogic: 'Every 1 day at 18:00',
				cronExpression: '0 0 18 * * *',
				nextActivation: '2025-01-01T18:00:00.000Z',
				firstActivationInRange: '2025-01-01T18:00:00.000Z',
				lastActivationInRange: '2025-01-02T18:00:00.000Z',
				activationsInRange: 2,
			}),
			createCustomRow({
				triggerId: 'trigger-primary',
				workflowId: 'workflow-primary',
				workflowName: 'Primary Workflow',
				triggerName: 'Primary Trigger',
				triggerLogic: 'Every 6 hours',
				cronExpression: '0 0 */6 * * *',
				nextActivation: '2025-01-01T06:00:00.000Z',
				firstActivationInRange: '2025-01-01T00:00:00.000Z',
				lastActivationInRange: '2025-01-03T18:00:00.000Z',
				activationsInRange: 12,
			}),
		];

		renderComponent();

		expect(screen.getByRole('columnheader', { name: 'Hits in range' })).toBeInTheDocument();
		expect(screen.getAllByText(/First .*• Last /)).toHaveLength(2);
		expect(screen.getAllByRole('row')[1]).toHaveTextContent('Primary Workflow');
	});

	it('should allow expanding a single multi-day panel while the others stay compact', async () => {
		mockScheduleData.dayPanels.value = Array.from({ length: 7 }, (_, index) => ({
			id: `2026-03-${25 + index}T00:00:00.000Z`,
			label: `Day ${index + 1}`,
			heatmapCells: structuredClone(baseHeatmapCells),
		}));

		renderComponent();
		const user = userEvent.setup();

		const dayPanels = screen.getAllByTestId('schedule-day-panel');
		expect(dayPanels[0]).toHaveAttribute('data-compact', 'true');
		expect(dayPanels[1]).toHaveAttribute('data-compact', 'true');

		await user.click(screen.getAllByTestId('schedule-day-panel-toggle')[0]);

		await waitFor(() => {
			expect(screen.getAllByTestId('schedule-day-panel')[0]).toHaveAttribute(
				'data-compact',
				'false',
			);
		});

		expect(screen.getAllByTestId('schedule-day-panel')[1]).toHaveAttribute('data-compact', 'true');
	});

	it('should restore remembered manual day-panel states after switching from compact back to manual', async () => {
		mockScheduleData.dayPanels.value = Array.from({ length: 7 }, (_, index) => ({
			id: `2026-03-${25 + index}T00:00:00.000Z`,
			label: `Day ${index + 1}`,
			heatmapCells: structuredClone(baseHeatmapCells),
		}));

		renderComponent();
		const user = userEvent.setup();

		await user.click(screen.getAllByTestId('schedule-day-panel-toggle')[0]);

		await waitFor(() => {
			expect(screen.getAllByTestId('schedule-day-panel')[0]).toHaveAttribute(
				'data-compact',
				'false',
			);
		});

		await user.click(screen.getByRole('button', { name: 'Open schedule settings' }));
		await user.click(screen.getByTestId('schedule-density-button-compact'));

		await waitFor(() => {
			for (const panel of screen.getAllByTestId('schedule-day-panel')) {
				expect(panel).toHaveAttribute('data-compact', 'true');
			}
		});

		await user.click(screen.getByTestId('schedule-density-button-manual'));

		await waitFor(() => {
			expect(screen.getAllByTestId('schedule-day-panel')[0]).toHaveAttribute(
				'data-compact',
				'false',
			);
		});

		expect(screen.getAllByTestId('schedule-day-panel')[1]).toHaveAttribute('data-compact', 'true');
	});

	it('should persist custom real-time mode and render timezone data in a dedicated column', async () => {
		mockScheduleData.rows.value = [
			createCustomRow({
				triggerId: 'trigger-timezone',
				workflowId: 'workflow-timezone',
				workflowName: 'Timezone Workflow',
				triggerName: 'Timezone Trigger',
				triggerLogic: 'Every 1 day at 08:03',
				effectiveTimezone: 'America/New_York',
				timezoneSource: 'workflow',
				cronExpression: '0 3 8 * * *',
				nextActivation: '2025-01-01T13:03:00.000Z',
				firstActivationInRange: '2025-01-01T13:03:00.000Z',
				lastActivationInRange: '2025-01-01T13:03:00.000Z',
			}),
		];
		mockScheduleData.executionLoadState.value = {
			isPartial: true,
			loadedExecutionCount: 2_000,
			maxExecutionCount: 2_000,
		};

		renderComponent();
		const user = userEvent.setup();

		await user.click(screen.getByRole('button', { name: 'Real-time' }));

		expect(localStorage.getItem('n8n.insights.schedule.customTimeMode')).toBe('realTime');
		expect(screen.getByRole('columnheader', { name: /Timezone/ })).toBeInTheDocument();
		expect(
			screen.getByText(
				'Real-time results are currently capped to the first 2,000 executions fetched for this range. Completed slots may be incomplete.',
			),
		).toBeInTheDocument();
		expect(screen.getByText('EST (-5)')).toBeInTheDocument();
		expect(screen.queryByText(/Instance send time/)).not.toBeInTheDocument();
	});

	it('should highlight the current slot in custom calculated and real-time charts', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2025-01-01T00:07:00.000Z'));

		renderComponent();
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

		expect(screen.getAllByTestId('schedule-timeline-bar')[0]).toHaveAttribute(
			'data-current-slot',
			'true',
		);

		await user.click(screen.getByRole('button', { name: 'Real-time' }));

		expect(screen.getAllByTestId('schedule-timeline-bar')[0]).toHaveAttribute(
			'data-current-slot',
			'true',
		);
	});

	it('should highlight the current slot in n8n charts when the current day is visible', async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2025-01-01T00:07:00.000Z'));
		mockScheduleData.dayPanels.value = [
			{
				id: '2025-01-01T00:00:00.000Z',
				label: 'Wed, 01 Jan',
				heatmapCells: structuredClone(baseHeatmapCells),
			},
		];

		renderComponent({
			props: {
				startDate: new CalendarDate(2025, 1, 1),
				endDate: new CalendarDate(2025, 1, 1),
			},
		});
		const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

		await user.click(screen.getByTestId('schedule-mode-button-n8n'));

		await waitFor(() => {
			expect(screen.getAllByTestId('schedule-day-panel')).toHaveLength(1);
		});

		const currentDayBar = screen
			.getAllByTestId('schedule-day-panel')[0]
			.querySelector('[data-test-id="schedule-timeline-bar"]');

		expect(currentDayBar).not.toBeNull();
		expect(currentDayBar?.className).toMatch(/chartBarColumnCurrent/);
	});
});
