import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useWorkflowUpdate } from './useWorkflowUpdate';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useBuilderStore } from '@/features/ai/assistant/builder.store';
import { mockedStore } from '@/__tests__/utils';
import { createTestNode } from '@/__tests__/mocks';
import type { INodeUi } from '@/Interface';
import { DEFAULT_NEW_WORKFLOW_NAME } from '@/app/constants';

// Mock canvas event bus - using hoisted to ensure proper initialization order
const canvasEventBusEmitMock = vi.hoisted(() => vi.fn());
vi.mock('@/features/workflows/canvas/canvas.eventBus', () => ({
	canvasEventBus: {
		emit: canvasEventBusEmitMock,
	},
}));

// Mock canvas utils - using hoisted for proper initialization
const mockMapLegacyConnectionsToCanvasConnections = vi.hoisted(() => vi.fn().mockReturnValue([]));
vi.mock('@/features/workflows/canvas/canvas.utils', () => ({
	mapLegacyConnectionsToCanvasConnections: mockMapLegacyConnectionsToCanvasConnections,
}));

// Mock useWorkflowState - using hoisted for proper initialization
const mockWorkflowState = vi.hoisted(() => ({
	resetParametersLastUpdatedAt: vi.fn(),
	setWorkflowName: vi.fn(),
}));
vi.mock('@/app/composables/useWorkflowState', () => ({
	injectWorkflowState: vi.fn(() => mockWorkflowState),
}));

// Mock useCanvasOperations - using hoisted for proper initialization
const mockCanvasOperations = vi.hoisted(() => ({
	deleteNode: vi.fn(),
	addNodes: vi.fn().mockResolvedValue([]),
	deleteConnection: vi.fn(),
	addConnections: vi.fn().mockResolvedValue(undefined),
	renameNode: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/app/composables/useCanvasOperations', () => ({
	useCanvasOperations: vi.fn(() => mockCanvasOperations),
}));

// Mock nodeTypesUtils
vi.mock('@/app/utils/nodeTypesUtils', () => ({
	getMainAuthField: vi.fn(),
	getAuthTypeForNodeCredential: vi.fn(),
}));

describe('useWorkflowUpdate', () => {
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let builderStore: ReturnType<typeof mockedStore<typeof useBuilderStore>>;
	let credentialsStore: ReturnType<typeof mockedStore<typeof useCredentialsStore>>;
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;

	beforeEach(() => {
		vi.clearAllMocks();

		setActivePinia(createTestingPinia());

		workflowsStore = mockedStore(useWorkflowsStore);
		builderStore = mockedStore(useBuilderStore);
		credentialsStore = mockedStore(useCredentialsStore);
		nodeTypesStore = mockedStore(useNodeTypesStore);

		// Reset canvas utils mock to default behavior
		mockMapLegacyConnectionsToCanvasConnections.mockReturnValue([]);

		// Setup default mocks
		workflowsStore.allNodes = [];
		workflowsStore.workflow = {
			id: 'test-workflow',
			name: DEFAULT_NEW_WORKFLOW_NAME,
			nodes: [],
			connections: {},
		} as unknown as ReturnType<typeof useWorkflowsStore>['workflow'];
		workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue({
			nodes: {},
			connectionsBySourceNode: {},
			renameNode: vi.fn(),
		});
		workflowsStore.setNodes = vi.fn();
		workflowsStore.setConnections = vi.fn();
		workflowsStore.nodesByName = {};

		builderStore.setBuilderMadeEdits = vi.fn();

		credentialsStore.getCredentialsByType = vi.fn().mockReturnValue([]);
		nodeTypesStore.getNodeType = vi.fn();
	});

	describe('updateWorkflow', () => {
		it('should return success with empty newNodeIds when no new nodes are added', async () => {
			const { updateWorkflow } = useWorkflowUpdate();

			const result = await updateWorkflow({
				nodes: [],
				connections: {},
			});

			expect(result).toEqual({ success: true, newNodeIds: [] });
		});

		it('should call builderStore.setBuilderMadeEdits(true)', async () => {
			const { updateWorkflow } = useWorkflowUpdate();

			await updateWorkflow({
				nodes: [],
				connections: {},
			});

			expect(builderStore.setBuilderMadeEdits).toHaveBeenCalledWith(true);
		});

		describe('node categorization', () => {
			it('should add new nodes that do not exist in current workflow', async () => {
				const newNode = createTestNode({
					id: 'new-node-1',
					name: 'New Node',
					type: 'n8n-nodes-base.httpRequest',
				});

				mockCanvasOperations.addNodes.mockResolvedValue([newNode as INodeUi]);

				const { updateWorkflow } = useWorkflowUpdate();

				const result = await updateWorkflow({
					nodes: [newNode],
					connections: {},
				});

				expect(mockCanvasOperations.addNodes).toHaveBeenCalledWith(
					[expect.objectContaining({ id: 'new-node-1' })],
					{
						trackHistory: true,
						trackBulk: false,
						forcePosition: true,
						telemetry: false,
					},
				);
				expect(result.success).toBe(true);
				if (result.success) {
					expect(result.newNodeIds).toEqual(['new-node-1']);
				}
			});

			it('should remove nodes that are no longer in the update', async () => {
				const existingNode = createTestNode({
					id: 'existing-node',
					name: 'Existing Node',
				}) as INodeUi;

				workflowsStore.allNodes = [existingNode];

				const { updateWorkflow } = useWorkflowUpdate();

				await updateWorkflow({
					nodes: [], // Empty - existing node should be removed
					connections: {},
				});

				expect(mockCanvasOperations.deleteNode).toHaveBeenCalledWith('existing-node', {
					trackHistory: true,
					trackBulk: false,
				});
			});

			it('should match nodes by name+type when IDs differ (name-based reconciliation)', async () => {
				// This tests the fallback behavior when node IDs change
				// (e.g., when workflow SDK regenerates IDs during re-parsing)
				const existingNode = createTestNode({
					id: 'old-uuid-123',
					name: 'Chat Trigger',
					type: '@n8n/n8n-nodes-langchain.chatTrigger',
					position: [100, 200],
				}) as INodeUi;

				workflowsStore.allNodes = [existingNode];

				const mockWorkflowObject = {
					nodes: { 'Chat Trigger': { ...existingNode } },
					connectionsBySourceNode: {},
					renameNode: vi.fn(),
				};
				workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(mockWorkflowObject);

				const { updateWorkflow } = useWorkflowUpdate();

				await updateWorkflow({
					nodes: [
						{
							id: 'new-uuid-456', // Different ID!
							name: 'Chat Trigger', // Same name
							type: '@n8n/n8n-nodes-langchain.chatTrigger', // Same type
							typeVersion: 1,
							position: [300, 400], // New position should be ignored
							parameters: { greeting: 'Hello' },
						},
					],
					connections: {},
				});

				// Should NOT add a new node (would trigger maxNodes error for chatTrigger)
				expect(mockCanvasOperations.addNodes).not.toHaveBeenCalled();
				// Should NOT remove the existing node
				expect(mockCanvasOperations.deleteNode).not.toHaveBeenCalled();
				// Should sync state back to store (update in place)
				expect(workflowsStore.setNodes).toHaveBeenCalled();
			});

			it('should preserve existing ID when reconciling by name+type', async () => {
				const existingNode = createTestNode({
					id: 'existing-id',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					position: [100, 200],
					parameters: { url: 'http://old.com' },
				}) as INodeUi;

				workflowsStore.allNodes = [existingNode];

				const mockWorkflowObject = {
					nodes: { 'HTTP Request': { ...existingNode } },
					connectionsBySourceNode: {},
					renameNode: vi.fn(),
				};
				workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(mockWorkflowObject);

				const { updateWorkflow } = useWorkflowUpdate();

				await updateWorkflow({
					nodes: [
						{
							id: 'different-id', // Different ID
							name: 'HTTP Request', // Same name
							type: 'n8n-nodes-base.httpRequest', // Same type
							typeVersion: 1,
							position: [300, 400],
							parameters: { url: 'http://new.com' },
						},
					],
					connections: {},
				});

				// Should update the node with the existing ID preserved
				expect(workflowsStore.setNodes).toHaveBeenCalled();
				const setNodesCall = workflowsStore.setNodes.mock.calls[0][0];
				expect(setNodesCall[0].id).toBe('existing-id');
				expect(setNodesCall[0].parameters.url).toBe('http://new.com');
			});

			it('should add truly new nodes even when name-based reconciliation is active', async () => {
				const existingNode = createTestNode({
					id: 'existing-id',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
				}) as INodeUi;

				workflowsStore.allNodes = [existingNode];

				const mockWorkflowObject = {
					nodes: { 'HTTP Request': { ...existingNode } },
					connectionsBySourceNode: {},
					renameNode: vi.fn(),
				};
				workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(mockWorkflowObject);

				const newNode = createTestNode({
					id: 'brand-new-id',
					name: 'Different Name', // Different name
					type: 'n8n-nodes-base.set', // Different type
				});

				mockCanvasOperations.addNodes.mockResolvedValue([newNode as INodeUi]);

				const { updateWorkflow } = useWorkflowUpdate();

				await updateWorkflow({
					nodes: [
						{
							id: 'existing-id',
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
						{
							id: 'brand-new-id',
							name: 'Different Name',
							type: 'n8n-nodes-base.set',
							typeVersion: 1,
							position: [200, 0],
							parameters: {},
						},
					],
					connections: {},
				});

				// Should add the truly new node
				expect(mockCanvasOperations.addNodes).toHaveBeenCalledWith(
					[expect.objectContaining({ id: 'brand-new-id', name: 'Different Name' })],
					expect.any(Object),
				);
			});

			it('should update existing nodes in place', async () => {
				const existingNode = createTestNode({
					id: 'node-1',
					name: 'Old Name',
					parameters: { url: 'http://old.com' },
					position: [100, 200],
				}) as INodeUi;

				workflowsStore.allNodes = [existingNode];

				const mockWorkflowObject = {
					nodes: { 'Old Name': { ...existingNode } },
					connectionsBySourceNode: {},
					renameNode: vi.fn(),
				};
				workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(mockWorkflowObject);

				const { updateWorkflow } = useWorkflowUpdate();

				await updateWorkflow({
					nodes: [
						{
							id: 'node-1',
							name: 'Old Name',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 1,
							position: [300, 400], // New position should be ignored
							parameters: { url: 'http://new.com' },
						},
					],
					connections: {},
				});

				// Should not add or remove nodes
				expect(mockCanvasOperations.addNodes).not.toHaveBeenCalled();
				expect(mockCanvasOperations.deleteNode).not.toHaveBeenCalled();

				// Should sync state back to store
				expect(workflowsStore.setNodes).toHaveBeenCalled();
				expect(workflowsStore.setConnections).toHaveBeenCalled();
			});

			it('should apply executeOnce when updated node has it set', async () => {
				const existingNode = createTestNode({
					id: 'node-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					position: [100, 200],
					parameters: { url: 'http://example.com' },
				}) as INodeUi;

				workflowsStore.allNodes = [existingNode];

				const mockWorkflowObject = {
					nodes: { 'HTTP Request': { ...existingNode } },
					connectionsBySourceNode: {},
					renameNode: vi.fn(),
				};
				workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(mockWorkflowObject);

				const { updateWorkflow } = useWorkflowUpdate();

				await updateWorkflow({
					nodes: [
						{
							id: 'node-1',
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 1,
							position: [0, 0],
							parameters: { url: 'http://example.com' },
							executeOnce: true,
						},
					],
					connections: {},
				});

				expect(workflowsStore.setNodes).toHaveBeenCalled();
				const setNodesCall = workflowsStore.setNodes.mock.calls[0][0];
				expect(setNodesCall[0].executeOnce).toBe(true);
			});

			it('should pass executeOnce through to addNodes for new nodes', async () => {
				const newNode = createTestNode({
					id: 'new-node-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
				});

				mockCanvasOperations.addNodes.mockResolvedValue([
					{ ...newNode, executeOnce: true } as INodeUi,
				]);

				const { updateWorkflow } = useWorkflowUpdate();

				await updateWorkflow({
					nodes: [
						{
							...newNode,
							executeOnce: true,
						},
					],
					connections: {},
				});

				expect(mockCanvasOperations.addNodes).toHaveBeenCalledWith(
					[expect.objectContaining({ executeOnce: true })],
					expect.any(Object),
				);
			});
		});

		describe('node renaming', () => {
			it('should handle node renames via canvasOperations.renameNode()', async () => {
				const existingNode = createTestNode({
					id: 'node-1',
					name: 'Old Name',
				}) as INodeUi;

				workflowsStore.allNodes = [existingNode];

				// After rename, cloneWorkflowObject returns node with new name
				const mockWorkflowObject = {
					nodes: { 'New Name': { ...existingNode, name: 'New Name' } },
					connectionsBySourceNode: {},
					renameNode: vi.fn(),
				};
				workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(mockWorkflowObject);

				const { updateWorkflow } = useWorkflowUpdate();

				await updateWorkflow({
					nodes: [
						{
							id: 'node-1',
							name: 'New Name', // Renamed
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
					],
					connections: {},
				});

				expect(mockCanvasOperations.renameNode).toHaveBeenCalledWith('Old Name', 'New Name', {
					trackHistory: true,
					trackBulk: false,
					showErrorToast: false,
				});
			});

			it('should not call renameNode when node name is unchanged', async () => {
				const existingNode = createTestNode({
					id: 'node-1',
					name: 'Same Name',
				}) as INodeUi;

				workflowsStore.allNodes = [existingNode];

				const mockWorkflowObject = {
					nodes: { 'Same Name': { ...existingNode } },
					connectionsBySourceNode: {},
					renameNode: vi.fn(),
				};
				workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(mockWorkflowObject);

				const { updateWorkflow } = useWorkflowUpdate();

				await updateWorkflow({
					nodes: [
						{
							id: 'node-1',
							name: 'Same Name', // No rename
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 1,
							position: [0, 0],
							parameters: {},
						},
					],
					connections: {},
				});

				expect(mockCanvasOperations.renameNode).not.toHaveBeenCalled();
			});

			it('should use old name when rename fails', async () => {
				const existingNode = createTestNode({
					id: 'node-1',
					name: 'Old Name',
					parameters: { url: 'http://example.com' },
				}) as INodeUi;

				workflowsStore.allNodes = [existingNode];

				// Rename fails
				mockCanvasOperations.renameNode.mockResolvedValueOnce(false);

				// Workflow still has node under old name since rename failed
				const mockWorkflowObject = {
					nodes: { 'Old Name': { ...existingNode } },
					connectionsBySourceNode: {},
					renameNode: vi.fn(),
				};
				workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(mockWorkflowObject);

				const { updateWorkflow } = useWorkflowUpdate();

				await updateWorkflow({
					nodes: [
						{
							id: 'node-1',
							name: 'New Name', // Attempted rename
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 1,
							position: [0, 0],
							parameters: { url: 'http://updated.com' },
						},
					],
					connections: {},
				});

				// Should still update node properties under old name
				expect(workflowsStore.setNodes).toHaveBeenCalled();
				const setNodesCall = workflowsStore.setNodes.mock.calls[0][0];
				expect(setNodesCall[0].name).toBe('Old Name');
				expect(setNodesCall[0].parameters.url).toBe('http://updated.com');
			});
		});

		describe('parameter change tracking', () => {
			it('should mark node as dirty when parameters change', async () => {
				const existingNode = createTestNode({
					id: 'node-1',
					name: 'HTTP Request',
					parameters: { url: 'http://old.com' },
				}) as INodeUi;

				workflowsStore.allNodes = [existingNode];

				const mockWorkflowObject = {
					nodes: { 'HTTP Request': { ...existingNode } },
					connectionsBySourceNode: {},
					renameNode: vi.fn(),
				};
				workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(mockWorkflowObject);

				const { updateWorkflow } = useWorkflowUpdate();

				await updateWorkflow({
					nodes: [
						{
							id: 'node-1',
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 1,
							position: [0, 0],
							parameters: { url: 'http://new.com' }, // Changed
						},
					],
					connections: {},
				});

				expect(mockWorkflowState.resetParametersLastUpdatedAt).toHaveBeenCalledWith('HTTP Request');
			});

			it('should not mark node as dirty when parameters are unchanged', async () => {
				const existingNode = createTestNode({
					id: 'node-1',
					name: 'HTTP Request',
					parameters: { url: 'http://same.com' },
				}) as INodeUi;

				workflowsStore.allNodes = [existingNode];

				const mockWorkflowObject = {
					nodes: { 'HTTP Request': { ...existingNode } },
					connectionsBySourceNode: {},
					renameNode: vi.fn(),
				};
				workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(mockWorkflowObject);

				const { updateWorkflow } = useWorkflowUpdate();

				await updateWorkflow({
					nodes: [
						{
							id: 'node-1',
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 1,
							position: [0, 0],
							parameters: { url: 'http://same.com' }, // Same
						},
					],
					connections: {},
				});

				expect(mockWorkflowState.resetParametersLastUpdatedAt).not.toHaveBeenCalled();
			});
		});

		describe('workflow name update', () => {
			it('should update workflow name on initial generation when name starts with default', async () => {
				workflowsStore.workflow.name = DEFAULT_NEW_WORKFLOW_NAME;

				const { updateWorkflow } = useWorkflowUpdate();

				await updateWorkflow(
					{
						name: 'My Generated Workflow',
						nodes: [],
						connections: {},
					},
					{ isInitialGeneration: true },
				);

				expect(mockWorkflowState.setWorkflowName).toHaveBeenCalledWith({
					newName: 'My Generated Workflow',
					setStateDirty: false,
				});
			});

			it('should not update workflow name when not initial generation', async () => {
				workflowsStore.workflow.name = DEFAULT_NEW_WORKFLOW_NAME;

				const { updateWorkflow } = useWorkflowUpdate();

				await updateWorkflow(
					{
						name: 'My Generated Workflow',
						nodes: [],
						connections: {},
					},
					{ isInitialGeneration: false },
				);

				expect(mockWorkflowState.setWorkflowName).not.toHaveBeenCalled();
			});

			it('should not update workflow name when current name does not start with default', async () => {
				workflowsStore.workflow.name = 'Custom Workflow Name';

				const { updateWorkflow } = useWorkflowUpdate();

				await updateWorkflow(
					{
						name: 'My Generated Workflow',
						nodes: [],
						connections: {},
					},
					{ isInitialGeneration: true },
				);

				expect(mockWorkflowState.setWorkflowName).not.toHaveBeenCalled();
			});
		});

		describe('tidyUp behavior', () => {
			it('should emit tidyUp without nodeIdsFilter when nodes are added', async () => {
				const newNode = createTestNode({
					id: 'new-node-1',
					name: 'New Node',
				});

				mockCanvasOperations.addNodes.mockResolvedValue([newNode as INodeUi]);

				const { updateWorkflow } = useWorkflowUpdate();

				await updateWorkflow({
					nodes: [newNode],
					connections: {},
				});

				expect(canvasEventBusEmitMock).toHaveBeenCalledWith('tidyUp', {
					source: 'builder-update',
					nodeIdsFilter: undefined,
					trackEvents: false,
					trackHistory: true,
					trackBulk: false,
				});
			});

			it('should emit tidyUp without nodeIdsFilter when nodes are removed', async () => {
				const existingNode = createTestNode({
					id: 'existing-node',
					name: 'Existing Node',
				}) as INodeUi;

				workflowsStore.allNodes = [existingNode];

				const { updateWorkflow } = useWorkflowUpdate();

				await updateWorkflow({
					nodes: [], // Empty - existing node should be removed
					connections: {},
				});

				expect(canvasEventBusEmitMock).toHaveBeenCalledWith('tidyUp', {
					source: 'builder-update',
					nodeIdsFilter: undefined,
					trackEvents: false,
					trackHistory: true,
					trackBulk: false,
				});
			});

			it('should not emit tidyUp event when there are no structural changes', async () => {
				const existingNode = createTestNode({
					id: 'node-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					parameters: { url: 'http://example.com' },
				}) as INodeUi;

				workflowsStore.allNodes = [existingNode];

				const mockWorkflowObject = {
					nodes: { 'HTTP Request': { ...existingNode } },
					connectionsBySourceNode: {},
					renameNode: vi.fn(),
				};
				workflowsStore.cloneWorkflowObject = vi.fn().mockReturnValue(mockWorkflowObject);

				const { updateWorkflow } = useWorkflowUpdate();

				await updateWorkflow({
					nodes: [
						{
							id: 'node-1',
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 1,
							position: [0, 0],
							parameters: { url: 'http://updated.com' },
						},
					],
					connections: {},
				});

				expect(canvasEventBusEmitMock).not.toHaveBeenCalled();
			});
		});

		describe('default credentials', () => {
			it('should apply default credentials to nodes without credentials', async () => {
				const nodeWithoutCreds = createTestNode({
					id: 'node-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					credentials: undefined,
				});

				const mockCredential = {
					id: 'cred-1',
					name: 'My Credential',
					type: 'httpBasicAuth',
				};

				nodeTypesStore.getNodeType = vi.fn().mockReturnValue({
					credentials: [{ name: 'httpBasicAuth' }],
				});
				credentialsStore.getCredentialsByType = vi.fn().mockReturnValue([mockCredential]);

				mockCanvasOperations.addNodes.mockResolvedValue([nodeWithoutCreds as INodeUi]);

				const { updateWorkflow } = useWorkflowUpdate();

				await updateWorkflow({
					nodes: [nodeWithoutCreds],
					connections: {},
				});

				// Credentials should be applied to the node before it's added to the store
				expect(mockCanvasOperations.addNodes).toHaveBeenCalledWith(
					[
						expect.objectContaining({
							credentials: { httpBasicAuth: { id: 'cred-1', name: 'My Credential' } },
						}),
					],
					expect.any(Object),
				);
			});

			it('should not override existing credentials', async () => {
				const existingCredentials = { httpBasicAuth: { id: 'existing-cred', name: 'Existing' } };
				const nodeWithCreds = createTestNode({
					id: 'node-1',
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					credentials: existingCredentials,
				});

				nodeTypesStore.getNodeType = vi.fn().mockReturnValue({
					credentials: [{ name: 'httpBasicAuth' }],
				});
				credentialsStore.getCredentialsByType = vi
					.fn()
					.mockReturnValue([{ id: 'other-cred', name: 'Other', type: 'httpBasicAuth' }]);

				mockCanvasOperations.addNodes.mockResolvedValue([nodeWithCreds as INodeUi]);

				const { updateWorkflow } = useWorkflowUpdate();

				await updateWorkflow({
					nodes: [nodeWithCreds],
					connections: {},
				});

				// Existing credentials should not be overwritten
				expect(mockCanvasOperations.addNodes).toHaveBeenCalledWith(
					[expect.objectContaining({ credentials: existingCredentials })],
					expect.any(Object),
				);
			});
		});

		describe('error handling', () => {
			it('should return success: false with error when addNodes throws', async () => {
				const testError = new Error('Failed to add nodes');
				mockCanvasOperations.addNodes.mockRejectedValueOnce(testError);

				const newNode = createTestNode({
					id: 'new-node-1',
					name: 'New Node',
					type: 'n8n-nodes-base.httpRequest',
				});

				const { updateWorkflow } = useWorkflowUpdate();

				const result = await updateWorkflow({
					nodes: [newNode],
					connections: {},
				});

				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error).toBe(testError);
				}
			});

			it('should return success: false with error when addConnections throws', async () => {
				const testError = new Error('Failed to add connections');
				mockCanvasOperations.addConnections.mockRejectedValueOnce(testError);

				// Mock mapLegacyConnectionsToCanvasConnections to return:
				// - empty array for existing connections (first call)
				// - non-empty array for new connections (second call) to trigger addConnections
				mockMapLegacyConnectionsToCanvasConnections
					.mockReturnValueOnce([]) // existing connections
					.mockReturnValueOnce([
						{ source: 'node-1', target: 'node-2', sourceHandle: 'main', targetHandle: 'main' },
					]); // new connections

				const { updateWorkflow } = useWorkflowUpdate();

				const result = await updateWorkflow({
					nodes: [],
					connections: { 'Node 1': { main: [[{ node: 'Node 2', type: 'main', index: 0 }]] } },
				});

				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error).toBe(testError);
				}
			});

			it('should return success: false with error when cloneWorkflowObject throws', async () => {
				const existingNode = createTestNode({
					id: 'node-1',
					name: 'Existing Node',
				}) as INodeUi;

				workflowsStore.allNodes = [existingNode];

				const testError = new Error('Failed to clone workflow');
				workflowsStore.cloneWorkflowObject = vi.fn().mockImplementation(() => {
					throw testError;
				});

				const { updateWorkflow } = useWorkflowUpdate();

				const result = await updateWorkflow({
					nodes: [
						{
							id: 'node-1',
							name: 'Existing Node',
							type: 'n8n-nodes-base.httpRequest',
							typeVersion: 1,
							position: [0, 0],
							parameters: { updated: true },
						},
					],
					connections: {},
				});

				expect(result.success).toBe(false);
				if (!result.success) {
					expect(result.error).toBe(testError);
				}
			});

			it('should not call setBuilderMadeEdits when error occurs', async () => {
				const testError = new Error('Failed to add nodes');
				mockCanvasOperations.addNodes.mockRejectedValueOnce(testError);

				const newNode = createTestNode({
					id: 'new-node-1',
					name: 'New Node',
					type: 'n8n-nodes-base.httpRequest',
				});

				const { updateWorkflow } = useWorkflowUpdate();

				await updateWorkflow({
					nodes: [newNode],
					connections: {},
				});

				expect(builderStore.setBuilderMadeEdits).not.toHaveBeenCalled();
			});

			it('should not emit tidyUp event when error occurs', async () => {
				const testError = new Error('Failed to add nodes');
				mockCanvasOperations.addNodes.mockRejectedValueOnce(testError);

				const newNode = createTestNode({
					id: 'new-node-1',
					name: 'New Node',
					type: 'n8n-nodes-base.httpRequest',
				});

				const { updateWorkflow } = useWorkflowUpdate();

				await updateWorkflow({
					nodes: [newNode],
					connections: {},
				});

				expect(canvasEventBusEmitMock).not.toHaveBeenCalled();
			});
		});
	});
});
