import { ref } from 'vue';
import { describe, it, expect, vi, beforeEach, type MockInstance } from 'vitest';
import { useWorkflowCommands } from './useWorkflowCommands';
import * as useCanvasOperations from '@/app/composables/useCanvasOperations';
import { useTagsStore } from '@/features/shared/tags/tags.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { canvasEventBus } from '@/features/workflows/canvas/canvas.eventBus';
import { nodeViewEventBus } from '@/app/event-bus';
import { createTestWorkflow } from '@/__tests__/mocks';
import type { IWorkflowDb, INodeUi } from '@/Interface';
import type { Ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

vi.mock('@/app/composables/useCanvasOperations');
vi.mock('@/app/composables/useWorkflowHelpers');
vi.mock('@/app/composables/useTelemetry');
vi.mock('@/app/composables/useWorkflowSaving');
vi.mock('@/app/composables/useRunWorkflow');
vi.mock('@/features/workflows/canvas/canvas.eventBus');
vi.mock('@/app/event-bus');
vi.mock('vue-router', () => ({
	useRouter: () => ({
		resolve: vi.fn((route) => ({ href: `/workflow/${route.params.name}` })),
	}),
	useRoute: () => ({}),
	RouterLink: vi.fn(),
}));
vi.mock('@n8n/i18n', async (importOriginal) => ({
	...(await importOriginal()),
	useI18n: () => ({
		baseText: (key: string) => key,
	}),
}));
vi.mock('file-saver', () => ({
	saveAs: vi.fn(),
}));
const mockTelemetryTrack = vi.fn();
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: () => ({
		track: mockTelemetryTrack,
	}),
}));

const getWorkflowDataToSaveMock = vi.fn();
vi.mock('@/app/composables/useWorkflowHelpers', () => ({
	useWorkflowHelpers: () => ({
		getWorkflowDataToSave: getWorkflowDataToSaveMock,
	}),
}));

const saveCurrentWorkflowMock = vi.fn();
vi.mock('@/app/composables/useWorkflowSaving', () => ({
	useWorkflowSaving: () => ({
		saveCurrentWorkflow: saveCurrentWorkflowMock,
	}),
}));

describe('useWorkflowCommands', () => {
	let mockWorkflow: Ref<IWorkflowDb>;
	let mockUIStore: ReturnType<typeof useUIStore>;
	let mockTagsStore: ReturnType<typeof useTagsStore>;
	let mockWorkflowsStore: ReturnType<typeof useWorkflowsStore>;
	let mockSourceControlStore: ReturnType<typeof useSourceControlStore>;

	beforeEach(() => {
		setActivePinia(createTestingPinia());

		mockWorkflow = ref(
			createTestWorkflow({
				id: 'workflow-123',
				name: 'Test Workflow',
				nodes: [],
				connections: {},
				active: false,
				isArchived: false,
				scopes: ['workflow:read', 'workflow:update', 'workflow:create', 'workflow:delete'],
			}),
		);

		mockUIStore = useUIStore();
		mockTagsStore = useTagsStore();
		mockWorkflowsStore = useWorkflowsStore();
		mockSourceControlStore = useSourceControlStore();

		getWorkflowDataToSaveMock.mockResolvedValue(mockWorkflow.value);
		saveCurrentWorkflowMock.mockResolvedValue(true);

		mockWorkflowsStore.workflow = mockWorkflow.value;
		// Mark workflow as existing by adding it to workflowsById
		mockWorkflowsStore.workflowsById = { [mockWorkflow.value.id]: mockWorkflow.value };

		Object.defineProperty(mockUIStore, 'isActionActive', {
			value: { workflowSaving: false } as unknown as typeof mockUIStore.isActionActive,
		});
		Object.defineProperty(mockUIStore, 'openExistingCredential', {
			value: vi.fn() as unknown as typeof mockUIStore.openExistingCredential,
		});
		Object.defineProperty(mockUIStore, 'openModal', {
			value: vi.fn() as unknown as typeof mockUIStore.openModal,
		});
		Object.defineProperty(mockUIStore, 'openModalWithData', {
			value: vi.fn() as unknown as typeof mockUIStore.openModalWithData,
		});

		mockTagsStore.tagsById = {
			tag1: { id: 'tag1', name: 'Tag 1' },
		};

		mockSourceControlStore.preferences.branchReadOnly = false;

		const canvasOperationsMock: MockInstance = vi.spyOn(useCanvasOperations, 'useCanvasOperations');
		canvasOperationsMock.mockReturnValue({ editableWorkflow: mockWorkflow });

		canvasEventBus.emit = vi.fn();
		nodeViewEventBus.emit = vi.fn();
	});

	describe('credential commands', () => {
		it('should return empty array when no credentials exist', () => {
			mockWorkflow.value.nodes = [];
			const { commands } = useWorkflowCommands();
			const credentialCommands = commands.value.filter((cmd) => cmd.id === 'open-credential');
			expect(credentialCommands).toHaveLength(0);
		});

		it('should return credential commands when credentials exist', () => {
			mockWorkflow.value.nodes = [
				{
					id: 'node1',
					name: 'node1',
					type: 'n8n-nodes-base.httpRequest',
					position: [0, 0],
					parameters: {},
					credentials: {
						httpAuth: { id: 'cred1', name: 'My Credential' },
					},
				} as unknown as INodeUi,
			];

			const { commands } = useWorkflowCommands();
			const credentialCommand = commands.value.find((cmd) => cmd.id === 'open-credential');

			expect(credentialCommand).toBeDefined();
			expect(credentialCommand?.children).toHaveLength(1);
			expect(credentialCommand?.children?.[0].title).toBe('My Credential');
		});

		it('should handle credential click', async () => {
			mockWorkflow.value.nodes = [
				{
					id: 'node1',
					name: 'node1',
					type: 'n8n-nodes-base.httpRequest',
					position: [0, 0],
					parameters: {},
					credentials: {
						httpAuth: { id: 'cred1', name: 'My Credential' },
					},
				} as unknown as INodeUi,
			];

			const { commands } = useWorkflowCommands();
			const credentialCommand = commands.value.find((cmd) => cmd.id === 'open-credential');
			await credentialCommand?.children?.[0].handler?.();

			expect(mockUIStore.openExistingCredential).toHaveBeenCalledWith('cred1');
		});
	});

	describe('canvas actions', () => {
		it('should include save command when user has update permission and workflow is not saving', () => {
			const { commands } = useWorkflowCommands();
			const saveCommand = commands.value.find((cmd) => cmd.id === 'save-workflow');

			expect(saveCommand).toBeDefined();
		});

		it('should not include save command when workflow is saving', () => {
			mockUIStore.isActionActive.workflowSaving = true;

			const { commands } = useWorkflowCommands();
			const saveCommand = commands.value.find((cmd) => cmd.id === 'save-workflow');

			expect(saveCommand).toBeUndefined();
		});

		it('should not include save command when workflow is archived', () => {
			mockWorkflowsStore.workflow.isArchived = true;

			const { commands } = useWorkflowCommands();
			const saveCommand = commands.value.find((cmd) => cmd.id === 'save-workflow');

			expect(saveCommand).toBeUndefined();
		});

		it('should handle save workflow', async () => {
			const { commands } = useWorkflowCommands();
			const saveCommand = commands.value.find((cmd) => cmd.id === 'save-workflow');

			await saveCommand?.handler?.();

			expect(saveCurrentWorkflowMock).toHaveBeenCalled();
			expect(canvasEventBus.emit).toHaveBeenCalledWith('saved:workflow');
		});

		it('should include test workflow command', () => {
			const { commands } = useWorkflowCommands();
			const testCommand = commands.value.find((cmd) => cmd.id === 'test-workflow');

			expect(testCommand).toBeDefined();
		});

		it('should handle tidy up command', async () => {
			const { commands } = useWorkflowCommands();
			const tidyUpCommand = commands.value.find((cmd) => cmd.id === 'tidy-up-workflow');

			expect(tidyUpCommand).toBeDefined();
			await tidyUpCommand?.handler?.();

			expect(canvasEventBus.emit).toHaveBeenCalledWith('tidyUp', { source: 'command-bar' });
		});

		it('should handle rename workflow', async () => {
			const { commands } = useWorkflowCommands();
			const renameCommand = commands.value.find((cmd) => cmd.id === 'rename-workflow');

			await renameCommand?.handler?.();

			expect(nodeViewEventBus.emit).toHaveBeenCalledWith('renameWorkflow');
		});

		it('should handle add tag', async () => {
			const { commands } = useWorkflowCommands();
			const addTagCommand = commands.value.find((cmd) => cmd.id === 'add-tag');

			await addTagCommand?.handler?.();

			expect(nodeViewEventBus.emit).toHaveBeenCalledWith('addTag');
		});

		it('should handle select all', async () => {
			const { commands } = useWorkflowCommands();
			const selectAllCommand = commands.value.find((cmd) => cmd.id === 'select-all');

			await selectAllCommand?.handler?.();

			expect(canvasEventBus.emit).toHaveBeenCalledWith('nodes:selectAll');
		});

		it('should handle open workflow settings', async () => {
			const { commands } = useWorkflowCommands();
			const settingsCommand = commands.value.find((cmd) => cmd.id === 'open-workflow-settings');

			await settingsCommand?.handler?.();

			expect(mockUIStore.openModal).toHaveBeenCalledWith('settings');
		});
	});

	describe('duplicate workflow', () => {
		it('should not include duplicate command when user lacks create permission', () => {
			mockWorkflowsStore.workflow.scopes = ['workflow:read', 'workflow:update'];

			const { commands } = useWorkflowCommands();
			const duplicateCommand = commands.value.find((cmd) => cmd.id === 'duplicate-workflow');

			expect(duplicateCommand).toBeUndefined();
		});

		it('should handle duplicate workflow', async () => {
			mockWorkflow.value.tags = ['tag1'];

			const { commands } = useWorkflowCommands();
			const duplicateCommand = commands.value.find((cmd) => cmd.id === 'duplicate-workflow');

			await duplicateCommand?.handler?.();

			expect(mockUIStore.openModalWithData).toHaveBeenCalledWith({
				name: 'duplicate',
				data: {
					id: 'workflow-123',
					name: 'Test Workflow',
					tags: ['tag1'],
				},
			});
		});
	});

	describe('publish/unpublish commands', () => {
		it('should show publish command when user has update permission and workflow is not archived', () => {
			const { commands } = useWorkflowCommands();
			const publishCommand = commands.value.find((cmd) => cmd.id === 'publish-workflow');

			expect(publishCommand).toBeDefined();
		});

		it('should show unpublish command when user has update permission and workflow is not archived', () => {
			const { commands } = useWorkflowCommands();
			const unpublishCommand = commands.value.find((cmd) => cmd.id === 'unpublish-workflow');

			expect(unpublishCommand).toBeDefined();
		});

		it('should not show publish/unpublish commands when workflow is archived', () => {
			mockWorkflowsStore.workflow.isArchived = true;

			const { commands } = useWorkflowCommands();
			const publishCommand = commands.value.find((cmd) => cmd.id === 'publish-workflow');
			const unpublishCommand = commands.value.find((cmd) => cmd.id === 'unpublish-workflow');

			expect(publishCommand).toBeUndefined();
			expect(unpublishCommand).toBeUndefined();
		});

		it('should handle publish workflow', async () => {
			const { commands } = useWorkflowCommands();
			const publishCommand = commands.value.find((cmd) => cmd.id === 'publish-workflow');

			await publishCommand?.handler?.();

			expect(nodeViewEventBus.emit).toHaveBeenCalledWith('publishWorkflow');
		});

		it('should handle unpublish workflow', async () => {
			const { commands } = useWorkflowCommands();
			const unpublishCommand = commands.value.find((cmd) => cmd.id === 'unpublish-workflow');

			await unpublishCommand?.handler?.();

			expect(nodeViewEventBus.emit).toHaveBeenCalledWith('unpublishWorkflow');
		});
	});

	describe('subworkflow commands', () => {
		it('should return empty array when no subworkflows exist', () => {
			mockWorkflow.value.nodes = [];

			const { commands } = useWorkflowCommands();
			const subworkflowCommand = commands.value.find((cmd) => cmd.id === 'open-sub-workflow');

			expect(subworkflowCommand).toBeUndefined();
		});

		it('should return subworkflow commands when Execute Workflow nodes exist', () => {
			mockWorkflow.value.nodes = [
				{
					id: 'node1',
					name: 'node1',
					type: 'n8n-nodes-base.executeWorkflow',
					position: [0, 0],
					parameters: {
						workflowId: {
							__rl: true,
							mode: 'list',
							value: 'subworkflow-1',
							cachedResultName: 'Subworkflow 1',
						},
					},
				} as unknown as INodeUi,
			];

			const { commands } = useWorkflowCommands();
			const subworkflowCommand = commands.value.find((cmd) => cmd.id === 'open-sub-workflow');

			expect(subworkflowCommand).toBeDefined();
			expect(subworkflowCommand?.children).toHaveLength(1);
			expect(subworkflowCommand?.children?.[0].title).toBe('Subworkflow 1');
		});
	});

	describe('export commands', () => {
		it('should handle download workflow', async () => {
			const { saveAs } = await import('file-saver');

			const { commands } = useWorkflowCommands();
			const downloadCommand = commands.value.find((cmd) => cmd.id === 'download-workflow');

			await downloadCommand?.handler?.();

			expect(getWorkflowDataToSaveMock).toHaveBeenCalled();
			expect(mockTelemetryTrack).toHaveBeenCalledWith('User exported workflow', {
				workflow_id: 'workflow-123',
			});
			expect(saveAs).toHaveBeenCalled();
		});
	});

	describe('import commands', () => {
		it('should handle import from URL', async () => {
			const { commands } = useWorkflowCommands();
			const importCommand = commands.value.find((cmd) => cmd.id === 'import-workflow-from-url');

			await importCommand?.handler?.();

			expect(mockUIStore.openModal).toHaveBeenCalledWith('importWorkflowUrl');
		});

		it('should handle import from file', async () => {
			const { commands } = useWorkflowCommands();
			const importCommand = commands.value.find((cmd) => cmd.id === 'import-workflow-from-file');

			await importCommand?.handler?.();

			expect(nodeViewEventBus.emit).toHaveBeenCalledWith('importWorkflowFromFile');
		});
	});

	describe('lifecycle commands', () => {
		it('should show archive command when workflow is not archived', () => {
			mockWorkflowsStore.workflow.isArchived = false;

			const { commands } = useWorkflowCommands();
			const archiveCommand = commands.value.find((cmd) => cmd.id === 'archive-workflow');
			const unarchiveCommand = commands.value.find((cmd) => cmd.id === 'unarchive-workflow');

			expect(archiveCommand).toBeDefined();
			expect(unarchiveCommand).toBeUndefined();
		});

		it('should show unarchive and delete commands when workflow is archived', () => {
			mockWorkflowsStore.workflow.isArchived = true;

			const { commands } = useWorkflowCommands();
			const archiveCommand = commands.value.find((cmd) => cmd.id === 'archive-workflow');
			const unarchiveCommand = commands.value.find((cmd) => cmd.id === 'unarchive-workflow');
			const deleteCommand = commands.value.find((cmd) => cmd.id === 'delete-workflow');

			expect(archiveCommand).toBeUndefined();
			expect(unarchiveCommand).toBeDefined();
			expect(deleteCommand).toBeDefined();
		});

		it('should not show lifecycle commands without delete permission', () => {
			mockWorkflowsStore.workflow.scopes = ['workflow:read', 'workflow:update'];

			const { commands } = useWorkflowCommands();
			const archiveCommand = commands.value.find((cmd) => cmd.id === 'archive-workflow');
			const deleteCommand = commands.value.find((cmd) => cmd.id === 'delete-workflow');

			expect(archiveCommand).toBeUndefined();
			expect(deleteCommand).toBeUndefined();
		});

		it('should handle archive workflow', async () => {
			const { commands } = useWorkflowCommands();
			const archiveCommand = commands.value.find((cmd) => cmd.id === 'archive-workflow');

			await archiveCommand?.handler?.();

			expect(nodeViewEventBus.emit).toHaveBeenCalledWith('archiveWorkflow');
		});

		it('should handle unarchive workflow', async () => {
			mockWorkflowsStore.workflow.isArchived = true;

			const { commands } = useWorkflowCommands();
			const unarchiveCommand = commands.value.find((cmd) => cmd.id === 'unarchive-workflow');

			await unarchiveCommand?.handler?.();

			expect(nodeViewEventBus.emit).toHaveBeenCalledWith('unarchiveWorkflow');
		});

		it('should handle delete workflow', async () => {
			mockWorkflowsStore.workflow.isArchived = true;

			const { commands } = useWorkflowCommands();
			const deleteCommand = commands.value.find((cmd) => cmd.id === 'delete-workflow');

			await deleteCommand?.handler?.();

			expect(nodeViewEventBus.emit).toHaveBeenCalledWith('deleteWorkflow');
		});
	});

	describe('permissions', () => {
		it('should respect read-only branch mode', () => {
			mockSourceControlStore.preferences.branchReadOnly = true;

			const { commands } = useWorkflowCommands();
			const saveCommand = commands.value.find((cmd) => cmd.id === 'save-workflow');

			expect(saveCommand).toBeUndefined();
		});

		it('should allow actions for new workflows regardless of permissions', () => {
			// For new workflows, remove from workflowsById so isNewWorkflow returns true
			mockWorkflowsStore.workflowsById = {};
			mockWorkflowsStore.workflow.scopes = ['workflow:read'];

			const { commands } = useWorkflowCommands();
			const saveCommand = commands.value.find((cmd) => cmd.id === 'save-workflow');

			expect(saveCommand).toBeDefined();
		});
	});
});
