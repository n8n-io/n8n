import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, getTooltip, hoverTooltipTrigger } from '@/__tests__/utils';
import { useRootStore } from '@n8n/stores/useRootStore';
import MigrationRules from './MigrationRules.vue';
import * as breakingChangesApi from '@n8n/rest-api-client/api/breaking-changes';
import type { BreakingChangeLightReportResult } from '@n8n/api-types';

vi.mock('@n8n/rest-api-client/api/breaking-changes', () => ({
	getReport: vi.fn(),
	refreshReport: vi.fn(),
}));

let rootStore: ReturnType<typeof mockedStore<typeof useRootStore>>;
let renderComponent: ReturnType<typeof createComponentRenderer>;

const mockWorkflowIssue = {
	ruleId: 'rule-1',
	ruleTitle: 'Test Rule 1',
	ruleDescription: 'This is a test rule description',
	ruleImpact: 'executionsFail' as const,
	ruleDocumentationUrl: 'https://docs.example.com/rule-1',
	recommendations: [
		{
			action: 'Update the node',
			description: 'Please update to the latest version',
		},
	],
	migratable: false,
	nbAffectedWorkflows: 5,
};

const mockInstanceIssue = {
	ruleId: 'rule-2',
	ruleTitle: 'Instance Rule 1',
	ruleDescription: 'This is an instance rule description',
	ruleImpact: 'behaviorChanges' as const,
	ruleDocumentationUrl: 'https://docs.example.com/rule-2',
	recommendations: [
		{
			action: 'Update configuration',
			description: 'Update your instance configuration',
		},
	],
	migratable: false,
	instanceIssues: [
		{
			title: 'Configuration issue',
			description: 'This is a configuration issue',
			level: 'warning' as const,
		},
	],
};

const mockReport: BreakingChangeLightReportResult = {
	report: {
		generatedAt: new Date('2024-01-01'),
		targetVersion: '2.0.0',
		currentVersion: '1.0.0',
		workflowResults: [mockWorkflowIssue],
		instanceResults: [mockInstanceIssue],
	},
	totalWorkflows: 10,
	totalAffectedWorkflows: 5,
	shouldCache: true,
};

// Helper function to create a mock report with proper structure
const createMockReport = (
	overrides: Partial<BreakingChangeLightReportResult> = {},
): BreakingChangeLightReportResult => {
	return {
		report: {
			generatedAt: new Date('2024-01-01'),
			targetVersion: '2.0.0',
			currentVersion: '1.0.0',
			workflowResults: [],
			instanceResults: [],
			...overrides.report,
		},
		totalWorkflows: 10,
		totalAffectedWorkflows: 0,
		shouldCache: true,
		...overrides,
	};
};

describe('MigrationRules', () => {
	beforeEach(() => {
		renderComponent = createComponentRenderer(MigrationRules, {
			pinia: createTestingPinia(),
		});

		rootStore = mockedStore(useRootStore);
		rootStore.restApiContext = {
			baseUrl: 'http://localhost:5678',
			pushRef: 'test-push-ref',
		};

		vi.mocked(breakingChangesApi.getReport).mockResolvedValue(mockReport);
		vi.mocked(breakingChangesApi.refreshReport).mockResolvedValue(mockReport);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('initial rendering and loading', () => {
		it('should set the document title', () => {
			document.title = '';
			renderComponent();

			expect(document.title).toContain('Migration report');
		});

		it('should render correctly and load data on mount', async () => {
			renderComponent();

			// Initially shows loading skeleton
			expect(document.querySelectorAll('.el-skeleton').length).toBeGreaterThan(0);

			// After loading, shows title, description, and data
			await waitFor(() => {
				expect(screen.getByText('Migration report')).toBeInTheDocument();
				expect(
					screen.getByText(/5 of your 10 workflows are already compatible/, { exact: false }),
				).toBeInTheDocument();
				expect(screen.getByText('Test Rule 1')).toBeInTheDocument();
			});

			// API called with correct context
			expect(breakingChangesApi.getReport).toHaveBeenCalledWith(rootStore.restApiContext, {
				version: 'v3',
			});

			// Loading skeletons are gone
			expect(document.querySelectorAll('.el-skeleton').length).toBe(0);
		});
	});

	describe('tabs functionality', () => {
		it('should render tabs and switch between them', async () => {
			renderComponent();

			// Both tabs rendered, defaults to workflow issues
			await waitFor(() => {
				expect(screen.getByText('Workflow issues')).toBeInTheDocument();
				expect(screen.getByText('Instance issues')).toBeInTheDocument();
				expect(screen.getByText('Test Rule 1')).toBeInTheDocument();
			});

			// Switch to instance issues tab
			await userEvent.click(screen.getByText('Instance issues'));

			await waitFor(() => {
				expect(screen.getByText('Instance Rule 1')).toBeInTheDocument();
			});
		});

		it('should auto-switch to instance-issues tab when refreshing with no workflow issues', async () => {
			vi.mocked(breakingChangesApi.refreshReport).mockResolvedValue(
				createMockReport({
					report: {
						generatedAt: new Date('2024-01-01'),
						targetVersion: '2.0.0',
						currentVersion: '1.0.0',
						workflowResults: [],
						instanceResults: [mockInstanceIssue],
					},
				}),
			);

			renderComponent();

			await waitFor(() => {
				expect(screen.getByText('Refresh')).toBeInTheDocument();
			});

			await userEvent.click(screen.getByText('Refresh'));

			await waitFor(() => {
				expect(screen.getByText('Instance Rule 1')).toBeInTheDocument();
			});
		});
	});

	describe('workflow issues tab', () => {
		it('should display workflow issues with all elements', async () => {
			renderComponent();

			await waitFor(() => {
				// Title, description, and workflow count
				expect(screen.getByText('Test Rule 1')).toBeInTheDocument();
				expect(screen.getByText('This is a test rule description.')).toBeInTheDocument();
				expect(screen.getByText('5 Workflows')).toBeInTheDocument();

				// Impact tag
				expect(screen.getByText('Executions fail')).toBeInTheDocument();

				// Documentation link
				expect(screen.getAllByText('Documentation').length).toBeGreaterThan(0);

				// Link to detail page exists
				const workflowLink = screen.getByText('5 Workflows');
				expect(workflowLink.closest('a')).toBeInTheDocument();
			});
		});

		it('should show empty state when no workflow issues', async () => {
			vi.mocked(breakingChangesApi.getReport).mockResolvedValue(
				createMockReport({
					report: {
						generatedAt: new Date('2024-01-01'),
						targetVersion: '2.0.0',
						currentVersion: '1.0.0',
						workflowResults: [],
						instanceResults: [mockInstanceIssue],
					},
				}),
			);

			renderComponent();

			await waitFor(() => {
				expect(screen.getByText('No workflow issues detected')).toBeInTheDocument();
				expect(
					screen.getByText(
						"Your workflows are fully compatible with version 3.0.0. You're good to go!",
					),
				).toBeInTheDocument();
			});
		});

		it('should display multiple workflow issues sorted by impact', async () => {
			const multipleIssues = createMockReport({
				report: {
					generatedAt: new Date('2024-01-01'),
					targetVersion: '2.0.0',
					currentVersion: '1.0.0',
					workflowResults: [
						mockWorkflowIssue,
						{
							...mockWorkflowIssue,
							ruleId: 'rule-2',
							ruleTitle: 'Test Rule 2',
							ruleImpact: 'behaviorChanges' as const,
							nbAffectedWorkflows: 3,
						},
						{
							...mockWorkflowIssue,
							ruleId: 'rule-3',
							ruleTitle: 'Test Rule 3',
							ruleImpact: 'upgradeBlocked' as const,
							nbAffectedWorkflows: 1,
						},
						{
							...mockWorkflowIssue,
							ruleId: 'rule-4',
							ruleTitle: 'Test Rule 4',
							ruleImpact: 'capabilityRemoved' as const,
							nbAffectedWorkflows: 2,
						},
					],
					instanceResults: [],
				},
			});

			vi.mocked(breakingChangesApi.getReport).mockResolvedValue(multipleIssues);

			renderComponent();

			await waitFor(() => {
				expect(screen.getByText('Test Rule 1')).toBeInTheDocument();
				expect(screen.getByText('Test Rule 2')).toBeInTheDocument();
				expect(screen.getByText('Test Rule 3')).toBeInTheDocument();
				expect(screen.getByText('Executions fail')).toBeInTheDocument();
				expect(screen.getByText('Behavior changes')).toBeInTheDocument();
				expect(screen.getByText('Upgrade blocked')).toBeInTheDocument();
				expect(screen.getByText('Capability removed')).toBeInTheDocument();
			});

			// Rules that block the update come first and capability removals last,
			// whatever the response order.
			const titles = screen
				.getAllByRole('heading', { level: 3 })
				.map((heading) => heading.textContent?.trim());
			expect(titles).toEqual(['Test Rule 3', 'Test Rule 1', 'Test Rule 2', 'Test Rule 4']);
		});
	});

	describe('resolved workflow rules', () => {
		const resolvedRule = {
			...mockWorkflowIssue,
			ruleId: 'rule-resolved',
			ruleTitle: 'Resolved Rule',
			ruleImpact: 'upgradeBlocked' as const,
			nbAffectedWorkflows: 0,
		};

		it('lists a rule without open findings last, as resolved, with a link to its detail page', async () => {
			vi.mocked(breakingChangesApi.getReport).mockResolvedValue(
				createMockReport({
					report: {
						generatedAt: new Date('2024-01-01'),
						targetVersion: '2.0.0',
						currentVersion: '1.0.0',
						workflowResults: [resolvedRule, mockWorkflowIssue],
						instanceResults: [],
					},
				}),
			);

			renderComponent();

			await waitFor(() => {
				expect(screen.getByText('Resolved')).toBeInTheDocument();
			});
			expect(screen.getByText('Resolved').closest('a')).toBeInTheDocument();
			expect(screen.queryByText('0 Workflows')).not.toBeInTheDocument();
			const titles = screen
				.getAllByRole('heading', { level: 3 })
				.map((heading) => heading.textContent?.trim());
			expect(titles).toEqual(['Test Rule 1', 'Resolved Rule']);
			// The tab counts only the rule with open findings.
			expect(screen.getByText('Workflow issues').parentElement).toHaveTextContent('1');
		});

		it('shows the empty state and keeps the resolved rules listed when no rule has open findings', async () => {
			vi.mocked(breakingChangesApi.getReport).mockResolvedValue(
				createMockReport({
					report: {
						generatedAt: new Date('2024-01-01'),
						targetVersion: '2.0.0',
						currentVersion: '1.0.0',
						workflowResults: [resolvedRule],
						instanceResults: [],
					},
				}),
			);

			renderComponent();

			await waitFor(() => {
				expect(screen.getByText('No workflow issues detected')).toBeInTheDocument();
			});
			expect(screen.getByText('Resolved Rule')).toBeInTheDocument();
			expect(screen.getByText('Workflow issues').parentElement).not.toHaveTextContent(/\d/);
		});
	});

	describe('instance issues tab', () => {
		it('should display instance issues with all elements', async () => {
			renderComponent();

			await userEvent.click(screen.getByText('Instance issues'));

			await waitFor(() => {
				// Title and description
				expect(screen.getByText('Instance Rule 1')).toBeInTheDocument();
				expect(screen.getByText('This is an instance rule description.')).toBeInTheDocument();

				// Impact tag
				expect(screen.getByText('Behavior changes')).toBeInTheDocument();

				// Documentation link
				expect(screen.getAllByText('Documentation').length).toBeGreaterThan(0);
			});
		});

		it('should show empty state when no instance issues', async () => {
			vi.mocked(breakingChangesApi.getReport).mockResolvedValue(
				createMockReport({
					report: {
						generatedAt: new Date('2024-01-01'),
						targetVersion: '2.0.0',
						currentVersion: '1.0.0',
						workflowResults: [mockWorkflowIssue],
						instanceResults: [],
					},
				}),
			);

			renderComponent();

			await userEvent.click(screen.getByText('Instance issues'));

			await waitFor(() => {
				expect(screen.getByText('No instance issues detected')).toBeInTheDocument();
				expect(
					screen.getByText(
						"Your instance is fully compatible with version 3.0.0. You're good to go!",
					),
				).toBeInTheDocument();
			});
		});

		it('should display multiple instance issues sorted by impact', async () => {
			const multipleIssues = createMockReport({
				report: {
					generatedAt: new Date('2024-01-01'),
					targetVersion: '2.0.0',
					currentVersion: '1.0.0',
					workflowResults: [],
					instanceResults: [
						mockInstanceIssue,
						{
							...mockInstanceIssue,
							ruleId: 'rule-3',
							ruleTitle: 'Instance Rule 2',
							ruleImpact: 'executionsFail' as const,
						},
						{
							...mockInstanceIssue,
							ruleId: 'rule-4',
							ruleTitle: 'Instance Rule 3',
							ruleImpact: 'capabilityRemoved' as const,
						},
						{
							...mockInstanceIssue,
							ruleId: 'rule-5',
							ruleTitle: 'Instance Rule 4',
							ruleImpact: 'upgradeBlocked' as const,
						},
					],
				},
			});

			vi.mocked(breakingChangesApi.getReport).mockResolvedValue(multipleIssues);

			renderComponent();

			await userEvent.click(screen.getByText('Instance issues'));

			await waitFor(() => {
				expect(screen.getByText('Instance Rule 1')).toBeInTheDocument();
				expect(screen.getByText('Instance Rule 2')).toBeInTheDocument();
				expect(screen.getByText('Instance Rule 3')).toBeInTheDocument();
				expect(screen.getByText('Instance Rule 4')).toBeInTheDocument();
			});

			// Same order as the workflow tab: upgradeBlocked, executionsFail,
			// behaviorChanges, capabilityRemoved.
			const titles = screen
				.getAllByRole('heading', { level: 3 })
				.map((heading) => heading.textContent?.trim());
			expect(titles).toEqual([
				'Instance Rule 4',
				'Instance Rule 2',
				'Instance Rule 1',
				'Instance Rule 3',
			]);
		});
	});

	describe('refresh functionality', () => {
		it.each([true, false])(
			'should always show the Refresh button (shouldCache: %s)',
			async (shouldCache) => {
				vi.mocked(breakingChangesApi.getReport).mockResolvedValue({ ...mockReport, shouldCache });

				renderComponent();

				await waitFor(() => {
					expect(screen.getByText('Test Rule 1')).toBeInTheDocument();
				});

				expect(screen.getByText('Refresh')).toBeInTheDocument();
			},
		);

		it('should show when the report was last synced, from generatedAt', async () => {
			// One year in the past, so the relative label is stable whatever the test date.
			const generatedAt = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
			vi.mocked(breakingChangesApi.getReport).mockResolvedValue(
				createMockReport({
					report: {
						generatedAt,
						targetVersion: '2.0.0',
						currentVersion: '1.0.0',
						workflowResults: [mockWorkflowIssue],
						instanceResults: [],
					},
				}),
			);

			renderComponent();

			await waitFor(() => {
				const lastSynced = screen.getByTestId('migration-report-last-synced');
				expect(lastSynced).toHaveTextContent(/Last synced\s+1 year ago/);
			});
		});

		it('should update the last synced time after Refresh', async () => {
			const oldDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
			const newDate = new Date(Date.now() - 60 * 1000);
			vi.mocked(breakingChangesApi.getReport).mockResolvedValue(
				createMockReport({ report: { ...mockReport.report, generatedAt: oldDate } }),
			);
			vi.mocked(breakingChangesApi.refreshReport).mockResolvedValue(
				createMockReport({ report: { ...mockReport.report, generatedAt: newDate } }),
			);

			renderComponent();

			await waitFor(() => {
				expect(screen.getByTestId('migration-report-last-synced')).toHaveTextContent(/1 year ago/);
			});

			await userEvent.click(screen.getByText('Refresh'));

			await waitFor(() => {
				expect(screen.getByTestId('migration-report-last-synced')).toHaveTextContent(
					/1 minute ago/,
				);
			});
		});

		it('should refresh and reload data when clicked', async () => {
			const updatedReport = createMockReport({
				report: {
					generatedAt: new Date('2024-01-01'),
					targetVersion: '2.0.0',
					currentVersion: '1.0.0',
					workflowResults: [
						{ ...mockWorkflowIssue, ruleTitle: 'Updated Rule', nbAffectedWorkflows: 10 },
					],
					instanceResults: [],
				},
				totalWorkflows: 15,
				totalAffectedWorkflows: 10,
			});

			vi.mocked(breakingChangesApi.refreshReport).mockResolvedValue(updatedReport);

			renderComponent();

			await waitFor(() => {
				expect(screen.getByText('Refresh')).toBeInTheDocument();
			});

			await userEvent.click(screen.getByText('Refresh'));

			// API called and data reloaded
			await waitFor(() => {
				expect(breakingChangesApi.refreshReport).toHaveBeenCalledWith(rootStore.restApiContext, {
					version: 'v3',
				});
				expect(screen.getByText('Updated Rule')).toBeInTheDocument();
				expect(screen.getByText('10 Workflows')).toBeInTheDocument();
			});
		});
	});

	it('should keep refresh button visible during refresh operation', async () => {
		// Mock a slow refresh to test that button stays visible
		let resolveRefresh: (value: BreakingChangeLightReportResult) => void;
		const refreshPromise = new Promise((resolve) => {
			resolveRefresh = resolve;
		});

		vi.mocked(breakingChangesApi.refreshReport).mockReturnValue(
			refreshPromise as Promise<BreakingChangeLightReportResult>,
		);

		renderComponent();

		await waitFor(() => {
			expect(screen.getByText('Refresh')).toBeInTheDocument();
		});

		// Click refresh
		await userEvent.click(screen.getByText('Refresh'));

		// Button should still be visible (with loading state) during refresh
		await waitFor(() => {
			const button = screen.getByText('Refresh');
			expect(button).toBeInTheDocument();
			// Button should be disabled during loading
			expect(button.closest('button')).toBeDisabled();
		});

		// Resolve the refresh
		resolveRefresh!(mockReport);

		// Button should still be visible after refresh completes
		await waitFor(() => {
			const button = screen.getByText('Refresh');
			expect(button).toBeInTheDocument();
			expect(button.closest('button')).not.toBeDisabled();
		});
	});

	describe('compatible workflows count', () => {
		it.each([
			{ affected: [5], totalAffected: 5, compatible: 5, description: 'single issue' },
			{ affected: [3, 2], totalAffected: 5, compatible: 5, description: 'multiple issues' },
			{
				affected: [5, 5, 5],
				totalAffected: 5,
				compatible: 5,
				description: 'workflows that break several rules',
			},
			{ affected: [10], totalAffected: 10, compatible: 0, description: 'all affected' },
			{ affected: [], totalAffected: 0, compatible: 10, description: 'no issues' },
		])(
			'should calculate correctly with $description',
			async ({ affected, totalAffected, compatible }) => {
				const report = createMockReport({
					report: {
						generatedAt: new Date('2024-01-01'),
						targetVersion: '2.0.0',
						currentVersion: '1.0.0',
						workflowResults: affected.map((count, idx) => ({
							...mockWorkflowIssue,
							ruleId: `rule-${idx}`,
							nbAffectedWorkflows: count,
						})),
						instanceResults: [],
					},
					totalAffectedWorkflows: totalAffected,
				});

				vi.mocked(breakingChangesApi.getReport).mockResolvedValue(report);

				renderComponent();

				await waitFor(() => {
					expect(
						screen.getByText(
							new RegExp(`${compatible} of your 10 workflows are already compatible`),
						),
					).toBeInTheDocument();
				});
			},
		);
	});

	describe('migration progress', () => {
		it('should render the progress bar with the compatible share', async () => {
			renderComponent();

			await waitFor(() => {
				const progressBar = screen.getByTestId('migration-report-progress');
				expect(progressBar).toHaveAttribute('aria-valuenow', '50');
				expect(progressBar).toHaveAttribute('aria-label', '5 of 10 compatible');
			});
			expect(screen.getByText('5 of 10 compatible')).toBeInTheDocument();
		});

		it('should show 0% when there are no workflows', async () => {
			vi.mocked(breakingChangesApi.getReport).mockResolvedValue(
				createMockReport({ totalWorkflows: 0 }),
			);

			renderComponent();

			await waitFor(() => {
				expect(screen.getByTestId('migration-report-progress')).toHaveAttribute(
					'aria-valuenow',
					'0',
				);
			});
			expect(screen.getByText('0 of 0 compatible')).toBeInTheDocument();
		});

		it('should not show 100% while some workflows are incompatible', async () => {
			vi.mocked(breakingChangesApi.getReport).mockResolvedValue(
				createMockReport({ totalWorkflows: 1000, totalAffectedWorkflows: 5 }),
			);

			renderComponent();

			await waitFor(() => {
				expect(screen.getByTestId('migration-report-progress')).toHaveAttribute(
					'aria-valuenow',
					'99',
				);
			});
		});
	});

	describe('tooltips', () => {
		it.each([
			{
				impact: 'upgradeBlocked',
				label: 'Upgrade blocked',
				tooltipText: 'cannot proceed',
			},
			{
				impact: 'executionsFail',
				label: 'Executions fail',
				tooltipText: 'will fail',
			},
			{
				impact: 'behaviorChanges',
				label: 'Behavior changes',
				tooltipText: 'keep running',
			},
			{
				impact: 'capabilityRemoved',
				label: 'Capability removed',
				tooltipText: 'not affected',
			},
		] as const)(
			'should show $impact impact tooltip on hover',
			async ({ impact, label, tooltipText }) => {
				const report = createMockReport({
					report: {
						generatedAt: new Date('2024-01-01'),
						targetVersion: '2.0.0',
						currentVersion: '1.0.0',
						workflowResults: [{ ...mockWorkflowIssue, ruleImpact: impact }],
						instanceResults: [],
					},
				});

				vi.mocked(breakingChangesApi.getReport).mockResolvedValue(report);

				renderComponent();

				await waitFor(() => {
					expect(screen.getByText(label)).toBeInTheDocument();
				});

				// Verify tooltip shows the impact description on hover
				const labelElement = screen.getByText(label);
				await hoverTooltipTrigger(labelElement);
				await waitFor(() => expect(getTooltip()).toHaveTextContent(tooltipText));
			},
		);
	});

	describe('error handling and edge cases', () => {
		it('should handle API errors gracefully', async () => {
			vi.mocked(breakingChangesApi.getReport).mockRejectedValue(
				new Error('Failed to fetch report'),
			);

			renderComponent();

			// Component still renders title
			await waitFor(() => {
				expect(screen.getByText('Migration report')).toBeInTheDocument();
			});
		});

		it('should handle refresh errors gracefully', async () => {
			renderComponent();

			await waitFor(() => {
				expect(screen.getByText('Refresh')).toBeInTheDocument();
			});

			vi.mocked(breakingChangesApi.refreshReport).mockRejectedValue(new Error('Refresh failed'));

			await userEvent.click(screen.getByText('Refresh'));

			// Component still works after error
			await waitFor(() => {
				expect(screen.getByText('Migration report')).toBeInTheDocument();
			});
		});

		it('should handle empty data correctly', async () => {
			vi.mocked(breakingChangesApi.getReport).mockResolvedValue(
				createMockReport({
					report: {
						generatedAt: new Date('2024-01-01'),
						targetVersion: '2.0.0',
						currentVersion: '1.0.0',
						workflowResults: [],
						instanceResults: [],
					},
					totalWorkflows: 0,
					totalAffectedWorkflows: 0,
					shouldCache: false,
				}),
			);

			renderComponent();

			await waitFor(() => {
				expect(
					screen.getByText(/0 of your 0 workflows are already compatible/, { exact: false }),
				).toBeInTheDocument();
			});
		});
	});
});
