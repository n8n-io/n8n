import { defineComponent, reactive } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import InsightsDashboard from './InsightsDashboard.vue';
import { createTestingPinia } from '@pinia/testing';
import { defaultSettings } from '@/__tests__/defaults';
import { useInsightsStore } from '@/features/execution/insights/insights.store';
import {
	mockedStore,
	type MockedStore,
	useEmitters,
	waitAllPromises,
	getDropdownItems,
} from '@/__tests__/utils';
import { within, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createProjectListItem } from '@/features/collaboration/projects/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type {
	FrontendModuleSettings,
	InsightsByTime,
	InsightsByWorkflow,
	InsightsSummaryType,
} from '@n8n/api-types';
import { INSIGHT_TYPES } from '@/features/execution/insights/insights.constants';
import type { InsightsSummaryDisplay } from '@/features/execution/insights/insights.types';
import { vi } from 'vitest';

const { emitters, addEmitter } = useEmitters<'n8nDataTableServer'>();

const mockRoute = reactive<{
	params: {
		insightType: InsightsSummaryType;
	};
}>({
	params: { insightType: INSIGHT_TYPES.TOTAL },
});
vi.mock('vue-router', () => ({
	useRoute: () => mockRoute,
	useRouter: vi.fn(),
	RouterLink: vi.fn(),
}));

vi.mock('vue-chartjs', () => ({
	Bar: {
		template: '<div>Bar</div>',
	},
	Line: {
		template: '<div>Line</div>',
	},
}));

vi.mock('@n8n/design-system', async (importOriginal) => {
	const original = await importOriginal<object>();
	return {
		...original,
		N8nDataTableServer: defineComponent({
			props: {
				headers: { type: Array, required: true },
				items: { type: Array, required: true },
				itemsLength: { type: Number, required: true },
			},
			setup(_, { emit }) {
				addEmitter('n8nDataTableServer', emit);
			},
			template: '<div data-test-id="insights-table"><slot /></div>',
		}),
	};
});

const mockTelemetry = {
	track: vi.fn(),
};

vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: () => mockTelemetry,
}));

const renderComponent = createComponentRenderer(InsightsDashboard);

const moduleSettings: FrontendModuleSettings = {
	insights: {
		summary: true,
		dashboard: true,
		dateRanges: [
			{
				key: 'day',
				licensed: true,
				granularity: 'hour',
			},
			{
				key: 'week',
				licensed: true,
				granularity: 'day',
			},
			{
				key: 'month',
				licensed: true,
				granularity: 'day',
			},
			{
				key: 'quarter',
				licensed: false,
				granularity: 'week',
			},
		],
	},
};

const mockSummaryData: InsightsSummaryDisplay = [
	{
		id: 'total',
		value: 1250,
		deviation: 15,
		unit: '',
		deviationUnit: '%',
	},
	{
		id: 'failed',
		value: 23,
		deviation: -8,
		unit: '',
		deviationUnit: '%',
	},
	{
		id: 'failureRate',
		value: 1.84,
		deviation: -0.5,
		unit: '%',
		deviationUnit: '%',
	},
	{
		id: 'timeSaved',
		value: 3600,
		deviation: 20,
		unit: 's',
		deviationUnit: '%',
	},
	{
		id: 'averageRunTime',
		value: 15,
		deviation: 2,
		unit: 's',
		deviationUnit: '%',
	},
];

const mockChartsData: InsightsByTime[] = [
	{
		date: '2024-01-01',
		values: {
			total: 100,
			failed: 5,
			failureRate: 5,
			timeSaved: 45,
			averageRunTime: 12,
			succeeded: 95,
		},
	},
	{
		date: '2024-01-02',
		values: {
			total: 120,
			failed: 8,
			failureRate: 6.7,
			timeSaved: 55,
			averageRunTime: 15,
			succeeded: 112,
		},
	},
];

const mockTableData: InsightsByWorkflow = {
	count: 2,
	data: [
		{
			workflowId: 'workflow-1',
			workflowName: 'Test Workflow 1',
			total: 100,
			failed: 5,
			failureRate: 5,
			timeSaved: 45,
			averageRunTime: 12,
			projectId: 'project-1',
			projectName: 'Test Project 1',
			succeeded: 95,
			runTime: 1200,
		},
		{
			workflowId: 'workflow-2',
			workflowName: 'Test Workflow 2',
			total: 50,
			failed: 2,
			failureRate: 4,
			timeSaved: 20,
			averageRunTime: 8,
			projectId: 'project-2',
			projectName: 'Test Project 2',
			succeeded: 48,
			runTime: 400,
		},
	],
};

let insightsStore: MockedStore<typeof useInsightsStore>;
let projectsStore: MockedStore<typeof useProjectsStore>;

const personalProject = createProjectListItem('personal');
const teamProjects = Array.from({ length: 2 }, () => createProjectListItem('team'));
const projects = [personalProject, ...teamProjects];
const date = new Date(2000, 11, 19);

// Test helper constants
const DEFAULT_DATE_RANGE = {
	startDate: '2000-12-13T00:00:00.000Z',
	endDate: '2000-12-19T00:00:00.000Z',
};

const SINGLE_DAY_RANGE = {
	startDate: '2000-12-19T00:00:00.000Z',
	endDate: '2000-12-19T00:00:00.000Z',
};

const DEFAULT_TABLE_PARAMS = {
	skip: 0,
	take: 25,
};

// Helper functions
const expectStoreExecutions = (params: {
	summary?: object;
	charts?: object;
	table?: object;
}) => {
	if (params.summary) {
		expect(insightsStore.summary.execute).toHaveBeenCalledWith(0, params.summary);
	}
	if (params.charts) {
		expect(insightsStore.charts.execute).toHaveBeenCalledWith(0, params.charts);
	}
	if (params.table) {
		expect(insightsStore.table.execute).toHaveBeenCalledWith(0, params.table);
	}
};

const openDatePicker = async (getByText: (text: string, options?: object) => HTMLElement) => {
	const trigger = getByText('13 Dec - 19 Dec, 2000', { selector: 'button' });
	expect(trigger).toBeInTheDocument();
	await userEvent.click(trigger);

	const controllingId = trigger.getAttribute('aria-controls');
	expect(controllingId).toBeDefined();

	const picker = document.getElementById(controllingId as string);
	expect(picker).toBeInTheDocument();

	return picker as HTMLElement;
};

const selectProject = async (projectName: string | null) => {
	const projectSelect = screen.getByTestId('project-sharing-select');
	await userEvent.click(projectSelect);

	const projectSelectDropdownItems = await getDropdownItems(projectSelect);
	const teamProject = [...projectSelectDropdownItems].find(
		(item) => item.querySelector('p')?.textContent?.trim() === projectName,
	);
	expect(teamProject).toBeDefined();
	await userEvent.click(teamProject as Element);
};

describe('InsightsDashboard', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.setSystemTime(date);

		mockRoute.params.insightType = INSIGHT_TYPES.TOTAL;

		createTestingPinia({
			initialState: { settings: { settings: defaultSettings, moduleSettings } },
		});

		insightsStore = mockedStore(useInsightsStore);
		projectsStore = mockedStore(useProjectsStore);

		insightsStore.isSummaryEnabled = true;
		insightsStore.isDashboardEnabled = true;

		// Mock projects store
		projectsStore.availableProjects = projects;
		projectsStore.getAvailableProjects = vi.fn().mockResolvedValue(projects);

		// Mock async states
		insightsStore.summary = {
			state: mockSummaryData,
			isLoading: false,
			execute: vi.fn(),
			isReady: true,
			error: null,
			then: vi.fn(),
		};

		insightsStore.charts = {
			state: mockChartsData,
			isLoading: false,
			execute: vi.fn(),
			isReady: true,
			error: null,
			then: vi.fn(),
		};

		insightsStore.table = {
			state: mockTableData,
			isLoading: false,
			execute: vi.fn(),
			isReady: true,
			error: null,
			then: vi.fn(),
		};
	});

	describe('Component Rendering', () => {
		it('should render without error', () => {
			expect(() =>
				renderComponent({
					props: { insightType: INSIGHT_TYPES.TOTAL },
				}),
			).not.toThrow();
			expect(document.title).toBe('Insights - n8n');
			expect(screen.getByRole('heading', { level: 2, name: 'Insights' })).toBeInTheDocument();
		});

		it('should render summary when enabled', () => {
			renderComponent({
				props: { insightType: INSIGHT_TYPES.TOTAL },
			});
			expect(screen.getByTestId('insights-summary-tabs')).toBeInTheDocument();
		});

		it('should not render summary when disabled', () => {
			insightsStore.isSummaryEnabled = false;
			renderComponent({
				props: { insightType: INSIGHT_TYPES.TOTAL },
			});
			expect(screen.queryByTestId('insights-summary-tabs')).not.toBeInTheDocument();
		});

		it('should render chart and table when dashboard enabled', async () => {
			renderComponent({
				props: { insightType: INSIGHT_TYPES.TOTAL },
			});

			await waitFor(() => {
				expect(screen.getByTestId('insights-chart-total')).toBeInTheDocument();
				expect(screen.getByTestId('insights-table')).toBeInTheDocument();
			});
		});

		it('should render chart when in time saved route even if dashboard disabled', async () => {
			insightsStore.isDashboardEnabled = false;
			mockRoute.params.insightType = INSIGHT_TYPES.TIME_SAVED;
			renderComponent({
				props: { insightType: INSIGHT_TYPES.TIME_SAVED },
			});
			await waitFor(() => {
				expect(screen.getByTestId('insights-chart-time-saved')).toBeInTheDocument();
			});
		});

		it('should render paywall when dashboard disabled and not time saved route', async () => {
			insightsStore.isDashboardEnabled = false;
			renderComponent({
				props: { insightType: INSIGHT_TYPES.TOTAL },
			});

			await waitFor(() => {
				expect(screen.queryByTestId('insights-chart-total')).not.toBeInTheDocument();
				expect(screen.queryByTestId('insights-table')).not.toBeInTheDocument();
				expect(
					screen.getByRole('heading', {
						level: 4,
						name: 'Upgrade to access more detailed insights',
					}),
				).toBeInTheDocument();
			});
		});
	});

	describe('Date Range Selection', () => {
		it('should update the selected time range', async () => {
			const { getByText } = renderComponent({
				props: { insightType: INSIGHT_TYPES.TOTAL },
			});

			const picker = await openDatePicker(getByText);
			const dayOption = within(picker).getByText('Last 24 hours');
			await userEvent.click(dayOption);

			expect(mockTelemetry.track).toHaveBeenCalledWith('User updated insights time range', {
				end_date: SINGLE_DAY_RANGE.endDate,
				start_date: SINGLE_DAY_RANGE.startDate,
				range_length_days: 1,
				type: 'preset',
			});

			expectStoreExecutions({
				summary: SINGLE_DAY_RANGE,
				charts: SINGLE_DAY_RANGE,
				table: {
					...DEFAULT_TABLE_PARAMS,
					sortBy: 'total:desc',
					...SINGLE_DAY_RANGE,
				},
			});
		});

		it('should show upgrade modal when unlicensed time range selected ', async () => {
			const { getByText } = renderComponent({
				props: { insightType: INSIGHT_TYPES.TOTAL },
			});

			const picker = await openDatePicker(getByText);
			const dayOption = within(picker).getByText('Last 90 days');
			await userEvent.click(dayOption);

			expect(mockTelemetry.track).not.toHaveBeenCalled();
			expect(
				screen.getByText(/Viewing this time period requires an enterprise plan/),
			).toBeVisible();
		});
	});

	describe('Component Lifecycle', () => {
		it('should execute data fetching on mount', () => {
			renderComponent({
				props: { insightType: INSIGHT_TYPES.TOTAL },
			});

			expectStoreExecutions({
				summary: DEFAULT_DATE_RANGE,
				charts: DEFAULT_DATE_RANGE,
				table: {
					...DEFAULT_TABLE_PARAMS,
					sortBy: 'total:desc',
					...DEFAULT_DATE_RANGE,
				},
			});
		});

		it('should refetch data when insight type changes', async () => {
			const { rerender } = renderComponent({
				props: { insightType: INSIGHT_TYPES.TOTAL },
			});

			vi.clearAllMocks();
			await rerender({ insightType: INSIGHT_TYPES.FAILED });

			expectStoreExecutions({
				summary: DEFAULT_DATE_RANGE,
				charts: DEFAULT_DATE_RANGE,
				table: {
					...DEFAULT_TABLE_PARAMS,
					sortBy: 'failed:desc',
					...DEFAULT_DATE_RANGE,
				},
			});
		});

		it('should update sort order when insight type changes', async () => {
			const { rerender } = renderComponent({
				props: { insightType: INSIGHT_TYPES.TOTAL },
			});

			await rerender({ insightType: INSIGHT_TYPES.TIME_SAVED });

			expectStoreExecutions({
				table: {
					...DEFAULT_TABLE_PARAMS,
					sortBy: 'timeSaved:desc',
					...DEFAULT_DATE_RANGE,
				},
			});
		});
	});

	describe('Chart wrapper', () => {
		test.each([
			[INSIGHT_TYPES.TOTAL, 'insights-chart-total'],
			[INSIGHT_TYPES.FAILED, 'insights-chart-failed'],
			[INSIGHT_TYPES.FAILURE_RATE, 'insights-chart-failure-rate'],
			[INSIGHT_TYPES.TIME_SAVED, 'insights-chart-time-saved'],
			[INSIGHT_TYPES.AVERAGE_RUN_TIME, 'insights-chart-average-runtime'],
		])('should render %s chart component', async (type, testId) => {
			renderComponent({
				props: { insightType: type },
			});
			await waitFor(() => {
				expect(screen.getByTestId(testId)).toBeInTheDocument();
			});
		});
	});

	describe('Table Functionality', () => {
		it('should handle table pagination', async () => {
			renderComponent({
				props: { insightType: INSIGHT_TYPES.TOTAL },
			});

			await waitAllPromises();

			emitters.n8nDataTableServer.emit('update:options', {
				page: 1,
				itemsPerPage: 50,
				sortBy: [{ id: 'total', desc: true }],
			});

			expectStoreExecutions({
				table: {
					skip: 50,
					take: 50,
					sortBy: 'total:desc',
					...DEFAULT_DATE_RANGE,
				},
			});
		});

		it('should handle table sorting', async () => {
			renderComponent({
				props: { insightType: INSIGHT_TYPES.TOTAL },
			});

			await waitAllPromises();

			await waitFor(() => {
				emitters.n8nDataTableServer.emit('update:options', {
					page: 0,
					itemsPerPage: 25,
					sortBy: [{ id: 'failed', desc: false }],
				});
			});

			expectStoreExecutions({
				table: {
					...DEFAULT_TABLE_PARAMS,
					sortBy: 'failed:asc',
					...DEFAULT_DATE_RANGE,
				},
			});
		});

		it('should handle empty sort array', async () => {
			renderComponent({
				props: { insightType: INSIGHT_TYPES.TOTAL },
			});

			await waitAllPromises();

			await waitFor(() => {
				emitters.n8nDataTableServer.emit('update:options', {
					page: 0,
					itemsPerPage: 25,
					sortBy: [],
				});
			});

			expectStoreExecutions({
				table: {
					...DEFAULT_TABLE_PARAMS,
					sortBy: undefined,
					...DEFAULT_DATE_RANGE,
				},
			});
		});
	});

	describe('Project Filter Functionality', () => {
		it('should render project sharing component', async () => {
			renderComponent({
				props: { insightType: INSIGHT_TYPES.TOTAL },
			});

			await waitFor(() => {
				expect(screen.getByTestId('project-sharing-select')).toBeInTheDocument();
			});
		});

		it('should select a project and filter data by project ID', async () => {
			renderComponent({
				props: { insightType: INSIGHT_TYPES.TOTAL },
			});

			await waitFor(() => {
				expect(screen.getByTestId('project-sharing-select')).toBeInTheDocument();
			});

			await selectProject(teamProjects[0].name);

			const projectId = teamProjects[0].id;
			expectStoreExecutions({
				summary: { ...DEFAULT_DATE_RANGE, projectId },
				charts: { ...DEFAULT_DATE_RANGE, projectId },
				table: {
					...DEFAULT_TABLE_PARAMS,
					sortBy: 'total:desc',
					...DEFAULT_DATE_RANGE,
					projectId,
				},
			});
		});

		it('should combine project filter with date range changes', async () => {
			const { getByText } = renderComponent({
				props: { insightType: INSIGHT_TYPES.TOTAL },
			});

			await selectProject(teamProjects[0].name);
			vi.clearAllMocks();

			const picker = await openDatePicker(getByText);
			const dayOption = within(picker).getByText('Last 24 hours');
			await userEvent.click(dayOption);

			const projectId = teamProjects[0].id;
			expectStoreExecutions({
				summary: { ...SINGLE_DAY_RANGE, projectId },
				charts: { ...SINGLE_DAY_RANGE, projectId },
				table: {
					...DEFAULT_TABLE_PARAMS,
					sortBy: 'total:desc',
					...SINGLE_DAY_RANGE,
					projectId,
				},
			});
		});

		it('should maintain project filter when insight type changes', async () => {
			const { rerender } = renderComponent({
				props: { insightType: INSIGHT_TYPES.TOTAL },
			});

			await selectProject(teamProjects[0].name);
			vi.clearAllMocks();

			await rerender({ insightType: INSIGHT_TYPES.FAILED });

			const projectId = teamProjects[0].id;
			expectStoreExecutions({
				summary: { ...DEFAULT_DATE_RANGE, projectId },
				charts: { ...DEFAULT_DATE_RANGE, projectId },
				table: {
					...DEFAULT_TABLE_PARAMS,
					sortBy: 'failed:desc',
					...DEFAULT_DATE_RANGE,
					projectId,
				},
			});
		});

		it('should pass project ID to table pagination and sorting events', async () => {
			renderComponent({
				props: { insightType: INSIGHT_TYPES.TOTAL },
			});

			await selectProject(teamProjects[0].name);
			await waitAllPromises();
			vi.clearAllMocks();

			emitters.n8nDataTableServer.emit('update:options', {
				page: 1,
				itemsPerPage: 50,
				sortBy: [{ id: 'failed', desc: true }],
			});

			expectStoreExecutions({
				table: {
					skip: 50,
					take: 50,
					sortBy: 'failed:desc',
					...DEFAULT_DATE_RANGE,
					projectId: teamProjects[0].id,
				},
			});
		});
	});
});
