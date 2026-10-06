import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { EventBus } from '@n8n/utils/event-bus';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUIStore } from '@/app/stores/ui.store';
import * as usersApi from '@n8n/rest-api-client/api/users';
import { MIGRATE_WORKFLOW_MODAL_KEY } from '@/app/constants';
import MigrationRuleDetail from './MigrationRuleDetail.vue';
import * as breakingChangesApi from '@n8n/rest-api-client/api/breaking-changes';
import type { BreakingChangeRuleDetailResult } from '@n8n/api-types';

vi.mock('@n8n/rest-api-client/api/breaking-changes', () => ({
	getReportForRule: vi.fn(),
	migrateWorkflowForRule: vi.fn(),
	updateFindingStatus: vi.fn(),
	assignWorkflowOwner: vi.fn(),
	unassignWorkflowOwner: vi.fn(),
}));
vi.mock('@n8n/rest-api-client/api/users', () => ({
	getUsers: vi.fn(),
}));

const grace = {
	id: 'user-2',
	firstName: 'Grace',
	lastName: 'Hopper',
	email: 'grace@example.com',
};

const { showError, resolveRoute } = vi.hoisted(() => ({
	showError: vi.fn(),
	resolveRoute: vi.fn(() => ({ href: '/workflow/workflow-1' })),
}));

vi.mock('@n8n/composables/useToast', async (importOriginal) => ({
	...(await importOriginal<object>()),
	useToast: () => ({ showError }),
}));

// The test renderer has no router. The row click needs `resolve` to build the workflow URL.
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<object>()),
	useRouter: () => ({ push: vi.fn(), resolve: resolveRoute }),
}));

let rootStore: ReturnType<typeof mockedStore<typeof useRootStore>>;
let uiStore: ReturnType<typeof mockedStore<typeof useUIStore>>;
let rbacStore: ReturnType<typeof mockedStore<typeof useRBACStore>>;
let renderComponent: ReturnType<typeof createComponentRenderer>;

const mockWorkflowWithIssue = {
	id: 'workflow-1',
	name: 'Test Workflow 1',
	active: true,
	numberOfExecutions: 100,
	lastUpdatedAt: new Date('2024-01-15'),
	lastExecutedAt: new Date('2024-01-14'),
	status: 'open' as const,
	owner: {
		id: 'user-1',
		firstName: 'Ada',
		lastName: 'Lovelace',
		email: 'ada@example.com',
		source: 'suggested' as const,
	},
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
	status: 'open' as const,
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

const mockRuleResult: BreakingChangeRuleDetailResult = {
	ruleId: 'rule-1',
	ruleTitle: 'Test Rule',
	ruleDescription: 'This is a test rule description',
	ruleImpact: 'executionsFail',
	ruleDocumentationUrl: 'https://docs.example.com/rule-1',
	recommendations: [
		{
			action: 'Update the node',
			description: 'Please update to the latest version',
		},
	],
	migratable: false,
	affectedWorkflows: [mockWorkflowWithIssue, mockWorkflowWithMultipleNodes],
};

const createMockRuleResult = (
	overrides: Partial<BreakingChangeRuleDetailResult> = {},
): BreakingChangeRuleDetailResult => {
	return {
		ruleId: 'rule-1',
		ruleTitle: 'Test Rule',
		ruleDescription: 'This is a test rule description',
		ruleImpact: 'executionsFail',
		ruleDocumentationUrl: 'https://docs.example.com/rule-1',
		recommendations: [],
		migratable: false,
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
		uiStore = mockedStore(useUIStore);
		rbacStore = mockedStore(useRBACStore);
		rbacStore.hasScope.mockImplementation((scope) => scope === 'breakingChanges:migrate');
		vi.mocked(usersApi.getUsers).mockResolvedValue({ count: 1, items: [grace] });

		vi.mocked(breakingChangesApi.getReportForRule).mockResolvedValue(mockRuleResult);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('initial rendering', () => {
		it('should set the document title', () => {
			document.title = '';
			renderComponent({
				props: {
					migrationRuleId: 'rule-1',
				},
			});

			expect(document.title).toContain('Migration report');
		});

		it('should render rule details correctly', async () => {
			renderComponent({
				props: {
					migrationRuleId: 'rule-1',
				},
			});

			await waitFor(() => {
				// Title, impact tag, and affected count
				expect(screen.getByText('Test Rule')).toBeInTheDocument();
				expect(screen.getByText('Executions fail')).toBeInTheDocument();
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
				expect(screen.getByText('Owner')).toBeInTheDocument();
				expect(screen.getByText('Status', { selector: 'th' })).toBeInTheDocument();
				expect(screen.getByText('Nodes affected')).toBeInTheDocument();
				expect(screen.getByText(/Number of executions/)).toBeInTheDocument();
				expect(screen.getByText(/Last executed/)).toBeInTheDocument();
				expect(screen.getByText(/Last updated/)).toBeInTheDocument();
				expect(screen.getByText('State', { selector: 'th' })).toBeInTheDocument();
			});
		});

		it('should show the state right after the affected nodes', async () => {
			renderComponent({ props: { migrationRuleId: 'rule-1' } });

			await waitFor(() => {
				const titles = screen.getAllByRole('columnheader').map((th) => th.textContent?.trim());
				expect(titles.indexOf('State')).toBe(titles.indexOf('Nodes affected') + 1);
			});
		});
	});

	describe('finding state', () => {
		const getStateSelect = (workflowName: string) => {
			const row = screen.getByText(workflowName).closest('tr');
			if (!row) throw new Error('Row not found');
			return within(row).getByTestId('migration-finding-state-select');
		};

		// The select trigger marks its disabled state with `data-disabled`.
		const isStateDisabled = (workflowName: string) =>
			getStateSelect(workflowName).hasAttribute('data-disabled');

		const selectState = async (workflowName: string, label: string) => {
			await userEvent.click(getStateSelect(workflowName));
			const listbox = await screen.findByRole('listbox');
			await userEvent.click(within(listbox).getByText(label));
		};

		beforeEach(() => {
			vi.spyOn(window, 'open').mockImplementation(() => null);
		});

		afterEach(() => {
			vi.mocked(window.open).mockRestore();
		});

		it('should show the state of each finding', async () => {
			vi.mocked(breakingChangesApi.getReportForRule).mockResolvedValue(
				createMockRuleResult({
					affectedWorkflows: [
						mockWorkflowWithIssue,
						{ ...mockWorkflowWithMultipleNodes, status: 'wont_fix' },
					],
				}),
			);

			renderComponent({ props: { migrationRuleId: 'rule-1' } });

			await waitFor(() => {
				expect(getStateSelect('Test Workflow 1')).toHaveTextContent('Open');
				expect(getStateSelect('Test Workflow 2')).toHaveTextContent("Won't fix");
			});
		});

		it('should count only the open findings in the affected badge', async () => {
			vi.mocked(breakingChangesApi.getReportForRule).mockResolvedValue(
				createMockRuleResult({
					affectedWorkflows: [
						mockWorkflowWithIssue,
						{ ...mockWorkflowWithMultipleNodes, status: 'wont_fix' },
					],
				}),
			);

			renderComponent({ props: { migrationRuleId: 'rule-1' } });

			expect(await screen.findByText('1 affected')).toBeInTheDocument();
		});

		it('should save the new state and update the row and the badge', async () => {
			vi.mocked(breakingChangesApi.updateFindingStatus).mockResolvedValue();
			renderComponent({ props: { migrationRuleId: 'rule-1' } });
			await screen.findByText('2 affected');

			await selectState('Test Workflow 1', "Won't fix");

			await waitFor(() => {
				expect(getStateSelect('Test Workflow 1')).toHaveTextContent("Won't fix");
				expect(screen.getByText('1 affected')).toBeInTheDocument();
			});
			expect(breakingChangesApi.updateFindingStatus).toHaveBeenCalledWith(
				rootStore.restApiContext,
				'rule-1',
				'workflow-1',
				'wont_fix',
			);
			expect(breakingChangesApi.getReportForRule).toHaveBeenCalledTimes(1);
			expect(showError).not.toHaveBeenCalled();
		});

		it('should revert the state and show an error when the save fails', async () => {
			const error = new Error('Request failed');
			vi.mocked(breakingChangesApi.updateFindingStatus).mockRejectedValue(error);
			renderComponent({ props: { migrationRuleId: 'rule-1' } });
			await screen.findByText('2 affected');

			await selectState('Test Workflow 1', "Won't fix");

			await waitFor(() => {
				expect(showError).toHaveBeenCalledWith(error, 'Could not change the state');
			});
			expect(getStateSelect('Test Workflow 1')).toHaveTextContent('Open');
			expect(screen.getByText('2 affected')).toBeInTheDocument();
		});

		it('should disable the state of a row while its change is saving', async () => {
			let finishSave = () => {};
			vi.mocked(breakingChangesApi.updateFindingStatus).mockImplementation(
				async () => await new Promise<void>((resolve) => (finishSave = resolve)),
			);
			renderComponent({ props: { migrationRuleId: 'rule-1' } });
			await screen.findByText('2 affected');

			await selectState('Test Workflow 1', "Won't fix");

			await waitFor(() => expect(isStateDisabled('Test Workflow 1')).toBe(true));
			expect(isStateDisabled('Test Workflow 2')).toBe(false);

			finishSave();

			await waitFor(() => expect(isStateDisabled('Test Workflow 1')).toBe(false));
			expect(breakingChangesApi.updateFindingStatus).toHaveBeenCalledTimes(1);
		});

		it('should disable every state when the user cannot change states', async () => {
			rbacStore.hasScope.mockReturnValue(false);
			renderComponent({ props: { migrationRuleId: 'rule-1' } });
			await screen.findByText('2 affected');

			expect(rbacStore.hasScope).toHaveBeenCalledWith('breakingChanges:migrate');
			expect(isStateDisabled('Test Workflow 1')).toBe(true);
			expect(isStateDisabled('Test Workflow 2')).toBe(true);
			expect(getStateSelect('Test Workflow 1')).toHaveTextContent('Open');
		});

		it('should disable the state of a migrated row and leave it out of the badge', async () => {
			vi.mocked(breakingChangesApi.getReportForRule).mockResolvedValue(
				createMockRuleResult({
					migratable: true,
					affectedWorkflows: [mockWorkflowWithIssue, mockWorkflowWithMultipleNodes],
				}),
			);
			renderComponent({ props: { migrationRuleId: 'rule-1' } });
			await screen.findByText('2 affected');

			const [migrateButton] = screen.getAllByTestId('migrate-workflow-button');
			await userEvent.click(migrateButton);
			const { data } = vi.mocked(uiStore.openModalWithData).mock.calls[0][0];
			(data.eventBus as EventBus).emit('migrated', { workflowId: mockWorkflowWithIssue.id });

			await waitFor(() => expect(isStateDisabled('Test Workflow 1')).toBe(true));
			expect(isStateDisabled('Test Workflow 2')).toBe(false);
			expect(screen.getByText('1 affected')).toBeInTheDocument();
		});

		it('should not open the workflow when the state is changed', async () => {
			vi.mocked(breakingChangesApi.updateFindingStatus).mockResolvedValue();
			renderComponent({ props: { migrationRuleId: 'rule-1' } });
			await screen.findByText('2 affected');

			await selectState('Test Workflow 1', "Won't fix");

			await waitFor(() => {
				expect(breakingChangesApi.updateFindingStatus).toHaveBeenCalled();
			});
			expect(window.open).not.toHaveBeenCalled();
		});

		it('should open the workflow when the row is clicked', async () => {
			renderComponent({ props: { migrationRuleId: 'rule-1' } });

			await userEvent.click(await screen.findByText('Test Workflow 1'));

			expect(window.open).toHaveBeenCalledWith('/workflow/workflow-1', '_blank');
		});
	});

	describe('migration', () => {
		it('should not render a Migrate button when the rule is not migratable', async () => {
			vi.mocked(breakingChangesApi.getReportForRule).mockResolvedValue(mockRuleResult);
			renderComponent({ props: { migrationRuleId: 'rule-1' } });

			await waitFor(() => expect(screen.getByText('Test Rule')).toBeInTheDocument());
			expect(screen.queryByTestId('migrate-workflow-button')).not.toBeInTheDocument();
		});

		it('opens the migrate modal with the rule and workflow when Migrate is clicked', async () => {
			vi.mocked(breakingChangesApi.getReportForRule).mockResolvedValue(
				createMockRuleResult({ migratable: true, affectedWorkflows: [mockWorkflowWithIssue] }),
			);

			renderComponent({ props: { migrationRuleId: 'rule-1' } });
			await userEvent.click(await screen.findByTestId('migrate-workflow-button'));

			expect(uiStore.openModalWithData).toHaveBeenCalledWith(
				expect.objectContaining({
					name: MIGRATE_WORKFLOW_MODAL_KEY,
					data: expect.objectContaining({
						ruleId: 'rule-1',
						workflow: expect.objectContaining({ id: mockWorkflowWithIssue.id }),
					}),
				}),
			);
			// Nothing is migrated yet — the modal drives that.
			expect(screen.getByTestId('migrate-workflow-button')).toBeInTheDocument();
		});

		it('marks the row migrated when the modal reports a successful migration', async () => {
			vi.mocked(breakingChangesApi.getReportForRule).mockResolvedValue(
				createMockRuleResult({ migratable: true, affectedWorkflows: [mockWorkflowWithIssue] }),
			);

			renderComponent({ props: { migrationRuleId: 'rule-1' } });
			await userEvent.click(await screen.findByTestId('migrate-workflow-button'));

			// Emit on the same bus the detail passed into the modal.
			const { data } = vi.mocked(uiStore.openModalWithData).mock.calls[0][0];
			(data.eventBus as EventBus).emit('migrated', { workflowId: mockWorkflowWithIssue.id });

			await waitFor(() =>
				expect(screen.queryByTestId('migrate-workflow-button')).not.toBeInTheDocument(),
			);
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

		it('should show the owner name, or Unassigned when the workflow has none', async () => {
			rbacStore.hasScope.mockReturnValue(false);
			renderComponent({
				props: {
					migrationRuleId: 'rule-1',
				},
			});

			await waitFor(() => {
				expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
				expect(screen.getByText('Unassigned')).toBeInTheDocument();
			});
		});

		it('should offer an owner picker per row to a user with the migrate scope, showing the current owner', async () => {
			renderComponent({ props: { migrationRuleId: 'rule-1' } });

			await waitFor(() => {
				expect(screen.getAllByTestId('migration-owner-select')).toHaveLength(2);
			});
			// No picker was opened yet, so no member search ran.
			expect(usersApi.getUsers).not.toHaveBeenCalled();
			expect(screen.getByDisplayValue('Ada Lovelace (ada@example.com)')).toBeInTheDocument();
		});

		it('should show a plain label for a user without the migrate scope', async () => {
			rbacStore.hasScope.mockReturnValue(false);
			renderComponent({ props: { migrationRuleId: 'rule-1' } });

			await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeInTheDocument());
			expect(screen.queryByTestId('migration-owner-select')).not.toBeInTheDocument();
		});

		it("searches the members of the row's project, assigns the picked user and shows the returned owner", async () => {
			vi.mocked(breakingChangesApi.assignWorkflowOwner).mockResolvedValue({
				owner: { ...grace, source: 'assigned' },
			});
			vi.mocked(breakingChangesApi.getReportForRule).mockResolvedValue(
				createMockRuleResult({
					affectedWorkflows: [{ ...mockWorkflowWithMultipleNodes, homeProjectId: 'project-1' }],
				}),
			);
			const { baseElement } = renderComponent({ props: { migrationRuleId: 'rule-1' } });
			await waitFor(() => expect(screen.getByTestId('migration-owner-select')).toBeInTheDocument());

			await userEvent.click(screen.getByRole('combobox'));
			await waitFor(() => {
				expect(usersApi.getUsers).toHaveBeenCalledWith(
					expect.anything(),
					expect.objectContaining({ filter: { projectId: 'project-1' } }),
				);
			});
			await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
			const option = await waitFor(() => {
				const found = baseElement.querySelector('#user-select-option-id-user-2');
				expect(found).not.toBeNull();
				return found as HTMLElement;
			});
			await userEvent.click(option);

			await waitFor(() => {
				expect(breakingChangesApi.assignWorkflowOwner).toHaveBeenCalledWith(
					expect.anything(),
					'workflow-2',
					'user-2',
				);
			});
			await waitFor(() => {
				expect(screen.getByDisplayValue('Grace Hopper (grace@example.com)')).toBeInTheDocument();
			});
		});

		it('ignores a member search that answers after a newer one', async () => {
			const slowSearch = Promise.withResolvers<{ count: number; items: Array<typeof grace> }>();
			vi.mocked(usersApi.getUsers)
				.mockReturnValueOnce(slowSearch.promise)
				.mockResolvedValueOnce({ count: 1, items: [grace] });
			vi.mocked(breakingChangesApi.getReportForRule).mockResolvedValue(
				createMockRuleResult({
					affectedWorkflows: [
						{ ...mockWorkflowWithIssue, owner: undefined, homeProjectId: 'project-1' },
						{ ...mockWorkflowWithMultipleNodes, homeProjectId: 'project-2' },
					],
				}),
			);
			const { baseElement } = renderComponent({ props: { migrationRuleId: 'rule-1' } });
			await waitFor(() => expect(screen.getAllByRole('combobox')).toHaveLength(2));

			// The first row's search hangs; the second row's answers at once.
			await userEvent.click(screen.getAllByRole('combobox')[0]);
			await userEvent.click(screen.getAllByRole('combobox')[1]);
			await waitFor(() => expect(usersApi.getUsers).toHaveBeenCalledTimes(2));
			await waitFor(() => {
				expect(baseElement.querySelector('#user-select-option-id-user-2')).not.toBeNull();
			});

			slowSearch.resolve({
				count: 1,
				items: [{ id: 'user-9', firstName: 'Late', lastName: 'Answer', email: 'late@example.com' }],
			});
			await new Promise((resolve) => setTimeout(resolve, 0));

			expect(baseElement.querySelector('#user-select-option-id-user-9')).toBeNull();
			expect(baseElement.querySelector('#user-select-option-id-user-2')).not.toBeNull();
		});

		it('clears the assignment and shows the suggestion that comes back', async () => {
			vi.mocked(breakingChangesApi.unassignWorkflowOwner).mockResolvedValue({
				owner: { ...grace, source: 'suggested' },
			});
			vi.mocked(breakingChangesApi.getReportForRule).mockResolvedValue(
				createMockRuleResult({ affectedWorkflows: [mockWorkflowWithIssue] }),
			);
			renderComponent({ props: { migrationRuleId: 'rule-1' } });
			await waitFor(() => {
				expect(screen.getByDisplayValue('Ada Lovelace (ada@example.com)')).toBeInTheDocument();
			});

			// The clear icon replaces the caret while the trigger is hovered and has a value.
			const picker = screen.getByTestId('migration-owner-select');
			await userEvent.hover(picker.querySelector('.select-trigger') as HTMLElement);
			const clearButton = await waitFor(() => {
				const found = picker.querySelector('.el-select__caret');
				expect(found).not.toBeNull();
				return found as HTMLElement;
			});
			await userEvent.click(clearButton);

			await waitFor(() => {
				expect(breakingChangesApi.unassignWorkflowOwner).toHaveBeenCalledWith(
					expect.anything(),
					'workflow-1',
				);
			});
			await waitFor(() => {
				expect(screen.getByDisplayValue('Grace Hopper (grace@example.com)')).toBeInTheDocument();
			});
		});

		it('should fall back to the email when the owner has no name', async () => {
			rbacStore.hasScope.mockReturnValue(false);
			vi.mocked(breakingChangesApi.getReportForRule).mockResolvedValue(
				createMockRuleResult({
					affectedWorkflows: [
						{
							...mockWorkflowWithIssue,
							owner: { ...mockWorkflowWithIssue.owner, firstName: null, lastName: null },
						},
					],
				}),
			);

			renderComponent({
				props: {
					migrationRuleId: 'rule-1',
				},
			});

			await waitFor(() => {
				expect(screen.getByText('ada@example.com')).toBeInTheDocument();
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

	describe('impact display', () => {
		it.each([
			{ impact: 'upgradeBlocked', label: 'Upgrade blocked' },
			{ impact: 'executionsFail', label: 'Executions fail' },
			{ impact: 'behaviorChanges', label: 'Behavior changes' },
			{ impact: 'capabilityRemoved', label: 'Capability removed' },
		] as const)('should display $impact impact correctly', async ({ impact, label }) => {
			vi.mocked(breakingChangesApi.getReportForRule).mockResolvedValue(
				createMockRuleResult({
					ruleImpact: impact,
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

		it('should sort by the shown owner label in both directions', async () => {
			rbacStore.hasScope.mockReturnValue(false);
			vi.mocked(breakingChangesApi.getReportForRule).mockResolvedValue(
				createMockRuleResult({
					affectedWorkflows: [
						{
							...mockWorkflowWithIssue,
							owner: { ...mockWorkflowWithIssue.owner, firstName: 'Zed', lastName: 'Zulu' },
						},
						{ ...mockWorkflowWithMultipleNodes, owner: mockWorkflowWithIssue.owner },
					],
				}),
			);
			renderComponent({
				props: {
					migrationRuleId: 'rule-1',
				},
			});
			// Default order is by executions, so the Zed Zulu workflow comes first.
			await waitFor(() => {
				expect(screen.getAllByRole('row')[1].textContent).toContain('Test Workflow 1');
			});

			await userEvent.click(screen.getByRole('columnheader', { name: /Owner/ }));
			await waitFor(() => {
				expect(screen.getAllByRole('row')[1].textContent).toContain('Ada Lovelace');
			});

			await userEvent.click(screen.getByRole('columnheader', { name: /Owner/ }));
			await waitFor(() => {
				expect(screen.getAllByRole('row')[1].textContent).toContain('Zed Zulu');
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

			// Open filter dropdown - click the actual trigger button inside ResourceFiltersDropdown
			const filterButton = screen.getByTestId('resources-list-filters-trigger');
			await user.click(filterButton);

			await waitFor(() => {
				const dropdown = screen.getByTestId('resources-list-filters-dropdown');
				expect(dropdown).toBeInTheDocument();
				// Check that the status filter label is visible. Ignore 'th' elements to avoid confusion with table headers.
				expect(screen.getByText('Status', { ignore: 'th' })).toBeInTheDocument();
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

			// Open filter dropdown - click the actual trigger button inside ResourceFiltersDropdown
			const filterButton = screen.getByTestId('resources-list-filters-trigger');
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
