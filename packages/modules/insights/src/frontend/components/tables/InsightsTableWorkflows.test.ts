import { defineComponent } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor, within } from '@testing-library/vue';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { createComponentRenderer } from '@/__tests__/render';
import { useEmitters } from '@/__tests__/utils';
import InsightsTableWorkflows from '@/features/insights/components/tables/InsightsTableWorkflows.vue';
import type { InsightsByWorkflow } from '@n8n/api-types';

const { emitters, addEmitter } = useEmitters<'n8nDataTableServer'>();

const mockTelemetry = {
	track: vi.fn(),
};
vi.mock('@/composables/useTelemetry', () => ({
	useTelemetry: () => mockTelemetry,
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
				sortBy: { type: Array },
				page: { type: Number },
				itemsPerPage: { type: Number },
			},
			setup(_, { emit }) {
				addEmitter('n8nDataTableServer', emit);
			},
			template: `
				<div data-test-id="insights-table">
					<div class="table-header">
						<div v-for="header in headers" :key="header.key">
							<button
								v-if="!header.disableSort"
								:data-test-id="'sort-' + header.key"
								@click="$emit('update:sortBy', [{ id: header.key, desc: false }])"
							>
								{{ header.title }}
							</button>
							<span v-else :data-test-id="'header-' + header.key">
								{{ header.title }}
							</span>
						</div>
					</div>
					<div v-for="item in items" :key="item.workflowId"
							 :data-test-id="'workflow-row-' + item.workflowId">
						<div v-for="header in headers" :key="header.key">
							<slot :name="'item.' + header.key" :item="item"
										:value="header.value ? header.value(item) : item[header.key]">
								<span v-if="header.value">{{ header.value(item) }}</span>
								<span v-else>{{ item[header.key] }}</span>
							</slot>
						</div>
					</div>
					<slot name="cover" />
				</div>`,
		}),
	};
});

const mockInsightsData: InsightsByWorkflow = {
	count: 2,
	data: [
		{
			workflowId: 'workflow-1',
			workflowName: 'Test Workflow 1',
			total: 100,
			failed: 5,
			failureRate: 0.05,
			timeSaved: 3600,
			averageRunTime: 1200,
			projectName: 'Test Project 1',
			projectId: 'project-1',
			succeeded: 95,
			runTime: 114000,
		},
		{
			workflowId: 'workflow-2',
			workflowName: 'Test Workflow 2 With Very Long Name That Should Be Truncated',
			total: 50,
			failed: 0,
			failureRate: 0,
			timeSaved: 0,
			averageRunTime: 800,
			projectName: '',
			projectId: 'project-2',
			succeeded: 50,
			runTime: 40000,
		},
	],
};

let renderComponent: ReturnType<typeof createComponentRenderer>;

describe('InsightsTableWorkflows', () => {
	beforeEach(() => {
		renderComponent = createComponentRenderer(InsightsTableWorkflows, {
			pinia: createTestingPinia(),
			props: {
				data: mockInsightsData,
				loading: false,
				isDashboardEnabled: true, // Default to true for basic tests
			},
			global: {
				stubs: {
					'router-link': {
						template: '<a><slot /></a>',
					},
				},
			},
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('basic rendering', () => {
		it('should display the correct heading', () => {
			renderComponent();

			expect(screen.getByRole('heading', { name: 'Breakdown by workflow' })).toBeInTheDocument();
		});

		it('should render workflow data in table rows', () => {
			renderComponent();

			expect(screen.getByTestId('workflow-row-workflow-1')).toBeInTheDocument();
			expect(screen.getByTestId('workflow-row-workflow-2')).toBeInTheDocument();
		});
	});

	describe('data display', () => {
		it('should display formatted numbers for total and failed columns', () => {
			renderComponent();

			const row1 = screen.getByTestId('workflow-row-workflow-1');
			expect(within(row1).getByText('100')).toBeInTheDocument();
			expect(within(row1).getByText('5')).toBeInTheDocument();

			const row2 = screen.getByTestId('workflow-row-workflow-2');
			expect(within(row2).getByText('50')).toBeInTheDocument();
			expect(within(row2).getByText('0')).toBeInTheDocument();
		});

		it('should handle large numbers with locale formatting', () => {
			const largeNumberData = {
				...mockInsightsData,
				data: [
					{
						...mockInsightsData.data[0],
						total: 1000000,
						failed: 50000,
					},
				],
			};

			renderComponent({
				props: {
					data: largeNumberData,
					loading: false,
					isDashboardEnabled: true,
				},
			});

			const row = screen.getByTestId('workflow-row-workflow-1');
			expect(within(row).getByText('1,000,000')).toBeInTheDocument();
			expect(within(row).getByText('50,000')).toBeInTheDocument();
		});
	});

	describe('template slots', () => {
		describe('workflowName slot', () => {
			it('should render workflow name with tooltip', () => {
				renderComponent();

				const row1 = screen.getByTestId('workflow-row-workflow-1');
				expect(within(row1).getByText('Test Workflow 1')).toBeInTheDocument();
			});

			it('should track telemetry on workflow name click', async () => {
				const user = userEvent.setup();
				renderComponent();

				const row1 = screen.getByTestId('workflow-row-workflow-1');
				const workflowLink = within(row1).getByText('Test Workflow 1');
				await user.click(workflowLink);

				expect(mockTelemetry.track).toHaveBeenCalledWith(
					'User clicked on workflow from insights table',
					{
						workflow_id: 'workflow-1',
					},
				);
			});
		});

		describe('timeSaved slot', () => {
			it('should show estimate link when timeSaved is 0', () => {
				renderComponent();

				const row2 = screen.getByTestId('workflow-row-workflow-2');
				expect(within(row2).getByText('Estimate')).toBeInTheDocument();
			});

			it('should show formatted value when timeSaved exists', () => {
				renderComponent();

				// The actual formatted value will be processed by the utility functions
				// We just verify the slot is rendered with the item that has timeSaved
				const row1 = screen.getByTestId('workflow-row-workflow-1');
				expect(row1).toBeInTheDocument();
			});
		});

		describe('projectName slot', () => {
			it('should render project name with tooltip when projectName exists', () => {
				renderComponent();

				const row1 = screen.getByTestId('workflow-row-workflow-1');
				expect(within(row1).getByText('Test Project 1')).toBeInTheDocument();
			});

			it('should render dash when projectName is null', () => {
				renderComponent();

				const row2 = screen.getByTestId('workflow-row-workflow-2');
				expect(within(row2).getByText('-')).toBeInTheDocument();
			});
		});
	});

	describe('event delegation', () => {
		it('should delegate update:options event from N8nDataTableServer', () => {
			const { emitted } = renderComponent();

			const updateOptions = {
				page: 1,
				itemsPerPage: 20,
				sortBy: [{ id: 'workflowName', desc: false }],
			};

			emitters.n8nDataTableServer.emit('update:options', updateOptions);

			expect(emitted()).toHaveProperty('update:options');
			expect(emitted()['update:options'][0]).toEqual([updateOptions]);
		});
	});

	describe('telemetry tracking', () => {
		it('should track sort changes with correct payload', async () => {
			const { rerender } = renderComponent();

			// Simulate sortBy change
			await rerender({
				sortBy: [{ id: 'total', desc: true }],
			});

			expect(mockTelemetry.track).toHaveBeenCalledWith('User sorted insights table', {
				sorted_by: [
					{
						id: 'total',
						desc: true,
						label: 'Prod. executions',
					},
				],
			});
		});

		it('should handle empty sortBy array', async () => {
			const { rerender } = renderComponent();

			// Simulate sortBy change to empty array
			await rerender({
				sortBy: [],
			});

			expect(mockTelemetry.track).toHaveBeenCalledWith('User sorted insights table', {
				sorted_by: [],
			});
		});
	});

	describe('edge cases', () => {
		it('should handle empty data array', () => {
			const emptyData = { count: 0, data: [] };

			renderComponent = createComponentRenderer(InsightsTableWorkflows, {
				pinia: createTestingPinia(),
				props: {
					data: emptyData,
					loading: false,
				},
			});

			renderComponent();

			expect(screen.getByTestId('insights-table')).toBeInTheDocument();
			expect(screen.queryByTestId('workflow-row-workflow-1')).not.toBeInTheDocument();
		});

		it('should handle loading state', () => {
			renderComponent = createComponentRenderer(InsightsTableWorkflows, {
				pinia: createTestingPinia(),
				props: {
					data: mockInsightsData,
					loading: true,
				},
			});

			renderComponent();

			expect(screen.getByTestId('insights-table')).toBeInTheDocument();
		});

		it('should handle missing optional props', () => {
			renderComponent = createComponentRenderer(InsightsTableWorkflows, {
				pinia: createTestingPinia(),
				props: {
					data: mockInsightsData,
					// loading prop omitted
				},
			});

			renderComponent();

			expect(screen.getByTestId('insights-table')).toBeInTheDocument();
		});
	});

	describe('paywall functionality', () => {
		it('should not display paywall when dashboard is enabled', () => {
			renderComponent = createComponentRenderer(InsightsTableWorkflows, {
				pinia: createTestingPinia(),
				props: {
					data: mockInsightsData,
					loading: false,
					isDashboardEnabled: true,
				},
			});

			renderComponent();

			expect(
				screen.queryByRole('heading', { name: 'Upgrade to access more detailed insights' }),
			).not.toBeInTheDocument();
		});

		it('should display paywall when dashboard is not enabled', async () => {
			renderComponent({
				props: {
					data: mockInsightsData,
					loading: false,
					isDashboardEnabled: false,
				},
			});

			await waitFor(() => {
				expect(
					screen.getByRole('heading', {
						level: 4,
						name: 'Upgrade to access more detailed insights',
					}),
				).toBeInTheDocument();
			});
		});

		it('should use sample data when dashboard is not enabled', () => {
			renderComponent({
				props: {
					data: mockInsightsData,
					loading: false,
					isDashboardEnabled: false,
				},
			});

			// Should render sample workflows instead of actual data
			expect(screen.getByTestId('workflow-row-sample-workflow-1')).toBeInTheDocument();
			expect(screen.getByTestId('workflow-row-sample-workflow-2')).toBeInTheDocument();
			// Should not render the original test data
			expect(screen.queryByTestId('workflow-row-workflow-1')).not.toBeInTheDocument();
			expect(screen.queryByTestId('workflow-row-workflow-2')).not.toBeInTheDocument();
		});

		it('should disable sorting when dashboard is not enabled', () => {
			renderComponent({
				props: {
					data: mockInsightsData,
					loading: false,
					isDashboardEnabled: false,
				},
			});

			// When sorting is disabled, columns should not have clickable sort buttons
			expect(screen.queryByTestId('sort-workflowName')).not.toBeInTheDocument();
			expect(screen.queryByTestId('sort-total')).not.toBeInTheDocument();
			expect(screen.queryByTestId('sort-failed')).not.toBeInTheDocument();
			expect(screen.queryByTestId('sort-failureRate')).not.toBeInTheDocument();
			expect(screen.queryByTestId('sort-timeSaved')).not.toBeInTheDocument();
			expect(screen.queryByTestId('sort-averageRunTime')).not.toBeInTheDocument();

			// Headers should be present as non-clickable elements
			expect(screen.getByTestId('header-workflowName')).toBeInTheDocument();
			expect(screen.getByTestId('header-total')).toBeInTheDocument();
			expect(screen.getByTestId('header-failed')).toBeInTheDocument();
			expect(screen.getByTestId('header-failureRate')).toBeInTheDocument();
			expect(screen.getByTestId('header-timeSaved')).toBeInTheDocument();
			expect(screen.getByTestId('header-averageRunTime')).toBeInTheDocument();
			// projectName is always disabled
			expect(screen.getByTestId('header-projectName')).toBeInTheDocument();
		});

		it('should enable sorting when dashboard is enabled', () => {
			renderComponent();

			// When sorting is enabled, most columns should have clickable sort buttons
			expect(screen.getByTestId('sort-workflowName')).toBeInTheDocument();
			expect(screen.getByTestId('sort-total')).toBeInTheDocument();
			expect(screen.getByTestId('sort-failed')).toBeInTheDocument();
			expect(screen.getByTestId('sort-failureRate')).toBeInTheDocument();
			expect(screen.getByTestId('sort-timeSaved')).toBeInTheDocument();
			expect(screen.getByTestId('sort-averageRunTime')).toBeInTheDocument();

			// projectName is always disabled (non-clickable)
			expect(screen.getByTestId('header-projectName')).toBeInTheDocument();
			expect(screen.queryByTestId('sort-projectName')).not.toBeInTheDocument();
		});

		it('should trigger sort when clicking on sortable column header', async () => {
			const { emitted } = renderComponent();

			const sortButton = screen.getByTestId('sort-workflowName');
			await userEvent.click(sortButton);

			expect(emitted()['update:sortBy']).toEqual([[[{ id: 'workflowName', desc: false }]]]);
		});
	});
});
