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
const mockShowMessage = vi.fn();

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

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn(() => ({
		showMessage: mockShowMessage,
	})),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: vi.fn(() => ({
		baseText: vi.fn((key: string, opts?: { interpolate?: Record<string, string> }) => {
			if (opts?.interpolate) {
				return `${key}:${JSON.stringify(opts.interpolate)}`;
			}
			return key;
		}),
	})),
}));

const mockGetNodeTypeDisplayableCredentials = vi.fn().mockReturnValue([]);

vi.mock('@/app/utils/nodes/nodeTransforms', () => ({
	getNodeTypeDisplayableCredentials: (...args: unknown[]) =>
		mockGetNodeTypeDisplayableCredentials(...args),
}));

// Sorting/filtering by execution order is tested in setupPanel.utils.test.ts.
// Use a pass-through mock here so non-sorting tests are not affected.
vi.mock('@/app/utils/workflowUtils', async () => {
	const actual = await vi.importActual('@/app/utils/workflowUtils');
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

		// Default: getters return no-op functions
		credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue(undefined);
		credentialsStore.getCredentialById = vi.fn().mockReturnValue(undefined);
		nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(false);
		workflowsStore.getWorkflowResultDataByNodeName = vi.fn().mockReturnValue(null);

		mockGetNodeTypeDisplayableCredentials.mockReturnValue([]);
		mockUpdateNodeProperties.mockReset();
		mockUpdateNodeCredentialIssuesByName.mockReset();
		mockUpdateNodesCredentialsIssues.mockReset();
		mockShowMessage.mockReset();
	});

	describe('nodeSetupStates', () => {
		it('should return empty array when there are no nodes', () => {
			workflowsStore.allNodes = [];

			const { nodeSetupStates } = useWorkflowSetupState();

			expect(nodeSetupStates.value).toEqual([]);
		});

		it('should exclude nodes without credentials', () => {
			const node = createNode({ name: 'NoCredNode' });
			workflowsStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([]);

			const { nodeSetupStates } = useWorkflowSetupState();

			expect(nodeSetupStates.value).toEqual([]);
		});

		it('should exclude disabled nodes', () => {
			const node = createNode({ name: 'DisabledNode', disabled: true });
			workflowsStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'testApi' }]);

			const { nodeSetupStates } = useWorkflowSetupState();

			expect(nodeSetupStates.value).toEqual([]);
		});

		it('should include nodes with displayable credentials', () => {
			const node = createNode({ name: 'OpenAI' });
			workflowsStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
			});

			const { nodeSetupStates } = useWorkflowSetupState();

			expect(nodeSetupStates.value).toHaveLength(1);
			expect(nodeSetupStates.value[0].node.name).toBe('OpenAI');
			expect(nodeSetupStates.value[0].credentialRequirements).toHaveLength(1);
			expect(nodeSetupStates.value[0].credentialRequirements[0].credentialType).toBe('openAiApi');
			expect(nodeSetupStates.value[0].credentialRequirements[0].credentialDisplayName).toBe(
				'OpenAI API',
			);
		});

		it('should include nodes with credential issues (dynamic credentials)', () => {
			const node = createNode({
				name: 'HttpRequest',
				issues: {
					credentials: {
						httpHeaderAuth: ['Credentials not set'],
					},
				},
			});
			workflowsStore.allNodes = [node];

			const { nodeSetupStates } = useWorkflowSetupState();

			expect(nodeSetupStates.value).toHaveLength(1);
			expect(nodeSetupStates.value[0].credentialRequirements[0].credentialType).toBe(
				'httpHeaderAuth',
			);
			expect(nodeSetupStates.value[0].credentialRequirements[0].issues).toEqual([
				'Credentials not set',
			]);
		});

		it('should include nodes with assigned credentials', () => {
			const node = createNode({
				name: 'Slack',
				credentials: {
					slackApi: { id: 'cred-1', name: 'My Slack' },
				},
			});
			workflowsStore.allNodes = [node];
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Slack API',
			});

			const { nodeSetupStates } = useWorkflowSetupState();

			expect(nodeSetupStates.value).toHaveLength(1);
			expect(nodeSetupStates.value[0].credentialRequirements[0].selectedCredentialId).toBe(
				'cred-1',
			);
		});

		it('should deduplicate credential types from multiple sources', () => {
			const node = createNode({
				name: 'TestNode',
				credentials: {
					testApi: { id: 'cred-1', name: 'Test Cred' },
				},
				issues: {
					credentials: {
						testApi: ['Some issue'],
					},
				},
			});
			workflowsStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'testApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Test API',
			});

			const { nodeSetupStates } = useWorkflowSetupState();

			expect(nodeSetupStates.value).toHaveLength(1);
			expect(nodeSetupStates.value[0].credentialRequirements).toHaveLength(1);
		});

		it('should collect multiple credential types for a single node', () => {
			const node = createNode({
				name: 'MultiCred',
				credentials: {
					oauth2Api: { id: 'cred-1', name: 'OAuth' },
				},
				issues: {
					credentials: {
						smtpApi: ['Not configured'],
					},
				},
			});
			workflowsStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'httpBasicAuth' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue(undefined);

			const { nodeSetupStates } = useWorkflowSetupState();

			expect(nodeSetupStates.value).toHaveLength(1);
			const credTypes = nodeSetupStates.value[0].credentialRequirements.map(
				(r) => r.credentialType,
			);
			expect(credTypes).toContain('httpBasicAuth');
			expect(credTypes).toContain('smtpApi');
			expect(credTypes).toContain('oauth2Api');
		});

		it('should fall back to credential type name when display name is not found', () => {
			const node = createNode({ name: 'TestNode' });
			workflowsStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'unknownApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue(undefined);

			const { nodeSetupStates } = useWorkflowSetupState();

			expect(nodeSetupStates.value[0].credentialRequirements[0].credentialDisplayName).toBe(
				'unknownApi',
			);
		});

		it('should handle string credential values (no id)', () => {
			const node = createNode({
				name: 'TestNode',
				credentials: {
					testApi: 'some-string-value',
				} as unknown as INodeUi['credentials'],
			});
			workflowsStore.allNodes = [node];
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue(undefined);

			const { nodeSetupStates } = useWorkflowSetupState();

			expect(nodeSetupStates.value[0].credentialRequirements[0].selectedCredentialId).toBe(
				undefined,
			);
		});
	});

	describe('isComplete', () => {
		it('should mark node as complete when all credentials are selected with no issues', () => {
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

			const { nodeSetupStates } = useWorkflowSetupState();

			expect(nodeSetupStates.value[0].isComplete).toBe(true);
		});

		it('should mark node as incomplete when credential is missing', () => {
			const node = createNode({ name: 'Slack' });
			workflowsStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'slackApi' }]);

			const { nodeSetupStates } = useWorkflowSetupState();

			expect(nodeSetupStates.value[0].isComplete).toBe(false);
		});

		it('should mark node as incomplete when credential has issues', () => {
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

			const { nodeSetupStates } = useWorkflowSetupState();

			expect(nodeSetupStates.value[0].isComplete).toBe(false);
		});

		it('should mark node as incomplete when one of multiple credentials is missing', () => {
			const node = createNode({
				name: 'MultiCred',
				credentials: {
					oauth2Api: { id: 'cred-1', name: 'OAuth' },
				},
			});
			workflowsStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([
				{ name: 'oauth2Api' },
				{ name: 'smtpApi' },
			]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Test',
			});

			const { nodeSetupStates } = useWorkflowSetupState();

			expect(nodeSetupStates.value[0].isComplete).toBe(false);
		});
	});

	describe('trigger nodes', () => {
		it('should include trigger nodes even without credential requirements', () => {
			const triggerNode = createNode({ name: 'WebhookTrigger', type: 'n8n-nodes-base.webhook' });
			workflowsStore.allNodes = [triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([]);
			workflowsStore.getWorkflowResultDataByNodeName = vi.fn().mockReturnValue(null);

			const { nodeSetupStates } = useWorkflowSetupState();

			expect(nodeSetupStates.value).toHaveLength(1);
			expect(nodeSetupStates.value[0].node.name).toBe('WebhookTrigger');
			expect(nodeSetupStates.value[0].credentialRequirements).toHaveLength(0);
		});

		it('should set isTrigger flag to true for trigger nodes', () => {
			const triggerNode = createNode({ name: 'Trigger', type: 'n8n-nodes-base.trigger' });
			workflowsStore.allNodes = [triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'testApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({ displayName: 'Test' });

			const { nodeSetupStates } = useWorkflowSetupState();

			expect(nodeSetupStates.value[0].isTrigger).toBe(true);
		});

		it('should set isTrigger flag to false for non-trigger nodes', () => {
			const node = createNode({ name: 'Regular' });
			workflowsStore.allNodes = [node];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(false);
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'testApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({ displayName: 'Test' });

			const { nodeSetupStates } = useWorkflowSetupState();

			expect(nodeSetupStates.value[0].isTrigger).toBe(false);
		});

		it('should mark trigger as incomplete when credentials configured but no execution data', () => {
			const triggerNode = createNode({
				name: 'Trigger',
				type: 'n8n-nodes-base.trigger',
				credentials: { triggerApi: { id: 'cred-1', name: 'My Cred' } },
			});
			workflowsStore.allNodes = [triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'triggerApi' }]);
			credentialsStore.getCredentialTypeByName = vi
				.fn()
				.mockReturnValue({ displayName: 'Trigger API' });
			workflowsStore.getWorkflowResultDataByNodeName = vi.fn().mockReturnValue(null);

			const { nodeSetupStates } = useWorkflowSetupState();

			expect(nodeSetupStates.value[0].isComplete).toBe(false);
		});

		it('should mark trigger as complete when credentials configured and execution succeeded', () => {
			const triggerNode = createNode({
				name: 'Trigger',
				type: 'n8n-nodes-base.trigger',
				credentials: { triggerApi: { id: 'cred-1', name: 'My Cred' } },
			});
			workflowsStore.allNodes = [triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'triggerApi' }]);
			credentialsStore.getCredentialTypeByName = vi
				.fn()
				.mockReturnValue({ displayName: 'Trigger API' });
			workflowsStore.getWorkflowResultDataByNodeName = vi.fn().mockReturnValue([{ data: {} }]);

			const { nodeSetupStates } = useWorkflowSetupState();

			expect(nodeSetupStates.value[0].isComplete).toBe(true);
		});

		it('should mark trigger as incomplete when execution data exists but credentials missing', () => {
			const triggerNode = createNode({ name: 'Trigger', type: 'n8n-nodes-base.trigger' });
			workflowsStore.allNodes = [triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'triggerApi' }]);
			credentialsStore.getCredentialTypeByName = vi
				.fn()
				.mockReturnValue({ displayName: 'Trigger API' });
			workflowsStore.getWorkflowResultDataByNodeName = vi.fn().mockReturnValue([{ data: {} }]);

			const { nodeSetupStates } = useWorkflowSetupState();

			expect(nodeSetupStates.value[0].isComplete).toBe(false);
		});

		it('should mark trigger without credentials as incomplete when no execution data', () => {
			const triggerNode = createNode({
				name: 'ManualTrigger',
				type: 'n8n-nodes-base.manualTrigger',
			});
			workflowsStore.allNodes = [triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([]);
			workflowsStore.getWorkflowResultDataByNodeName = vi.fn().mockReturnValue(null);

			const { nodeSetupStates } = useWorkflowSetupState();

			expect(nodeSetupStates.value[0].isComplete).toBe(false);
		});

		it('should mark trigger without credentials as complete after successful execution', () => {
			const triggerNode = createNode({
				name: 'ManualTrigger',
				type: 'n8n-nodes-base.manualTrigger',
			});
			workflowsStore.allNodes = [triggerNode];
			nodeTypesStore.isTriggerNode = vi.fn().mockReturnValue(true);
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([]);
			workflowsStore.getWorkflowResultDataByNodeName = vi.fn().mockReturnValue([{ data: {} }]);

			const { nodeSetupStates } = useWorkflowSetupState();

			expect(nodeSetupStates.value[0].isComplete).toBe(true);
		});
	});

	describe('nodesWithSameCredential', () => {
		it('should track which nodes share the same credential type', () => {
			const node1 = createNode({ name: 'OpenAI1', position: [0, 0] });
			const node2 = createNode({ name: 'OpenAI2', position: [100, 0] });
			workflowsStore.allNodes = [node1, node2];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
			});

			const { nodeSetupStates } = useWorkflowSetupState();

			expect(nodeSetupStates.value[0].credentialRequirements[0].nodesWithSameCredential).toEqual([
				'OpenAI1',
				'OpenAI2',
			]);
			expect(nodeSetupStates.value[1].credentialRequirements[0].nodesWithSameCredential).toEqual([
				'OpenAI1',
				'OpenAI2',
			]);
		});
	});

	describe('totalCredentialsMissing', () => {
		it('should return 0 when no nodes require credentials', () => {
			workflowsStore.allNodes = [];

			const { totalCredentialsMissing } = useWorkflowSetupState();

			expect(totalCredentialsMissing.value).toBe(0);
		});

		it('should count credentials without selectedCredentialId', () => {
			const node = createNode({ name: 'TestNode' });
			workflowsStore.allNodes = [node];
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'credA' }, { name: 'credB' }]);

			const { totalCredentialsMissing } = useWorkflowSetupState();

			expect(totalCredentialsMissing.value).toBe(2);
		});

		it('should count credentials with issues even if they have an id', () => {
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

			const { totalCredentialsMissing } = useWorkflowSetupState();

			expect(totalCredentialsMissing.value).toBe(1);
		});

		it('should return 0 when all credentials are properly assigned', () => {
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

			const { totalCredentialsMissing } = useWorkflowSetupState();

			expect(totalCredentialsMissing.value).toBe(0);
		});
	});

	describe('totalNodesRequiringSetup', () => {
		it('should return the count of nodes that require credentials', () => {
			const node1 = createNode({ name: 'Node1' });
			const node2 = createNode({ name: 'Node2' });
			const node3 = createNode({ name: 'NoCredNode' });
			workflowsStore.allNodes = [node1, node2, node3];
			mockGetNodeTypeDisplayableCredentials.mockImplementation((_store, node) => {
				if ((node as INodeUi).name === 'NoCredNode') return [];
				return [{ name: 'testApi' }];
			});

			const { totalNodesRequiringSetup } = useWorkflowSetupState();

			expect(totalNodesRequiringSetup.value).toBe(2);
		});
	});

	describe('isAllComplete', () => {
		it('should return false when there are no nodes', () => {
			workflowsStore.allNodes = [];

			const { isAllComplete } = useWorkflowSetupState();

			expect(isAllComplete.value).toBe(false);
		});

		it('should return true when all nodes have all credentials set with no issues', () => {
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

			const { isAllComplete } = useWorkflowSetupState();

			expect(isAllComplete.value).toBe(true);
		});

		it('should return false when any node is incomplete', () => {
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
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'slackApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Slack API',
			});

			const { isAllComplete } = useWorkflowSetupState();

			expect(isAllComplete.value).toBe(false);
		});
	});

	describe('setCredential', () => {
		it('should update node credentials', () => {
			const node = createNode({ name: 'OpenAI' });
			workflowsStore.allNodes = [node];
			workflowsStore.getNodeByName = vi.fn().mockReturnValue(node);
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({
				id: 'cred-1',
				name: 'My OpenAI Key',
			});

			const { setCredential } = useWorkflowSetupState();
			setCredential('OpenAI', 'openAiApi', 'cred-1');

			expect(mockUpdateNodeProperties).toHaveBeenCalledWith({
				name: 'OpenAI',
				properties: {
					credentials: {
						openAiApi: { id: 'cred-1', name: 'My OpenAI Key' },
					},
				},
			});
			expect(mockUpdateNodeCredentialIssuesByName).toHaveBeenCalledWith('OpenAI');
		});

		it('should not update when credential is not found', () => {
			workflowsStore.getNodeByName = vi.fn().mockReturnValue(createNode());
			credentialsStore.getCredentialById = vi.fn().mockReturnValue(undefined);

			const { setCredential } = useWorkflowSetupState();
			setCredential('OpenAI', 'openAiApi', 'non-existent');

			expect(mockUpdateNodeProperties).not.toHaveBeenCalled();
		});

		it('should not update when node is not found', () => {
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({
				id: 'cred-1',
				name: 'Test',
			});
			workflowsStore.getNodeByName = vi.fn().mockReturnValue(undefined);

			const { setCredential } = useWorkflowSetupState();
			setCredential('NonExistent', 'openAiApi', 'cred-1');

			expect(mockUpdateNodeProperties).not.toHaveBeenCalled();
		});

		it('should preserve existing credentials when setting a new one', () => {
			const node = createNode({
				name: 'MultiCred',
				credentials: {
					existingApi: { id: 'existing-1', name: 'Existing' },
				},
			});
			workflowsStore.allNodes = [node];
			workflowsStore.getNodeByName = vi.fn().mockReturnValue(node);
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({
				id: 'cred-2',
				name: 'New Cred',
			});

			const { setCredential } = useWorkflowSetupState();
			setCredential('MultiCred', 'newApi', 'cred-2');

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

		it('should auto-assign credential to other nodes that need the same type', () => {
			const node1 = createNode({ name: 'OpenAI1', position: [0, 0] });
			const node2 = createNode({ name: 'OpenAI2', position: [100, 0] });
			workflowsStore.allNodes = [node1, node2];
			workflowsStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'OpenAI1') return node1;
				if (name === 'OpenAI2') return node2;
				return null;
			});
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({
				id: 'cred-1',
				name: 'My OpenAI',
			});
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
			});

			const { setCredential } = useWorkflowSetupState();
			setCredential('OpenAI1', 'openAiApi', 'cred-1');

			// Should update the target node
			expect(mockUpdateNodeProperties).toHaveBeenCalledWith({
				name: 'OpenAI1',
				properties: {
					credentials: {
						openAiApi: { id: 'cred-1', name: 'My OpenAI' },
					},
				},
			});

			// Should auto-assign to the second node
			expect(mockUpdateNodeProperties).toHaveBeenCalledWith({
				name: 'OpenAI2',
				properties: {
					credentials: {
						openAiApi: { id: 'cred-1', name: 'My OpenAI' },
					},
				},
			});

			expect(mockUpdateNodesCredentialsIssues).toHaveBeenCalled();
			expect(mockShowMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'success',
				}),
			);
		});

		it('should not auto-assign to nodes that already have the credential set', () => {
			const node1 = createNode({ name: 'OpenAI1', position: [0, 0] });
			const node2 = createNode({
				name: 'OpenAI2',
				position: [100, 0],
				credentials: {
					openAiApi: { id: 'existing-cred', name: 'Already Set' },
				},
			});
			workflowsStore.allNodes = [node1, node2];
			workflowsStore.getNodeByName = vi.fn((name: string) => {
				if (name === 'OpenAI1') return node1;
				if (name === 'OpenAI2') return node2;
				return null;
			});
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'openAiApi' }]);
			credentialsStore.getCredentialById = vi.fn().mockReturnValue({
				id: 'cred-1',
				name: 'My OpenAI',
			});
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'OpenAI API',
			});

			const { setCredential } = useWorkflowSetupState();
			setCredential('OpenAI1', 'openAiApi', 'cred-1');

			// Should only update OpenAI1, not OpenAI2 (which already has a credential)
			expect(mockUpdateNodeProperties).toHaveBeenCalledTimes(1);
			expect(mockUpdateNodeProperties).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'OpenAI1' }),
			);
			expect(mockShowMessage).not.toHaveBeenCalled();
		});
	});

	describe('unsetCredential', () => {
		it('should remove credential from node', () => {
			const node = createNode({
				name: 'Slack',
				credentials: {
					slackApi: { id: 'cred-1', name: 'My Slack' },
					otherApi: { id: 'cred-2', name: 'Other' },
				},
			});
			workflowsStore.getNodeByName = vi.fn().mockReturnValue(node);

			const { unsetCredential } = useWorkflowSetupState();
			unsetCredential('Slack', 'slackApi');

			expect(mockUpdateNodeProperties).toHaveBeenCalledWith({
				name: 'Slack',
				properties: {
					credentials: {
						otherApi: { id: 'cred-2', name: 'Other' },
					},
				},
			});
			expect(mockUpdateNodeCredentialIssuesByName).toHaveBeenCalledWith('Slack');
		});

		it('should not update when node is not found', () => {
			workflowsStore.getNodeByName = vi.fn().mockReturnValue(undefined);

			const { unsetCredential } = useWorkflowSetupState();
			unsetCredential('NonExistent', 'testApi');

			expect(mockUpdateNodeProperties).not.toHaveBeenCalled();
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

			const nodesRef = ref<INodeUi[]>([customNode]);
			const { nodeSetupStates } = useWorkflowSetupState(nodesRef);

			expect(nodeSetupStates.value).toHaveLength(1);
			expect(nodeSetupStates.value[0].node.name).toBe('CustomNode');
		});

		it('should react to changes in the provided nodes ref', async () => {
			const node1 = createNode({ name: 'Node1' });
			const node2 = createNode({ name: 'Node2' });

			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'testApi' }]);
			credentialsStore.getCredentialTypeByName = vi.fn().mockReturnValue({
				displayName: 'Test',
			});

			const nodesRef = ref<INodeUi[]>([node1]);
			const { nodeSetupStates } = useWorkflowSetupState(nodesRef);

			expect(nodeSetupStates.value).toHaveLength(1);

			nodesRef.value = [node1, node2];
			await nextTick();

			expect(nodeSetupStates.value).toHaveLength(2);
		});
	});
});
