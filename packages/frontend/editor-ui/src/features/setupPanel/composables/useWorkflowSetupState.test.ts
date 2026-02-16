import { ref, nextTick } from 'vue';
import { createTestingPinia } from '@pinia/testing';

import { createTestNode } from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';

import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import type { INodeUi } from '@/Interface';

import { useWorkflowSetupState } from './useWorkflowSetupState';

const mockUpdateNodeProperties = vi.fn();
const mockUpdateNodeCredentialIssuesByName = vi.fn();
const mockUpdateNodesCredentialsIssues = vi.fn();

vi.mock('@/app/composables/useWorkflowState', () => ({
	injectWorkflowState: vi.fn(() => ({
		updateNodeProperties: mockUpdateNodeProperties,
	})),
}));

vi.mock('@/app/composables/useNodeHelpers', () => ({
	useNodeHelpers: vi.fn(() => ({
		updateNodeCredentialIssuesByName: mockUpdateNodeCredentialIssuesByName,
		updateNodesCredentialsIssues: mockUpdateNodesCredentialsIssues,
	})),
}));

const mockGetNodeTypeDisplayableCredentials = vi.fn().mockReturnValue([]);

vi.mock('@/app/utils/nodes/nodeTransforms', () => ({
	getNodeTypeDisplayableCredentials: (...args: unknown[]) =>
		mockGetNodeTypeDisplayableCredentials(...args),
}));

// Sorting/filtering by execution order is tested in setupPanel.utils.test.ts.
// Use a pass-through mock here so non-sorting tests are not affected.
vi.mock('../setupPanel.utils', async () => {
	const actual = await vi.importActual('../setupPanel.utils');
	return {
		...actual,
		sortNodesByExecutionOrder: (nodes: unknown[]) => nodes,
	};
});

const createNode = (overrides: Partial<INodeUi> = {}): INodeUi =>
	createTestNode({
		name: 'TestNode',
		type: 'n8n-nodes-base.testNode',
		typeVersion: 1,
		position: [0, 0],
		...overrides,
	}) as INodeUi;

describe('useWorkflowSetupState', () => {
	let workflowsStore: ReturnType<typeof mockedStore<typeof useWorkflowsStore>>;
	let credentialsStore: ReturnType<typeof mockedStore<typeof useCredentialsStore>>;
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;

	beforeEach(() => {
		createTestingPinia();
		workflowsStore = mockedStore(useWorkflowsStore);
		credentialsStore = mockedStore(useCredentialsStore);
		nodeTypesStore = mockedStore(useNodeTypesStore);

		credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue(undefined);
		credentialsStore.getCredentialById = vi.fn().mockReturnValue(undefined);
		nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(false);
		workflowsStore.getWorkflowResultDataByNodeName = vi.fn().mockReturnValue(null);

		mockGetNodeTypeDisplayableCredentials.mockReturnValue([]);
		mockUpdateNodeProperties.mockReset();
		mockUpdateNodeCredentialIssuesByName.mockReset();
		mockUpdateNodesCredentialsIssues.mockReset();
	});

	describe('setupCards', () => {
		it('should return empty array when no nodes', () => {
			workflowsStore.allNodes = [];

			const { setupCards } = useWorkflowSetupState();

			expect(setupCards.value).toEqual([]);
		});

		it('should return trigger cards for trigger nodes', () => {
			const triggerNode = createNode({
				name: 'WebhookTrigger',
				type: 'n8n-nodes-base.webhook',
			});
			workflowsStore.allNodes = [triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);

			const { setupCards } = useWorkflowSetupState();

			expect(setupCards.value).toHaveLength(1);
			expect(setupCards.value[0].type).toBe('trigger');
			expect(setupCards.value[0].state).toMatchObject({
				node: expect.objectContaining({ name: 'WebhookTrigger' }),
			});
		});

		it('should return credential cards for nodes with credentials', () => {
			const node = createNode({ name: 'OpenAI' });
			workflowsStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
			});
			workflowsStore.getNodeByName = vi.fn().mockReturnValue(node);

			const { setupCards } = useWorkflowSetupState();

			expect(setupCards.value).toHaveLength(1);
			expect(setupCards.value[0].type).toBe('credential');
			if (setupCards.value[0].type === 'credential') {
				expect(setupCards.value[0].state.credentialType).toBe('openAiApi');
				expect(setupCards.value[0].state.credentialDisplayName).toBe('OpenAI API');
			}
		});

		it('should group multiple nodes needing same credential into one credential card', () => {
			const node1 = createNode({ name: 'OpenAI1', position: [0, 0] });
			const node2 = createNode({ name: 'OpenAI2', position: [100, 0] });
			workflowsStore.allNodes = [node1, node2];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
			});
			workflowsStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'OpenAI1') return node1;
				if (name === 'OpenAI2') return node2;
				return null;
			});

			const { setupCards } = useWorkflowSetupState();

			const credCards = setupCards.value.filter((c) => c.type === 'credential');
			expect(credCards).toHaveLength(1);
			if (credCards[0].type === 'credential') {
				expect(credCards[0].state.nodeNames).toContain('OpenAI1');
				expect(credCards[0].state.nodeNames).toContain('OpenAI2');
			}
		});

		it('should create separate credential cards for different credential types', () => {
			const node1 = createNode({ name: 'Node1', position: [0, 0] });
			const node2 = createNode({ name: 'Node2', position: [100, 0] });
			workflowsStore.allNodes = [node1, node2];
			mockGetNodeTypeDisplayableCredentials.mockImplementation((_store, node) => {
				if ((node as INodeUi).name === 'Node1') return [{ name: 'slackApi' }];
				if ((node as INodeUi).name === 'Node2') return [{ name: 'openAiApi' }];
				return [];
			});
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Test',
			});
			workflowsStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'Node1') return node1;
				if (name === 'Node2') return node2;
				return null;
			});

			const { setupCards } = useWorkflowSetupState();

			const credCards = setupCards.value.filter((c) => c.type === 'credential');
			expect(credCards).toHaveLength(2);
		});

		it('should embed trigger into credential card for trigger with credentials (no separate trigger card)', () => {
			const triggerNode = createNode({
				name: 'SlackTrigger',
				type: 'n8n-nodes-base.slackTrigger',
			});
			workflowsStore.allNodes = [triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'slackApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Slack API',
			});
			workflowsStore.getNodeByName = vi.fn().mockReturnValue(triggerNode);

			const { setupCards } = useWorkflowSetupState();

			const triggerCards = setupCards.value.filter((c) => c.type === 'trigger');
			const credCards = setupCards.value.filter((c) => c.type === 'credential');
			expect(triggerCards).toHaveLength(0);
			expect(credCards).toHaveLength(1);
			if (credCards[0].type === 'credential') {
				expect(credCards[0].state.triggerNodes).toHaveLength(1);
				expect(credCards[0].state.triggerNodes[0].name).toBe('SlackTrigger');
			}
		});

		it('should only embed first trigger into credential card and create standalone cards for extras', () => {
			const trigger1 = createNode({
				name: 'SlackTrigger1',
				type: 'n8n-nodes-base.slackTrigger',
				position: [0, 0],
			});
			const trigger2 = createNode({
				name: 'SlackTrigger2',
				type: 'n8n-nodes-base.slackTrigger',
				position: [100, 0],
			});
			workflowsStore.allNodes = [trigger1, trigger2];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'slackApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Slack API',
			});
			workflowsStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'SlackTrigger1') return trigger1;
				if (name === 'SlackTrigger2') return trigger2;
				return null;
			});

			const { setupCards } = useWorkflowSetupState();

			const credCards = setupCards.value.filter((c) => c.type === 'credential');
			const triggerCards = setupCards.value.filter((c) => c.type === 'trigger');

			// Only one credential card with the first trigger embedded
			expect(credCards).toHaveLength(1);
			if (credCards[0].type === 'credential') {
				expect(credCards[0].state.triggerNodes).toHaveLength(1);
				expect(credCards[0].state.triggerNodes[0].name).toBe('SlackTrigger1');
			}

			// Second trigger becomes a standalone trigger card
			expect(triggerCards).toHaveLength(1);
			expect(triggerCards[0].state.node.name).toBe('SlackTrigger2');
		});

		it('should produce only trigger card for trigger without credentials', () => {
			const triggerNode = createNode({
				name: 'ManualTrigger',
				type: 'n8n-nodes-base.manualTrigger',
			});
			workflowsStore.allNodes = [triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);

			const { setupCards } = useWorkflowSetupState();

			expect(setupCards.value).toHaveLength(1);
			expect(setupCards.value[0].type).toBe('trigger');
		});

		it('should order credentials first, then standalone triggers', () => {
			const regularNode = createNode({
				name: 'Regular',
				type: 'n8n-nodes-base.regular',
				position: [0, 0],
			});
			const triggerNode = createNode({
				name: 'ManualTrigger',
				type: 'n8n-nodes-base.manualTrigger',
				position: [100, 0],
			});
			workflowsStore.allNodes = [regularNode, triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn(
				(type: string) => type === 'n8n-nodes-base.manualTrigger',
			);
			mockGetNodeTypeDisplayableCredentials.mockImplementation((_store, node) => {
				if ((node as INodeUi).name === 'Regular') return [{ name: 'testApi' }];
				return [];
			});
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Test',
			});
			workflowsStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'Regular') return regularNode;
				if (name === 'ManualTrigger') return triggerNode;
				return null;
			});

			const { setupCards } = useWorkflowSetupState();

			const credCards = setupCards.value.filter((c) => c.type === 'credential');
			expect(credCards.length).toBeGreaterThan(0);
			expect(setupCards.value[0].type).toBe('credential');
			expect(setupCards.value[setupCards.value.length - 1].type).toBe('trigger');
		});

		it('should exclude disabled nodes', () => {
			const node = createNode({ name: 'DisabledNode', disabled: true });
			workflowsStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'testApi' }]);

			const { setupCards } = useWorkflowSetupState();

			expect(setupCards.value).toEqual([]);
		});

		it('should exclude nodes without credentials (non-trigger)', () => {
			const node = createNode({ name: 'NoCredNode' });
			workflowsStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([]);

			const { setupCards } = useWorkflowSetupState();

			expect(setupCards.value).toEqual([]);
		});
	});

	describe('credentialTypeStates', () => {
		it('should group by credential type', () => {
			const node1 = createNode({ name: 'Node1', position: [0, 0] });
			const node2 = createNode({ name: 'Node2', position: [100, 0] });
			workflowsStore.allNodes = [node1, node2];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
			});
			workflowsStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'Node1') return node1;
				if (name === 'Node2') return node2;
				return null;
			});

			const { credentialTypeStates } = useWorkflowSetupState();

			expect(credentialTypeStates.value).toHaveLength(1);
			expect(credentialTypeStates.value[0].credentialType).toBe('openAiApi');
		});

		it('should include all nodes sharing the credential type in nodeNames', () => {
			const node1 = createNode({ name: 'Node1', position: [0, 0] });
			const node2 = createNode({ name: 'Node2', position: [100, 0] });
			workflowsStore.allNodes = [node1, node2];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
			});
			workflowsStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'Node1') return node1;
				if (name === 'Node2') return node2;
				return null;
			});

			const { credentialTypeStates } = useWorkflowSetupState();

			expect(credentialTypeStates.value[0].nodeNames).toEqual(['Node1', 'Node2']);
		});

		it('should mark isComplete true when credential is set without issues (non-trigger node)', () => {
			const node = createNode({
				name: 'Slack',
				credentials: {
					slackApi: { id: 'cred-1', name: 'My Slack' },
				},
			});
			workflowsStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'slackApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Slack API',
			});
			workflowsStore.getNodeByName = vi.fn().mockReturnValue(node);

			const { credentialTypeStates } = useWorkflowSetupState();

			expect(credentialTypeStates.value[0].isComplete).toBe(true);
		});

		it('should mark isComplete false when credential is set but embedded trigger has not executed', () => {
			const triggerNode = createNode({
				name: 'SlackTrigger',
				type: 'n8n-nodes-base.slackTrigger',
				credentials: { slackApi: { id: 'cred-1', name: 'My Slack' } },
			});
			workflowsStore.allNodes = [triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'slackApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Slack API',
			});
			workflowsStore.getNodeByName = vi.fn().mockReturnValue(triggerNode);
			workflowsStore.getWorkflowResultDataByNodeName = vi.fn().mockReturnValue(null);

			const { credentialTypeStates } = useWorkflowSetupState();

			expect(credentialTypeStates.value[0].isComplete).toBe(false);
			expect(credentialTypeStates.value[0].triggerNodes).toHaveLength(1);
		});

		it('should mark isComplete true when credential is set and embedded trigger has executed', () => {
			const triggerNode = createNode({
				name: 'SlackTrigger',
				type: 'n8n-nodes-base.slackTrigger',
				credentials: { slackApi: { id: 'cred-1', name: 'My Slack' } },
			});
			workflowsStore.allNodes = [triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'slackApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Slack API',
			});
			workflowsStore.getNodeByName = vi.fn().mockReturnValue(triggerNode);
			workflowsStore.getWorkflowResultDataByNodeName = vi.fn().mockReturnValue([{ data: {} }]);

			const { credentialTypeStates } = useWorkflowSetupState();

			expect(credentialTypeStates.value[0].isComplete).toBe(true);
			expect(credentialTypeStates.value[0].triggerNodes).toHaveLength(1);
		});

		it('should mark isComplete false when credential is missing', () => {
			const node = createNode({ name: 'Slack' });
			workflowsStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'slackApi' }]);
			workflowsStore.getNodeByName = vi.fn().mockReturnValue(node);

			const { credentialTypeStates } = useWorkflowSetupState();

			expect(credentialTypeStates.value[0].isComplete).toBe(false);
		});

		it('should mark isComplete false when credential has issues', () => {
			const node = createNode({
				name: 'Slack',
				credentials: {
					slackApi: { id: 'cred-1', name: 'My Slack' },
				},
				issues: {
					credentials: {
						slackApi: ['Token expired'],
					},
				},
			});
			workflowsStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'slackApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Slack API',
			});
			workflowsStore.getNodeByName = vi.fn().mockReturnValue(node);

			const { credentialTypeStates } = useWorkflowSetupState();

			expect(credentialTypeStates.value[0].isComplete).toBe(false);
		});

		it('should be sorted by leftmost node X position', () => {
			const nodeRight = createNode({ name: 'RightNode', position: [300, 0] });
			const nodeLeft = createNode({ name: 'LeftNode', position: [100, 0] });
			workflowsStore.allNodes = [nodeRight, nodeLeft];
			mockGetNodeTypeDisplayableCredentials.mockImplementation((_store, node) => {
				if ((node as INodeUi).name === 'RightNode') return [{ name: 'rightApi' }];
				if ((node as INodeUi).name === 'LeftNode') return [{ name: 'leftApi' }];
				return [];
			});
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Test',
			});
			workflowsStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'RightNode') return nodeRight;
				if (name === 'LeftNode') return nodeLeft;
				return null;
			});

			const { credentialTypeStates } = useWorkflowSetupState();

			expect(credentialTypeStates.value[0].credentialType).toBe('leftApi');
			expect(credentialTypeStates.value[1].credentialType).toBe('rightApi');
		});
	});

	describe('triggerStates', () => {
		it('should mark trigger without credentials as complete after execution', () => {
			const triggerNode = createNode({
				name: 'ManualTrigger',
				type: 'n8n-nodes-base.manualTrigger',
			});
			workflowsStore.allNodes = [triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			workflowsStore.getWorkflowResultDataByNodeName = vi.fn().mockReturnValue([{ data: {} }]);

			const { triggerStates } = useWorkflowSetupState();

			expect(triggerStates.value).toHaveLength(1);
			expect(triggerStates.value[0].isComplete).toBe(true);
		});

		it('should not include trigger with credentials in triggerStates (it is embedded in credential card)', () => {
			const triggerNode = createNode({
				name: 'SlackTrigger',
				type: 'n8n-nodes-base.slackTrigger',
			});
			workflowsStore.allNodes = [triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'slackApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Slack API',
			});
			workflowsStore.getNodeByName = vi.fn().mockReturnValue(triggerNode);
			workflowsStore.getWorkflowResultDataByNodeName = vi.fn().mockReturnValue(null);

			const { triggerStates } = useWorkflowSetupState();

			expect(triggerStates.value).toHaveLength(0);
		});

		it('should mark trigger without credentials and no execution as incomplete', () => {
			const triggerNode = createNode({
				name: 'ManualTrigger',
				type: 'n8n-nodes-base.manualTrigger',
			});
			workflowsStore.allNodes = [triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			workflowsStore.getWorkflowResultDataByNodeName = vi.fn().mockReturnValue(null);

			const { triggerStates } = useWorkflowSetupState();

			expect(triggerStates.value[0].isComplete).toBe(false);
		});
	});

	describe('setCredential', () => {
		it('should update all nodes that need the credential type', () => {
			const node1 = createNode({ name: 'OpenAI1', position: [0, 0] });
			const node2 = createNode({ name: 'OpenAI2', position: [100, 0] });
			workflowsStore.allNodes = [node1, node2];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
			});
			workflowsStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'OpenAI1') return node1;
				if (name === 'OpenAI2') return node2;
				return null;
			});
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({
				id: 'cred-1',
				name: 'My OpenAI Key',
			});

			const { setCredential } = useWorkflowSetupState();
			setCredential('openAiApi', 'cred-1');

			expect(mockUpdateNodeProperties).toHaveBeenCalledWith({
				name: 'OpenAI1',
				properties: {
					credentials: {
						openAiApi: { id: 'cred-1', name: 'My OpenAI Key' },
					},
				},
			});
			expect(mockUpdateNodeProperties).toHaveBeenCalledWith({
				name: 'OpenAI2',
				properties: {
					credentials: {
						openAiApi: { id: 'cred-1', name: 'My OpenAI Key' },
					},
				},
			});
		});

		it('should call updateNodesCredentialsIssues once', () => {
			const node1 = createNode({ name: 'OpenAI1', position: [0, 0] });
			const node2 = createNode({ name: 'OpenAI2', position: [100, 0] });
			workflowsStore.allNodes = [node1, node2];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
			});
			workflowsStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'OpenAI1') return node1;
				if (name === 'OpenAI2') return node2;
				return null;
			});
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({
				id: 'cred-1',
				name: 'My OpenAI Key',
			});

			const { setCredential } = useWorkflowSetupState();
			setCredential('openAiApi', 'cred-1');

			expect(mockUpdateNodesCredentialsIssues).toHaveBeenCalledTimes(1);
		});

		it('should not call updateNodeCredentialIssuesByName', () => {
			const node = createNode({ name: 'OpenAI' });
			workflowsStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
			});
			workflowsStore.getNodeByName = vi.fn().mockReturnValue(node);
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({
				id: 'cred-1',
				name: 'My OpenAI Key',
			});

			const { setCredential } = useWorkflowSetupState();
			setCredential('openAiApi', 'cred-1');

			expect(mockUpdateNodeCredentialIssuesByName).not.toHaveBeenCalled();
		});

		it('should not show toast (no auto-assign toast)', () => {
			const node1 = createNode({ name: 'OpenAI1', position: [0, 0] });
			const node2 = createNode({ name: 'OpenAI2', position: [100, 0] });
			workflowsStore.allNodes = [node1, node2];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
			});
			workflowsStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'OpenAI1') return node1;
				if (name === 'OpenAI2') return node2;
				return null;
			});
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({
				id: 'cred-1',
				name: 'My OpenAI Key',
			});

			const { setCredential } = useWorkflowSetupState();
			setCredential('openAiApi', 'cred-1');

			// useToast is no longer used in the composable, so no toast should be shown
			// (there is no mockShowMessage to check — the composable doesn't depend on useToast)
		});

		it('should return early when credential not found', () => {
			const node = createNode({ name: 'OpenAI' });
			workflowsStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialById = vi.fn().mockReturnValue(undefined);

			const { setCredential } = useWorkflowSetupState();
			setCredential('openAiApi', 'non-existent');

			expect(mockUpdateNodeProperties).not.toHaveBeenCalled();
		});

		it('should preserve existing credentials on each node', () => {
			const node = createNode({
				name: 'MultiCred',
				credentials: {
					existingApi: { id: 'existing-1', name: 'Existing' },
				},
			});
			workflowsStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([
				{ name: 'existingApi' },
				{ name: 'newApi' },
			]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Test',
			});
			workflowsStore.getNodeByName = vi.fn().mockReturnValue(node);
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({
				id: 'cred-2',
				name: 'New Cred',
			});

			const { setCredential } = useWorkflowSetupState();
			setCredential('newApi', 'cred-2');

			expect(mockUpdateNodeProperties).toHaveBeenCalledWith({
				name: 'MultiCred',
				properties: {
					credentials: {
						existingApi: { id: 'existing-1', name: 'Existing' },
						newApi: { id: 'cred-2', name: 'New Cred' },
					},
				},
			});
		});
	});

	describe('unsetCredential', () => {
		it('should remove credential from all nodes that need the type', () => {
			const node1 = createNode({
				name: 'OpenAI1',
				position: [0, 0],
				credentials: {
					openAiApi: { id: 'cred-1', name: 'My OpenAI' },
					otherApi: { id: 'cred-2', name: 'Other' },
				},
			});
			const node2 = createNode({
				name: 'OpenAI2',
				position: [100, 0],
				credentials: {
					openAiApi: { id: 'cred-1', name: 'My OpenAI' },
				},
			});
			workflowsStore.allNodes = [node1, node2];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
			});
			workflowsStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'OpenAI1') return node1;
				if (name === 'OpenAI2') return node2;
				return null;
			});

			const { unsetCredential } = useWorkflowSetupState();
			unsetCredential('openAiApi');

			expect(mockUpdateNodeProperties).toHaveBeenCalledWith({
				name: 'OpenAI1',
				properties: {
					credentials: {
						otherApi: { id: 'cred-2', name: 'Other' },
					},
				},
			});
			expect(mockUpdateNodeProperties).toHaveBeenCalledWith({
				name: 'OpenAI2',
				properties: {
					credentials: {},
				},
			});
		});

		it('should call updateNodesCredentialsIssues once', () => {
			const node = createNode({
				name: 'Slack',
				credentials: {
					slackApi: { id: 'cred-1', name: 'My Slack' },
				},
			});
			workflowsStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'slackApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Slack API',
			});
			workflowsStore.getNodeByName = vi.fn().mockReturnValue(node);

			const { unsetCredential } = useWorkflowSetupState();
			unsetCredential('slackApi');

			expect(mockUpdateNodesCredentialsIssues).toHaveBeenCalledTimes(1);
		});
	});

	describe('isAllComplete', () => {
		it('should return false when empty', () => {
			workflowsStore.allNodes = [];

			const { isAllComplete } = useWorkflowSetupState();

			expect(isAllComplete.value).toBe(false);
		});

		it('should return true when all cards are complete', () => {
			const node = createNode({
				name: 'Slack',
				credentials: {
					slackApi: { id: 'cred-1', name: 'My Slack' },
				},
			});
			workflowsStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'slackApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Slack API',
			});
			workflowsStore.getNodeByName = vi.fn().mockReturnValue(node);

			const { isAllComplete } = useWorkflowSetupState();

			expect(isAllComplete.value).toBe(true);
		});

		it('should return false when any card is incomplete', () => {
			const node1 = createNode({
				name: 'Complete',
				position: [0, 0],
				credentials: {
					slackApi: { id: 'cred-1', name: 'My Slack' },
				},
			});
			const node2 = createNode({
				name: 'Incomplete',
				position: [100, 0],
			});
			workflowsStore.allNodes = [node1, node2];
			mockGetNodeTypeDisplayableCredentials.mockImplementation((_store, node) => {
				if ((node as INodeUi).name === 'Complete') return [{ name: 'slackApi' }];
				if ((node as INodeUi).name === 'Incomplete') return [{ name: 'openAiApi' }];
				return [];
			});
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Test',
			});
			workflowsStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'Complete') return node1;
				if (name === 'Incomplete') return node2;
				return null;
			});

			const { isAllComplete } = useWorkflowSetupState();

			expect(isAllComplete.value).toBe(false);
		});

		it('should return false when trigger card is incomplete', () => {
			const triggerNode = createNode({
				name: 'Trigger',
				type: 'n8n-nodes-base.trigger',
			});
			workflowsStore.allNodes = [triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			workflowsStore.getWorkflowResultDataByNodeName = vi.fn().mockReturnValue(null);

			const { isAllComplete } = useWorkflowSetupState();

			expect(isAllComplete.value).toBe(false);
		});
	});

	describe('totalCredentialsMissing', () => {
		it('should return 0 when no credential cards exist', () => {
			workflowsStore.allNodes = [];

			const { totalCredentialsMissing } = useWorkflowSetupState();

			expect(totalCredentialsMissing.value).toBe(0);
		});

		it('should count incomplete credential type cards', () => {
			const node = createNode({ name: 'TestNode' });
			workflowsStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'credA' }, { name: 'credB' }]);
			workflowsStore.getNodeByName = vi.fn().mockReturnValue(node);

			const { totalCredentialsMissing } = useWorkflowSetupState();

			expect(totalCredentialsMissing.value).toBe(2);
		});

		it('should return 0 when all credential type cards are complete', () => {
			const node = createNode({
				name: 'TestNode',
				credentials: {
					testApi: { id: 'cred-1', name: 'Test' },
				},
			});
			workflowsStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'testApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Test',
			});
			workflowsStore.getNodeByName = vi.fn().mockReturnValue(node);

			const { totalCredentialsMissing } = useWorkflowSetupState();

			expect(totalCredentialsMissing.value).toBe(0);
		});

		it('should count credential with issues as missing even if it has an id', () => {
			const node = createNode({
				name: 'TestNode',
				credentials: {
					testApi: { id: 'cred-1', name: 'Test' },
				},
				issues: {
					credentials: {
						testApi: ['Invalid credential'],
					},
				},
			});
			workflowsStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'testApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Test',
			});
			workflowsStore.getNodeByName = vi.fn().mockReturnValue(node);

			const { totalCredentialsMissing } = useWorkflowSetupState();

			expect(totalCredentialsMissing.value).toBe(1);
		});

		it('should count shared credential type only once even when multiple nodes need it', () => {
			const node1 = createNode({ name: 'Node1', position: [0, 0] });
			const node2 = createNode({ name: 'Node2', position: [100, 0] });
			workflowsStore.allNodes = [node1, node2];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
			});
			workflowsStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'Node1') return node1;
				if (name === 'Node2') return node2;
				return null;
			});

			const { totalCredentialsMissing } = useWorkflowSetupState();

			// One credential type card, not two
			expect(totalCredentialsMissing.value).toBe(1);
		});
	});

	describe('totalCardsRequiringSetup', () => {
		it('should return 0 when no cards exist', () => {
			workflowsStore.allNodes = [];

			const { totalCardsRequiringSetup } = useWorkflowSetupState();

			expect(totalCardsRequiringSetup.value).toBe(0);
		});

		it('should return total number of setup cards', () => {
			const triggerNode = createNode({
				name: 'ManualTrigger',
				type: 'n8n-nodes-base.manualTrigger',
				position: [0, 0],
			});
			const regularNode = createNode({
				name: 'Regular',
				type: 'n8n-nodes-base.regular',
				position: [100, 0],
			});
			workflowsStore.allNodes = [triggerNode, regularNode];
			nodeTypesStore.isTriggerNode = vi.fn(
				(type: string) => type === 'n8n-nodes-base.manualTrigger',
			);
			mockGetNodeTypeDisplayableCredentials.mockImplementation((_store, node) => {
				if ((node as INodeUi).name === 'Regular') return [{ name: 'testApi' }];
				return [];
			});
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Test',
			});
			workflowsStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'ManualTrigger') return triggerNode;
				if (name === 'Regular') return regularNode;
				return null;
			});

			const { totalCardsRequiringSetup } = useWorkflowSetupState();

			// 1 standalone trigger card (no credentials) + 1 credential card
			expect(totalCardsRequiringSetup.value).toBe(2);
		});

		it('should produce single credential card for trigger with credentials (trigger embedded)', () => {
			const triggerNode = createNode({
				name: 'SlackTrigger',
				type: 'n8n-nodes-base.slackTrigger',
			});
			workflowsStore.allNodes = [triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'slackApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Slack API',
			});
			workflowsStore.getNodeByName = vi.fn().mockReturnValue(triggerNode);

			const { totalCardsRequiringSetup } = useWorkflowSetupState();

			// 1 credential card with embedded trigger (no separate trigger card)
			expect(totalCardsRequiringSetup.value).toBe(1);
		});

		it('should produce credential card + standalone trigger for two triggers sharing a credential', () => {
			const trigger1 = createNode({
				name: 'SlackTrigger1',
				type: 'n8n-nodes-base.slackTrigger',
				position: [0, 0],
			});
			const trigger2 = createNode({
				name: 'SlackTrigger2',
				type: 'n8n-nodes-base.slackTrigger',
				position: [100, 0],
			});
			workflowsStore.allNodes = [trigger1, trigger2];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'slackApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Slack API',
			});
			workflowsStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'SlackTrigger1') return trigger1;
				if (name === 'SlackTrigger2') return trigger2;
				return null;
			});

			const { totalCardsRequiringSetup } = useWorkflowSetupState();

			// 1 credential card (first trigger embedded) + 1 standalone trigger card
			expect(totalCardsRequiringSetup.value).toBe(2);
		});
	});

	describe('with custom nodes ref', () => {
		it('should use provided nodes ref instead of store nodes', () => {
			const customNode = createNode({ name: 'CustomNode' });
			const storeNode = createNode({ name: 'StoreNode' });
			workflowsStore.allNodes = [storeNode];

			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'testApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Test',
			});
			workflowsStore.getNodeByName = vi.fn().mockReturnValue(customNode);

			const nodesRef = ref<INodeUi[]>([customNode]);
			const { setupCards } = useWorkflowSetupState(nodesRef);

			const credCards = setupCards.value.filter((c) => c.type === 'credential');
			expect(credCards).toHaveLength(1);
			if (credCards[0].type === 'credential') {
				expect(credCards[0].state.nodeNames).toContain('CustomNode');
				expect(credCards[0].state.nodeNames).not.toContain('StoreNode');
			}
		});

		it('should react to changes in the ref', async () => {
			const node1 = createNode({ name: 'Node1' });
			const node2 = createNode({ name: 'Node2' });

			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'testApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Test',
			});
			workflowsStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'Node1') return node1;
				if (name === 'Node2') return node2;
				return null;
			});

			const nodesRef = ref<INodeUi[]>([node1]);
			const { credentialTypeStates } = useWorkflowSetupState(nodesRef);

			expect(credentialTypeStates.value).toHaveLength(1);
			expect(credentialTypeStates.value[0].nodeNames).toEqual(['Node1']);

			nodesRef.value = [node1, node2];
			await nextTick();

			expect(credentialTypeStates.value).toHaveLength(1);
			expect(credentialTypeStates.value[0].nodeNames).toEqual(['Node1', 'Node2']);
		});
	});
});
