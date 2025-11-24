import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useRootStore } from '@n8n/stores/useRootStore';
import MigrationRuleDetail from './MigrationRuleDetail.vue';
import * as breakingChangesApi from '@n8n/rest-api-client/api/breaking-changes';
import type { BreakingChangeWorkflowRuleResult } from '@n8n/api-types';

vi.mock('@n8n/rest-api-client/api/breaking-changes', () => ({
	getReportForRule: vi.fn(),
}));

let rootStore: ReturnType<typeof mockedStore<typeof useRootStore>>;
let renderComponent: ReturnType<typeof createComponentRenderer>;

const mockWorkflowWithIssue = {
	id: 'workflow-1',
	name: 'Test Workflow 1',
	active: true,
	numberOfExecutions: 100,
	lastUpdatedAt: new Date('2024-01-15'),
	lastExecutedAt: new Date('2024-01-14'),
	issues: [
		{
			nodeId: 'node-1',
			nodeName: 'HTTP Request',
			title: 'Deprecated parameter',
			description: 'This parameter is deprecated',
			level: 'error' as const,
		},
	],
};

const mockWorkflowWithMultipleNodes = {
	id: 'workflow-2',
	name: 'Test Workflow 2',
	active: false,
	numberOfExecutions: 50,
	lastUpdatedAt: new Date('2024-01-10'),
	lastExecutedAt: null,
	issues: [
		{
			nodeId: 'node-2',
			nodeName: 'Webhook',
			title: 'Breaking change',
			description: 'API changed',
			level: 'error' as const,
		},
		{
			nodeId: 'node-3',
			nodeName: 'Gmail',
			title: 'Update required',
			description: 'Version update needed',
			level: 'warning' as const,
		},
	],
};

const mockRuleResult: BreakingChangeWorkflowRuleResult = {
	ruleId: 'rule-1',
	ruleTitle: 'Test Rule',
	ruleDescription: 'This is a test rule description',
	ruleSeverity: 'critical',
	ruleDocumentationUrl: 'https://docs.example.com/rule-1',
	recommendations: [
		{
			action: 'Update the node',
			description: 'Please update to the latest version',
		},
	],
	affectedWorkflows: [mockWorkflowWithIssue, mockWorkflowWithMultipleNodes],
};

const createMockRuleResult = (
	overrides: Partial<BreakingChangeWorkflowRuleResult> = {},
): BreakingChangeWorkflowRuleResult => {
	return {
		ruleId: 'rule-1',
		ruleTitle: 'Test Rule',
		ruleDescription: 'This is a test rule description',
		ruleSeverity: 'critical',
		ruleDocumentationUrl: 'https://docs.example.com/rule-1',
		recommendations: [],
		affectedWorkflows: [],
		...overrides,
	};
};

describe('MigrationRuleDetail', () => {
	beforeEach(() => {
		renderComponent = createComponentRenderer(MigrationRuleDetail, {
			pinia: createTestingPinia(),
		});

		rootStore = mockedStore(useRootStore);
		rootStore.restApiContext = {
			baseUrl: 'http://localhost:5678',
			pushRef: 'test-push-ref',
		};

		vi.mocked(breakingChangesApi.getReportForRule).mockResolvedValue(mockRuleResult);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('initial rendering', () => {
		it('should render rule details correctly', async () => {
			renderComponent({
				props: {
					migrationRuleId: 'rule-1',
				},
			});

			await waitFor(() => {
				// Title, severity tag, and affected count
				expect(screen.getByText('Test Rule')).toBeInTheDocument();
				expect(screen.getByText('Critical')).toBeInTheDocument();
				expect(screen.getByText('2 affected')).toBeInTheDocument();

				// Description
				expect(screen.getByText('This is a test rule description.')).toBeInTheDocument();

				// Documentation link
				expect(screen.getByText('Documentation')).toBeInTheDocument();
			});

			// API called with correct parameters
			expect(breakingChangesApi.getReportForRule).toHaveBeenCalledWith(
				rootStore.restApiContext,
				'rule-1',
			);
		});

		it('should render table headers', async () => {
			renderComponent({
				props: {
					migrationRuleId: 'rule-1',
				},
			});

			await waitFor(() => {
				expect(screen.getByText('Name')).toBeInTheDocument();
				expect(screen.getByText('Issue')).toBeInTheDocument();
				expect(screen.getByText('Node affected')).toBeInTheDocument();
				expect(screen.getByText(/Number of executions/)).toBeInTheDocument();
				expect(screen.getByText(/Last executed/)).toBeInTheDocument();
				expect(screen.getByText(/Last updated/)).toBeInTheDocument();
			});
		});
	});

	describe('data table', () => {
		it('should display affected workflows in table', async () => {
			renderComponent({
				props: {
					migrationRuleId: 'rule-1',
				},
			});

			await waitFor(() => {
				expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
				expect(screen.getByText('Test Workflow 2')).toBeInTheDocument();
				expect(screen.getByText('HTTP Request')).toBeInTheDocument();
				expect(screen.getByText('Webhook')).toBeInTheDocument();
				expect(screen.getByText('Gmail')).toBeInTheDocument();
			});
		});

		it('should display workflow execution counts', async () => {
			renderComponent({
				props: {
					migrationRuleId: 'rule-1',
				},
			});

			await waitFor(() => {
				expect(screen.getByText('100')).toBeInTheDocument();
				expect(screen.getByText('50')).toBeInTheDocument();
			});
		});

		it('should show "Never" for workflows never executed', async () => {
			renderComponent({
				props: {
					migrationRuleId: 'rule-1',
				},
			});

			await waitFor(() => {
				expect(screen.getByText('Never')).toBeInTheDocument();
			});
		});

		it('should display multiple nodes with comma separation', async () => {
			renderComponent({
				props: {
					migrationRuleId: 'rule-1',
				},
			});

			await waitFor(() => {
				expect(screen.getByText('Webhook')).toBeInTheDocument();
				expect(screen.getByText('Gmail')).toBeInTheDocument();
			});
		});
	});

	describe('row interaction', () => {
		it('should have clickable rows with proper styling', async () => {
			renderComponent({
				props: {
					migrationRuleId: 'rule-1',
				},
			});

			await waitFor(() => {
				expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
			});

			const row = screen.getByText('Test Workflow 1').closest('tr');
			expect(row).toHaveClass('clickableRow');
		});
	});

	describe('node links', () => {
		it('should render node links with correct routes', async () => {
			renderComponent({
				props: {
					migrationRuleId: 'rule-1',
				},
			});

			await waitFor(() => {
				const httpRequestLink = screen.getByText('HTTP Request').closest('a');
				expect(httpRequestLink).toBeInTheDocument();
			});
		});
	});

	describe('severity display', () => {
		it.each([
			{ severity: 'critical', label: 'Critical' },
			{ severity: 'medium', label: 'Medium' },
			{ severity: 'low', label: 'Low' },
		] as const)('should display $severity severity correctly', async ({ severity, label }) => {
			vi.mocked(breakingChangesApi.getReportForRule).mockResolvedValue(
				createMockRuleResult({
					ruleSeverity: severity,
					affectedWorkflows: [mockWorkflowWithIssue],
				}),
			);

			renderComponent({
				props: {
					migrationRuleId: 'rule-1',
				},
			});

			await waitFor(() => {
				expect(screen.getByText(label)).toBeInTheDocument();
			});
		});
	});

	describe('sorting', () => {
		it('should sort by numberOfExecutions descending by default', async () => {
			renderComponent({
				props: {
					migrationRuleId: 'rule-1',
				},
			});

			await waitFor(() => {
				const rows = screen.getAllByRole('row');
				const firstDataRow = rows[1]; // Skip header row
				expect(firstDataRow.textContent).toContain('Test Workflow 1');
				expect(firstDataRow.textContent).toContain('100');
			});
		});
	});

	describe('error handling', () => {
		it('should handle API errors gracefully', async () => {
			vi.mocked(breakingChangesApi.getReportForRule).mockRejectedValue(
				new Error('Failed to fetch rule'),
			);

			renderComponent({
				props: {
					migrationRuleId: 'rule-1',
				},
			});

			// Component still renders with default empty state
			await waitFor(() => {
				expect(screen.getByText('0 affected')).toBeInTheDocument();
			});
		});
	});

	describe('edge cases', () => {
		it('should handle empty affected workflows', async () => {
			vi.mocked(breakingChangesApi.getReportForRule).mockResolvedValue(
				createMockRuleResult({
					affectedWorkflows: [],
				}),
			);

			renderComponent({
				props: {
					migrationRuleId: 'rule-1',
				},
			});

			await waitFor(() => {
				expect(screen.getByText('0 affected')).toBeInTheDocument();
			});
		});

		it('should handle workflows without issues', async () => {
			const workflowWithoutIssues = {
				...mockWorkflowWithIssue,
				issues: [],
			};

			vi.mocked(breakingChangesApi.getReportForRule).mockResolvedValue(
				createMockRuleResult({
					affectedWorkflows: [workflowWithoutIssues],
				}),
			);

			renderComponent({
				props: {
					migrationRuleId: 'rule-1',
				},
			});

			await waitFor(() => {
				expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
			});
		});
	});

	describe('search functionality', () => {
		it('should filter workflows by name (case insensitive)', async () => {
			const user = userEvent.setup({ delay: null });
			renderComponent({
				props: {
					migrationRuleId: 'rule-1',
				},
			});

			await waitFor(() => {
				expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
				expect(screen.getByText('Test Workflow 2')).toBeInTheDocument();
			});

			// Type "workflow 1" in search (lowercase to test case insensitivity)
			const searchInput = screen.getByPlaceholderText('Search workflows...');
			await user.type(searchInput, 'workflow 1');

			// Wait for debounce (300ms) plus a bit extra
			await vi.waitFor(
				() => {
					// Only Workflow 1 should be visible
					expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
					expect(screen.queryByText('Test Workflow 2')).not.toBeInTheDocument();
				},
				{ timeout: 1000 },
			);
		});

		it('should show all workflows when search is cleared', async () => {
			const user = userEvent.setup({ delay: null });
			renderComponent({
				props: {
					migrationRuleId: 'rule-1',
				},
			});

			await waitFor(() => {
				expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
				expect(screen.getByText('Test Workflow 2')).toBeInTheDocument();
			});

			// Type something in search
			const searchInput = screen.getByPlaceholderText('Search workflows...');
			await user.type(searchInput, 'workflow 1');

			await vi.waitFor(
				() => {
					expect(screen.queryByText('Test Workflow 2')).not.toBeInTheDocument();
				},
				{ timeout: 1000 },
			);

			// Clear the search
			await user.clear(searchInput);

			await vi.waitFor(
				() => {
					// Both workflows should be visible again
					expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
					expect(screen.getByText('Test Workflow 2')).toBeInTheDocument();
				},
				{ timeout: 1000 },
			);
		});

		it('should show no results when no workflows match search', async () => {
			const user = userEvent.setup({ delay: null });
			renderComponent({
				props: {
					migrationRuleId: 'rule-1',
				},
			});

			await waitFor(() => {
				expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
			});

			const searchInput = screen.getByPlaceholderText('Search workflows...');
			await user.type(searchInput, 'nonexistent workflow');

			await vi.waitFor(
				() => {
					expect(screen.queryByText('Test Workflow 1')).not.toBeInTheDocument();
					expect(screen.queryByText('Test Workflow 2')).not.toBeInTheDocument();
				},
				{ timeout: 1000 },
			);
		});
	});

	describe('status filter', () => {
		it('should render filter dropdown button', async () => {
			renderComponent({
				props: {
					migrationRuleId: 'rule-1',
				},
			});

			await waitFor(() => {
				const filterButton = screen.getByTestId('migration-rule-filters');
				expect(filterButton).toBeInTheDocument();
			});
		});

		it('should open filter dropdown when clicked', async () => {
			const user = userEvent.setup({ delay: null });
			renderComponent({
				props: {
					migrationRuleId: 'rule-1',
				},
			});

			await waitFor(() => {
				expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
			});

			// Open filter dropdown
			const filterButton = screen.getByTestId('migration-rule-filters');
			await user.click(filterButton);

			await waitFor(() => {
				const dropdown = screen.getByTestId('resources-list-filters-dropdown');
				expect(dropdown).toBeInTheDocument();
				// Check that the status filter label is visible
				expect(screen.getByText('Status')).toBeInTheDocument();
			});
		});

		it('should filter workflows by status', async () => {
			const user = userEvent.setup({ delay: null });
			renderComponent({
				props: {
					migrationRuleId: 'rule-1',
				},
			});

			await waitFor(() => {
				expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
				expect(screen.getByText('Test Workflow 2')).toBeInTheDocument();
			});

			// Open filter dropdown
			const filterButton = screen.getByTestId('migration-rule-filters');
			await user.click(filterButton);

			await waitFor(() => {
				expect(screen.getByTestId('resources-list-filters-dropdown')).toBeInTheDocument();
			});

			// Select "Active" status
			// Find the select combobox input and click it to open the dropdown
			const statusSelectWrapper = screen.getByTestId('migration-rule-status-filter');
			const statusSelectInput = statusSelectWrapper.querySelector('input[role="combobox"]');
			if (!statusSelectInput) throw new Error('Select input not found');
			await user.click(statusSelectInput);

			// Wait for options to appear and click Active
			await waitFor(() => {
				expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument();
			});
			const activeOption = screen.getByRole('option', { name: 'Active' });
			await user.click(activeOption);

			await waitFor(() => {
				// Only active workflow should be visible
				expect(screen.getByText('Test Workflow 1')).toBeInTheDocument();
				expect(screen.queryByText('Test Workflow 2')).not.toBeInTheDocument();
			});
		});
	});
});
