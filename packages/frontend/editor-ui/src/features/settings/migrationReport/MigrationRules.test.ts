import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
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
	ruleSeverity: 'critical' as const,
	ruleDocumentationUrl: 'https://docs.example.com/rule-1',
	recommendations: [
		{
			action: 'Update the node',
			description: 'Please update to the latest version',
		},
	],
	nbAffectedWorkflows: 5,
};

const mockInstanceIssue = {
	ruleId: 'rule-2',
	ruleTitle: 'Instance Rule 1',
	ruleDescription: 'This is an instance rule description',
	ruleSeverity: 'medium' as const,
	ruleDocumentationUrl: 'https://docs.example.com/rule-2',
	recommendations: [
		{
			action: 'Update configuration',
			description: 'Update your instance configuration',
		},
	],
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
		it('should render correctly and load data on mount', async () => {
			renderComponent();

			// Initially shows loading skeleton
			expect(document.querySelectorAll('.el-skeleton').length).toBeGreaterThan(0);

			// After loading, shows title, description, and data
			await waitFor(() => {
				expect(screen.getByText('Compatibility report for version 2.0.0')).toBeInTheDocument();
				expect(
					screen.getByText(/5 of your 10 workflows are already compatible/, { exact: false }),
				).toBeInTheDocument();
				expect(screen.getByText('Test Rule 1')).toBeInTheDocument();
			});

			// API called with correct context
			expect(breakingChangesApi.getReport).toHaveBeenCalledWith(rootStore.restApiContext);

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
				expect(screen.getByText('This is a test rule description')).toBeInTheDocument();
				expect(screen.getByText('5 Workflows')).toBeInTheDocument();

				// Severity tag
				expect(screen.getByText('Critical')).toBeInTheDocument();

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
						"Your workflows are fully compatible with version 2.0.0. You're good to go!",
					),
				).toBeInTheDocument();
			});
		});

		it('should display multiple workflow issues with different severities', async () => {
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
							ruleSeverity: 'medium' as const,
							nbAffectedWorkflows: 3,
						},
						{
							...mockWorkflowIssue,
							ruleId: 'rule-3',
							ruleTitle: 'Test Rule 3',
							ruleSeverity: 'low' as const,
							nbAffectedWorkflows: 1,
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
				expect(screen.getByText('Critical')).toBeInTheDocument();
				expect(screen.getByText('Medium')).toBeInTheDocument();
				expect(screen.getByText('Low')).toBeInTheDocument();
			});
		});
	});

	describe('instance issues tab', () => {
		it('should display instance issues with all elements', async () => {
			renderComponent();

			await userEvent.click(screen.getByText('Instance issues'));

			await waitFor(() => {
				// Title and description
				expect(screen.getByText('Instance Rule 1')).toBeInTheDocument();
				expect(screen.getByText('This is an instance rule description')).toBeInTheDocument();

				// Severity tag
				expect(screen.getByText('Medium')).toBeInTheDocument();

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
						"Your instance is fully compatible with version 2.0.0. You're good to go!",
					),
				).toBeInTheDocument();
			});
		});

		it('should display multiple instance issues', async () => {
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
							ruleSeverity: 'critical' as const,
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
			});
		});
	});

	describe('refresh functionality', () => {
		it('should show refresh button when shouldCache is true', async () => {
			renderComponent();

			await waitFor(() => {
				expect(screen.getByText('Refresh')).toBeInTheDocument();
			});
		});

		it('should hide refresh button when shouldCache is false', async () => {
			vi.mocked(breakingChangesApi.getReport).mockResolvedValue({
				...mockReport,
				shouldCache: false,
			});

			renderComponent();

			await waitFor(() => {
				expect(screen.getByText('Test Rule 1')).toBeInTheDocument();
			});

			expect(screen.queryByText('Refresh')).not.toBeInTheDocument();
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
			});

			vi.mocked(breakingChangesApi.refreshReport).mockResolvedValue(updatedReport);

			renderComponent();

			await waitFor(() => {
				expect(screen.getByText('Refresh')).toBeInTheDocument();
			});

			await userEvent.click(screen.getByText('Refresh'));

			// API called and data reloaded
			await waitFor(() => {
				expect(breakingChangesApi.refreshReport).toHaveBeenCalledWith(rootStore.restApiContext);
				expect(screen.getByText('Updated Rule')).toBeInTheDocument();
				expect(screen.getByText('10 Workflows')).toBeInTheDocument();
			});
		});
	});

	describe('compatible workflows count', () => {
		it.each([
			{ affected: [5], compatible: 5, description: 'single issue' },
			{ affected: [3, 2], compatible: 5, description: 'multiple issues' },
			{ affected: [10], compatible: 0, description: 'all affected' },
			{ affected: [], compatible: 10, description: 'no issues' },
		])('should calculate correctly with $description', async ({ affected, compatible }) => {
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
			});

			vi.mocked(breakingChangesApi.getReport).mockResolvedValue(report);

			renderComponent();

			await waitFor(() => {
				expect(
					screen.getByText(new RegExp(`${compatible} of your 10 workflows are already compatible`)),
				).toBeInTheDocument();
			});
		});
	});

	describe('tooltips', () => {
		it.each([
			{
				severity: 'critical',
				label: 'Critical',
				tooltip:
					'Affected workflows will break after the update. You need to update or replace impacted nodes.',
			},
			{
				severity: 'medium',
				label: 'Medium',
				tooltip:
					'Workflows may still run but could produce incorrect results. Review and test before updating.',
			},
			{
				severity: 'low',
				label: 'Low',
				tooltip:
					'Behavior might change slightly in specific cases. Most workflows will keep working as expected.',
			},
		] as const)(
			'should show $severity severity tooltip on hover',
			async ({ severity, label, tooltip }) => {
				const report = createMockReport({
					report: {
						generatedAt: new Date('2024-01-01'),
						targetVersion: '2.0.0',
						currentVersion: '1.0.0',
						workflowResults: [{ ...mockWorkflowIssue, ruleSeverity: severity }],
						instanceResults: [],
					},
				});

				vi.mocked(breakingChangesApi.getReport).mockResolvedValue(report);

				renderComponent();

				await waitFor(() => {
					expect(screen.getByText(label)).toBeInTheDocument();
				});

				await userEvent.hover(screen.getByText(label));

				await waitFor(() => {
					expect(screen.getByText(tooltip)).toBeInTheDocument();
				});
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
				expect(screen.getByText('Compatibility report for version 2.0.0')).toBeInTheDocument();
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
				expect(screen.getByText('Compatibility report for version 2.0.0')).toBeInTheDocument();
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
