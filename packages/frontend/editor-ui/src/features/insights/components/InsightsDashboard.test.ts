import { defineComponent, reactive } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import InsightsDashboard from './InsightsDashboard.vue';
import { createTestingPinia } from '@pinia/testing';
import { defaultSettings } from '@/__tests__/defaults';
import { useInsightsStore } from '@/features/insights/insights.store';
import {
	mockedStore,
	type MockedStore,
	useEmitters,
	waitAllPromises,
	getDropdownItems,
} from '@/__tests__/utils';
import { within, screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createProjectListItem } from '@/features/projects/__tests__/utils';
import { useProjectsStore } from '@/features/projects/projects.store';
import type {
	FrontendModuleSettings,
	InsightsByTime,
	InsightsByWorkflow,
	InsightsSummaryType,
} from '@n8n/api-types';
import { INSIGHT_TYPES } from '@/features/insights/insights.constants';
import type { InsightsSummaryDisplay } from '@/features/insights/insights.types';
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

describe('InsightsDashboard', () => {
	beforeEach(() => {
		vi.clearAllMocks();

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
			renderComponent({
				props: { insightType: INSIGHT_TYPES.TOTAL },
			});

			expect(screen.getByTestId('range-select')).toBeVisible();
			const select = within(screen.getByTestId('range-select')).getByRole('combobox');
			await userEvent.click(select);

			const controllingId = select.getAttribute('aria-controls');
			const actions = document.querySelector(`#${controllingId}`);
			if (!actions) {
				throw new Error('Actions menu not found');
			}

			await userEvent.click(actions.querySelectorAll('li')[0]);
			expect((select as HTMLInputElement).value).toBe('Last 24 hours');

			expect(mockTelemetry.track).toHaveBeenCalledWith('User updated insights time range', {
				range: 1,
			});

			expect(insightsStore.summary.execute).toHaveBeenCalledWith(0, { dateRange: 'day' });
			expect(insightsStore.charts.execute).toHaveBeenCalledWith(0, { dateRange: 'day' });
			expect(insightsStore.table.execute).toHaveBeenCalledWith(0, {
				skip: 0,
				take: 25,
				sortBy: 'total:desc',
				dateRange: 'day',
			});
		});

		it('should show upgrade modal when unlicensed time range selected ', async () => {
			renderComponent({
				props: { insightType: INSIGHT_TYPES.TOTAL },
			});

			expect(screen.getByTestId('range-select')).toBeVisible();
			const select = within(screen.getByTestId('range-select')).getByRole('combobox');
			await userEvent.click(select);

			const controllingId = select.getAttribute('aria-controls');
			const actions = document.querySelector(`#${controllingId}`);
			if (!actions) {
				throw new Error('Actions menu not found');
			}

			// Select a range that requires an enterprise plan
			await userEvent.click(actions.querySelectorAll('li')[3]);

			// Verify the select value is remained the original, default value, as unlicensed options should not change the selection
			expect((select as HTMLInputElement).value).toBe('Last 7 days');

			expect(mockTelemetry.track).not.toHaveBeenCalled();
			expect(insightsStore.summary.execute).toHaveBeenCalledWith(0, { dateRange: 'week' });
			expect(insightsStore.charts.execute).toHaveBeenCalledWith(0, { dateRange: 'week' });
			expect(insightsStore.table.execute).toHaveBeenCalledWith(0, {
				skip: 0,
				take: 25,
				sortBy: 'total:desc',
				dateRange: 'week',
			});

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

			expect(insightsStore.summary.execute).toHaveBeenCalledWith(0, { dateRange: 'week' });
			expect(insightsStore.charts.execute).toHaveBeenCalledWith(0, { dateRange: 'week' });
			expect(insightsStore.table.execute).toHaveBeenCalledWith(0, {
				skip: 0,
				take: 25,
				sortBy: 'total:desc',
				dateRange: 'week',
			});
		});

		it('should refetch data when insight type changes', async () => {
			const { rerender } = renderComponent({
				props: { insightType: INSIGHT_TYPES.TOTAL },
			});

			vi.clearAllMocks();

			await rerender({ insightType: INSIGHT_TYPES.FAILED });

			expect(insightsStore.summary.execute).toHaveBeenCalledWith(0, { dateRange: 'week' });
			expect(insightsStore.charts.execute).toHaveBeenCalledWith(0, { dateRange: 'week' });
			expect(insightsStore.table.execute).toHaveBeenCalledWith(0, {
				skip: 0,
				take: 25,
				sortBy: 'failed:desc',
				dateRange: 'week',
			});
		});

		it('should update sort order when insight type changes', async () => {
			const { rerender } = renderComponent({
				props: { insightType: INSIGHT_TYPES.TOTAL },
			});

			await rerender({ insightType: INSIGHT_TYPES.TIME_SAVED });

			expect(insightsStore.table.execute).toHaveBeenCalledWith(0, {
				skip: 0,
				take: 25,
				sortBy: 'timeSaved:desc',
				dateRange: 'week',
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

			// Simulate pagination event
			emitters.n8nDataTableServer.emit('update:options', {
				page: 1,
				itemsPerPage: 50,
				sortBy: [{ id: 'total', desc: true }],
			});

			expect(insightsStore.table.execute).toHaveBeenCalledWith(0, {
				skip: 50,
				take: 50,
				sortBy: 'total:desc',
				dateRange: 'week',
			});
		});

		it('should handle table sorting', async () => {
			renderComponent({
				props: { insightType: INSIGHT_TYPES.TOTAL },
			});

			await waitAllPromises();

			// Simulate sort event
			emitters.n8nDataTableServer.emit('update:options', {
				page: 0,
				itemsPerPage: 25,
				sortBy: [{ id: 'failed', desc: false }],
			});

			expect(insightsStore.table.execute).toHaveBeenCalledWith(0, {
				skip: 0,
				take: 25,
				sortBy: 'failed:asc',
				dateRange: 'week',
			});
		});

		it('should handle empty sort array', async () => {
			renderComponent({
				props: { insightType: INSIGHT_TYPES.TOTAL },
			});

			await waitAllPromises();

			// Simulate event with no sortBy
			emitters.n8nDataTableServer.emit('update:options', {
				page: 0,
				itemsPerPage: 25,
				sortBy: [],
			});

			expect(insightsStore.table.execute).toHaveBeenCalledWith(0, {
				skip: 0,
				take: 25,
				sortBy: undefined,
				dateRange: 'week',
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

			const projectSelect = screen.getByTestId('project-sharing-select');

			// Click to open the dropdown
			await userEvent.click(projectSelect);

			// Get dropdown items
			const projectSelectDropdownItems = await getDropdownItems(projectSelect);
			expect(projectSelectDropdownItems.length).toBeGreaterThan(0);

			// Find and click the first team project
			const teamProject = [...projectSelectDropdownItems].find(
				(item) => item.querySelector('p')?.textContent?.trim() === teamProjects[0].name,
			);
			expect(teamProject).toBeDefined();

			await userEvent.click(teamProject as Element);

			// Verify that all data fetching methods were called with the selected project ID
			expect(insightsStore.summary.execute).toHaveBeenCalledWith(0, {
				dateRange: 'week',
				projectId: teamProjects[0].id,
			});
			expect(insightsStore.charts.execute).toHaveBeenCalledWith(0, {
				dateRange: 'week',
				projectId: teamProjects[0].id,
			});
			expect(insightsStore.table.execute).toHaveBeenCalledWith(0, {
				skip: 0,
				take: 25,
				sortBy: 'total:desc',
				dateRange: 'week',
				projectId: teamProjects[0].id,
			});
		});

		it('should combine project filter with date range changes', async () => {
			renderComponent({
				props: { insightType: INSIGHT_TYPES.TOTAL },
			});

			// Select a project first
			const projectSelect = screen.getByTestId('project-sharing-select');
			await userEvent.click(projectSelect);
			const projectSelectDropdownItems = await getDropdownItems(projectSelect);
			const teamProject = [...projectSelectDropdownItems].find(
				(item) => item.querySelector('p')?.textContent?.trim() === teamProjects[0].name,
			);
			await userEvent.click(teamProject as Element);

			// Clear previous calls
			vi.clearAllMocks();

			// Now change the date range
			const dateRangeSelect = within(screen.getByTestId('range-select')).getByRole('combobox');
			await userEvent.click(dateRangeSelect);

			const controllingId = dateRangeSelect.getAttribute('aria-controls');
			const actions = document.querySelector(`#${controllingId}`);
			if (!actions) {
				throw new Error('Actions menu not found');
			}

			// Select the first option (day range)
			await userEvent.click(actions.querySelectorAll('li')[0]);

			// Verify both project ID and new date range are passed
			expect(insightsStore.summary.execute).toHaveBeenCalledWith(0, {
				dateRange: 'day',
				projectId: teamProjects[0].id,
			});
			expect(insightsStore.charts.execute).toHaveBeenCalledWith(0, {
				dateRange: 'day',
				projectId: teamProjects[0].id,
			});
			expect(insightsStore.table.execute).toHaveBeenCalledWith(0, {
				skip: 0,
				take: 25,
				sortBy: 'total:desc',
				dateRange: 'day',
				projectId: teamProjects[0].id,
			});
		});

		it('should maintain project filter when insight type changes', async () => {
			const { rerender } = renderComponent({
				props: { insightType: INSIGHT_TYPES.TOTAL },
			});

			// Select a project
			const projectSelect = screen.getByTestId('project-sharing-select');
			await userEvent.click(projectSelect);
			const projectSelectDropdownItems = await getDropdownItems(projectSelect);
			const teamProject = [...projectSelectDropdownItems].find(
				(item) => item.querySelector('p')?.textContent?.trim() === teamProjects[0].name,
			);
			await userEvent.click(teamProject as Element);

			// Clear previous calls
			vi.clearAllMocks();

			// Change insight type
			await rerender({ insightType: INSIGHT_TYPES.FAILED });

			// Verify the project ID is still passed with the new insight type
			expect(insightsStore.summary.execute).toHaveBeenCalledWith(0, {
				dateRange: 'week',
				projectId: teamProjects[0].id,
			});
			expect(insightsStore.charts.execute).toHaveBeenCalledWith(0, {
				dateRange: 'week',
				projectId: teamProjects[0].id,
			});
			expect(insightsStore.table.execute).toHaveBeenCalledWith(0, {
				skip: 0,
				take: 25,
				sortBy: 'failed:desc',
				dateRange: 'week',
				projectId: teamProjects[0].id,
			});
		});

		it('should pass project ID to table pagination and sorting events', async () => {
			renderComponent({
				props: { insightType: INSIGHT_TYPES.TOTAL },
			});

			// Select a project
			const projectSelect = screen.getByTestId('project-sharing-select');
			await userEvent.click(projectSelect);
			const projectSelectDropdownItems = await getDropdownItems(projectSelect);
			const teamProject = [...projectSelectDropdownItems].find(
				(item) => item.querySelector('p')?.textContent?.trim() === teamProjects[0].name,
			);
			await userEvent.click(teamProject as Element);

			await waitAllPromises();

			// Clear previous calls to focus on pagination event
			vi.clearAllMocks();

			// Simulate pagination event - note that the function uses the current selectedProject value
			// not the projectId parameter when called from table events
			emitters.n8nDataTableServer.emit('update:options', {
				page: 1,
				itemsPerPage: 50,
				sortBy: [{ id: 'failed', desc: true }],
			});

			// The function should use the selectedProject.value?.id when projectId is not explicitly passed
			expect(insightsStore.table.execute).toHaveBeenCalledWith(0, {
				skip: 50,
				take: 50,
				sortBy: 'failed:desc',
				dateRange: 'week',
				projectId: teamProjects[0].id,
			});
		});
	});
});
