import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { createEventBus, type EventBus } from '@n8n/utils/event-bus';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { ResponseError } from '@n8n/rest-api-client';
import { STORES } from '@n8n/stores';
import { MIGRATE_WORKFLOW_MODAL_KEY } from '@/app/constants';
import * as breakingChangesApi from '@n8n/rest-api-client/api/breaking-changes';
import MigrateWorkflowModal from './MigrateWorkflowModal.vue';

vi.mock('@n8n/rest-api-client/api/breaking-changes', () => ({
	migrateWorkflowForRule: vi.fn(),
}));

const workflow = {
	id: 'workflow-1',
	name: 'Test Workflow',
	active: false,
	numberOfExecutions: 0,
	lastUpdatedAt: new Date('2024-01-15'),
	issues: [
		{
			nodeId: 'node-1',
			nodeName: 'AI Transform',
			title: 'Deprecated',
			description: '',
			level: 'error' as const,
		},
	],
};

const migrationResult = {
	workflowId: 'workflow-1',
	newVersionId: 'new-version-1234',
	migratedNodeIds: ['node-1'],
	unmapped: [],
	notes: [],
	republishable: false,
};

const recommendations = [
	{ action: 'Replace AI Transform with a Code node', description: 'Runs in the same sandbox.' },
];

let rootStore: ReturnType<typeof mockedStore<typeof useRootStore>>;
let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
let eventBus: EventBus;
const renderComponent = createComponentRenderer(MigrateWorkflowModal, {
	pinia: createTestingPinia({
		initialState: {
			[STORES.UI]: {
				modalStateById: {
					[MIGRATE_WORKFLOW_MODAL_KEY]: { open: true },
				},
			},
		},
	}),
	global: {
		stubs: {
			// Render the dialog body directly so it is queryable without the open-state portal.
			Dialog: {
				template: '<div role="dialog"><slot /></div>',
			},
			DialogHeader: { template: '<div><slot /></div>' },
			DialogTitle: { template: '<h2><slot /></h2>' },
			DialogDescription: { template: '<p><slot /></p>' },
			DialogFooter: { template: '<div><slot /></div>' },
		},
	},
});

const secondWorkflow = {
	...workflow,
	id: 'workflow-2',
	name: 'Second Workflow',
	issues: [{ ...workflow.issues[0], nodeId: 'node-2', nodeName: 'Other AI Transform' }],
};

function render(workflows = [workflow]) {
	eventBus = createEventBus();
	return renderComponent({
		props: {
			modalName: MIGRATE_WORKFLOW_MODAL_KEY,
			data: { ruleId: 'rule-1', workflows, recommendations, eventBus },
		},
	});
}

describe('MigrateWorkflowModal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		rootStore = mockedStore(useRootStore);
		rootStore.restApiContext = { baseUrl: 'http://localhost:5678', pushRef: 'test' };
		workflowsStore = mockedStore(useWorkflowsStore);
		vi.mocked(breakingChangesApi.migrateWorkflowForRule).mockResolvedValue(migrationResult);
	});

	it('closes without migrating when cancelled', async () => {
		const onClose = vi.fn();
		render();
		eventBus.on('closed', onClose);

		await userEvent.click(screen.getByTestId('migrate-modal-cancel-button'));

		expect(onClose).toHaveBeenCalled();
		expect(breakingChangesApi.migrateWorkflowForRule).not.toHaveBeenCalled();
	});

	it('shows the concrete change (rule recommendation) before confirming', () => {
		render();

		expect(screen.getByText('Replace AI Transform with a Code node')).toBeInTheDocument();
		expect(screen.getByText('Runs in the same sandbox.')).toBeInTheDocument();
	});

	it('migrates on confirm, shows success and reports back on the bus', async () => {
		const onMigrated = vi.fn();
		render();
		eventBus.on('migrated', onMigrated);

		await userEvent.click(screen.getByTestId('migrate-modal-confirm-button'));

		await waitFor(() =>
			expect(breakingChangesApi.migrateWorkflowForRule).toHaveBeenCalledWith(
				rootStore.restApiContext,
				'rule-1',
				'workflow-1',
			),
		);
		expect(onMigrated).toHaveBeenCalledWith({ workflowId: 'workflow-1' });
		// Success state: confirmation copy, an Open workflow link (resolving to a real
		// href, not "[object Object]"), and a Done action.
		expect(await screen.findByText(/was migrated and saved as a new version/)).toBeInTheDocument();
		expect(screen.getByText('Open workflow').closest('a')).toHaveAttribute(
			'href',
			'/workflow/workflow-1',
		);
		expect(screen.getByTestId('migrate-modal-done-button')).toBeInTheDocument();
	});

	it('offers Publish for a republishable migration and publishes on click', async () => {
		vi.mocked(breakingChangesApi.migrateWorkflowForRule).mockResolvedValue({
			...migrationResult,
			republishable: true,
		});
		render();

		await userEvent.click(screen.getByTestId('migrate-modal-confirm-button'));
		// Both CTAs make the two-step (migrate → publish) explicit.
		expect(await screen.findByTestId('migrate-modal-skip-publish-button')).toBeInTheDocument();
		await userEvent.click(screen.getByTestId('migrate-modal-publish-button'));

		await waitFor(() =>
			expect(workflowsStore.publishWorkflow).toHaveBeenCalledWith('workflow-1', {
				versionId: 'new-version-1234',
			}),
		);
	});

	it('does not offer Publish when the migration is not republishable', async () => {
		render();

		await userEvent.click(screen.getByTestId('migrate-modal-confirm-button'));

		await screen.findByTestId('migrate-modal-done-button');
		expect(screen.queryByTestId('migrate-modal-publish-button')).not.toBeInTheDocument();
	});

	it('surfaces migration warnings for review', async () => {
		vi.mocked(breakingChangesApi.migrateWorkflowForRule).mockResolvedValue({
			...migrationResult,
			notes: ['Include Binary File was carried over — review it manually.'],
		});
		render();

		await userEvent.click(screen.getByTestId('migrate-modal-confirm-button'));

		expect(
			await screen.findByText('Include Binary File was carried over — review it manually.'),
		).toBeInTheDocument();
	});

	it('shows the error (with a node link) when the migration is refused', async () => {
		vi.mocked(breakingChangesApi.migrateWorkflowForRule).mockRejectedValue(
			new ResponseError('This node has no generated code yet.', {
				httpStatusCode: 400,
				meta: { nodeId: 'node-1', nodeName: 'AI Transform' },
			}),
		);
		render();

		await userEvent.click(screen.getByTestId('migrate-modal-confirm-button'));

		expect(await screen.findByText('This node has no generated code yet.')).toBeInTheDocument();
		expect(screen.getByTestId('migrate-modal-close-button')).toBeInTheDocument();
	});

	describe('bulk', () => {
		it('names the number of workflows and shows the change once', () => {
			render([workflow, secondWorkflow]);

			// The title and the confirm button both name the count.
			expect(screen.getAllByText('Migrate 2 workflows')).toHaveLength(2);
			expect(screen.getByTestId('migrate-modal-confirm-button')).toHaveTextContent(
				'Migrate 2 workflows',
			);
			expect(screen.getAllByText('Replace AI Transform with a Code node')).toHaveLength(1);
		});

		it('migrates every workflow, keeps going after a failure and reports each result', async () => {
			vi.mocked(breakingChangesApi.migrateWorkflowForRule)
				.mockRejectedValueOnce(new ResponseError('This node has no generated code yet.'))
				.mockResolvedValueOnce({ ...migrationResult, workflowId: 'workflow-2' });
			const onMigrated = vi.fn();
			render([workflow, secondWorkflow]);
			eventBus.on('migrated', onMigrated);

			await userEvent.click(screen.getByTestId('migrate-modal-confirm-button'));

			expect(
				await screen.findByText(/1 workflow was migrated and saved as a new version/),
			).toBeInTheDocument();
			expect(breakingChangesApi.migrateWorkflowForRule).toHaveBeenCalledTimes(2);
			expect(breakingChangesApi.migrateWorkflowForRule).toHaveBeenNthCalledWith(
				2,
				rootStore.restApiContext,
				'rule-1',
				'workflow-2',
			);
			expect(onMigrated).toHaveBeenCalledTimes(1);
			expect(onMigrated).toHaveBeenCalledWith({ workflowId: 'workflow-2' });
			expect(screen.getByText('Second Workflow').closest('a')).toHaveAttribute(
				'href',
				'/workflow/workflow-2',
			);
			expect(screen.getByText('Could not migrate "Test Workflow"')).toBeInTheDocument();
			expect(screen.getByText(/This node has no generated code yet/)).toBeInTheDocument();
			expect(screen.getByTestId('migrate-modal-done-button')).toBeInTheDocument();
		});

		it('names the workflow of each warning', async () => {
			vi.mocked(breakingChangesApi.migrateWorkflowForRule)
				.mockResolvedValueOnce(migrationResult)
				.mockResolvedValueOnce({
					...migrationResult,
					workflowId: 'workflow-2',
					migratedNodeIds: ['node-2'],
					notes: ['Review the output format.'],
				});
			render([workflow, secondWorkflow]);

			await userEvent.click(screen.getByTestId('migrate-modal-confirm-button'));

			expect(
				await screen.findByText('Review the changes in "Second Workflow"'),
			).toBeInTheDocument();
			expect(screen.getByText('Review the output format.')).toBeInTheDocument();
			expect(screen.getByText('Other AI Transform').closest('a')).toHaveAttribute(
				'href',
				'/workflow/workflow-2/node-2',
			);
		});

		it('shows the progress and blocks closing while it migrates', async () => {
			let resolveFirst!: (result: typeof migrationResult) => void;
			vi.mocked(breakingChangesApi.migrateWorkflowForRule)
				.mockReturnValueOnce(new Promise((resolve) => (resolveFirst = resolve)))
				.mockResolvedValueOnce({ ...migrationResult, workflowId: 'workflow-2' });
			render([workflow, secondWorkflow]);

			await userEvent.click(screen.getByTestId('migrate-modal-confirm-button'));

			const confirmButton = screen.getByTestId('migrate-modal-confirm-button');
			expect(confirmButton).toHaveTextContent('Migrating 0 of 2');
			expect(confirmButton).toBeDisabled();
			expect(confirmButton).not.toHaveAttribute('aria-busy');
			expect(screen.getByTestId('migrate-modal-cancel-button')).toBeDisabled();

			resolveFirst(migrationResult);

			expect(await screen.findByTestId('migrate-modal-done-button')).toBeInTheDocument();
		});

		it('publishes only the republishable workflows', async () => {
			vi.mocked(breakingChangesApi.migrateWorkflowForRule)
				.mockResolvedValueOnce({ ...migrationResult, republishable: true })
				.mockResolvedValueOnce({ ...migrationResult, workflowId: 'workflow-2' });
			render([workflow, secondWorkflow]);

			await userEvent.click(screen.getByTestId('migrate-modal-confirm-button'));
			const publishButton = await screen.findByTestId('migrate-modal-publish-button');
			expect(publishButton).toHaveTextContent('Publish 1 workflow');
			await userEvent.click(publishButton);

			expect(
				await screen.findByText('Published 1 workflow to the migrated version'),
			).toBeInTheDocument();
			expect(workflowsStore.publishWorkflow).toHaveBeenCalledTimes(1);
			expect(workflowsStore.publishWorkflow).toHaveBeenCalledWith('workflow-1', {
				versionId: 'new-version-1234',
			});
			expect(screen.getByTestId('migrate-modal-done-button')).toBeInTheDocument();
		});
	});
});
