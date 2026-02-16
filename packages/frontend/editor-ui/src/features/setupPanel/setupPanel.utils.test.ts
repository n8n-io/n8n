import { createTestNode } from '@/__tests__/mocks';
import type { INodeUi } from '@/Interface';

import {
	getNodeCredentialTypes,
	buildCredentialRequirement,
	isNodeSetupComplete,
	groupCredentialsByType,
	isCredentialCardComplete,
	buildTriggerSetupState,
	sortNodesByExecutionOrder,
} from './setupPanel.utils';
import type { CredentialTypeSetupState, NodeCredentialRequirement } from './setupPanel.types';

const mockGetNodeTypeDisplayableCredentials = vi.fn().mockReturnValue([]);

vi.mock('@/app/utils/nodes/nodeTransforms', () => ({
	getNodeTypeDisplayableCredentials: (...args: unknown[]) =>
		mockGetNodeTypeDisplayableCredentials(...args),
}));

const createNode = (overrides: Partial<INodeUi> = {}): INodeUi =>
	createTestNode({
		name: 'TestNode',
		type: 'n8n-nodes-base.testNode',
		typeVersion: 1,
		position: [0, 0],
		...overrides,
	}) as INodeUi;

const mockNodeTypeProvider = { getNodeType: vi.fn() };

describe('setupPanel.utils', () => {
	beforeEach(() => {
		mockGetNodeTypeDisplayableCredentials.mockReset().mockReturnValue([]);
	});

	describe('getNodeCredentialTypes', () => {
		it('should return credential types from displayable credentials', () => {
			const node = createNode();
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([
				{ name: 'openAiApi' },
				{ name: 'slackApi' },
			]);

			const result = getNodeCredentialTypes(mockNodeTypeProvider, node);

			expect(result).toEqual(['openAiApi', 'slackApi']);
		});

		it('should include credential types from node issues', () => {
			const node = createNode({
				issues: {
					credentials: {
						httpHeaderAuth: ['Credentials not set'],
					},
				},
			});

			const result = getNodeCredentialTypes(mockNodeTypeProvider, node);

			expect(result).toContain('httpHeaderAuth');
		});

		it('should include credential types from assigned credentials', () => {
			const node = createNode({
				credentials: {
					slackApi: { id: 'cred-1', name: 'My Slack' },
				},
			});

			const result = getNodeCredentialTypes(mockNodeTypeProvider, node);

			expect(result).toContain('slackApi');
		});

		it('should deduplicate credential types from all sources', () => {
			const node = createNode({
				credentials: {
					testApi: { id: 'cred-1', name: 'Test' },
				},
				issues: {
					credentials: {
						testApi: ['Some issue'],
					},
				},
			});
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'testApi' }]);

			const result = getNodeCredentialTypes(mockNodeTypeProvider, node);

			expect(result).toEqual(['testApi']);
		});

		it('should return empty array when node has no credentials', () => {
			const node = createNode();

			const result = getNodeCredentialTypes(mockNodeTypeProvider, node);

			expect(result).toEqual([]);
		});
	});

	describe('buildCredentialRequirement', () => {
		const displayNameLookup = (type: string) => `Display: ${type}`;

		it('should build requirement with selected credential id', () => {
			const node = createNode({
				credentials: {
					testApi: { id: 'cred-1', name: 'My Cred' },
				},
			});
			const nodeNames = new Map([['testApi', ['TestNode']]]);

			const result = buildCredentialRequirement(node, 'testApi', displayNameLookup, nodeNames);

			expect(result).toEqual({
				credentialType: 'testApi',
				credentialDisplayName: 'Display: testApi',
				selectedCredentialId: 'cred-1',
				issues: [],
				nodesWithSameCredential: ['TestNode'],
			});
		});

		it('should return undefined selectedCredentialId when no credential is set', () => {
			const node = createNode();
			const nodeNames = new Map<string, string[]>();

			const result = buildCredentialRequirement(node, 'testApi', displayNameLookup, nodeNames);

			expect(result.selectedCredentialId).toBeUndefined();
		});

		it('should return undefined selectedCredentialId for string credential values', () => {
			const node = createNode({
				credentials: {
					testApi: 'some-string-value',
				} as unknown as INodeUi['credentials'],
			});
			const nodeNames = new Map<string, string[]>();

			const result = buildCredentialRequirement(node, 'testApi', displayNameLookup, nodeNames);

			expect(result.selectedCredentialId).toBeUndefined();
		});

		it('should extract issue messages from credential issues', () => {
			const node = createNode({
				issues: {
					credentials: {
						testApi: ['Issue 1', 'Issue 2'],
					},
				},
			});
			const nodeNames = new Map<string, string[]>();

			const result = buildCredentialRequirement(node, 'testApi', displayNameLookup, nodeNames);

			expect(result.issues).toEqual(['Issue 1', 'Issue 2']);
		});

		it('should normalize single issue string to array', () => {
			const node = createNode({
				issues: {
					credentials: {
						testApi: 'Single issue' as unknown as string[],
					},
				},
			});
			const nodeNames = new Map<string, string[]>();

			const result = buildCredentialRequirement(node, 'testApi', displayNameLookup, nodeNames);

			expect(result.issues).toEqual(['Single issue']);
		});

		it('should return empty nodesWithSameCredential when not in map', () => {
			const node = createNode();
			const nodeNames = new Map<string, string[]>();

			const result = buildCredentialRequirement(node, 'unknownApi', displayNameLookup, nodeNames);

			expect(result.nodesWithSameCredential).toEqual([]);
		});
	});

	describe('isNodeSetupComplete', () => {
		it('should return true when all requirements have id and no issues', () => {
			const requirements: NodeCredentialRequirement[] = [
				{
					credentialType: 'testApi',
					credentialDisplayName: 'Test',
					selectedCredentialId: 'cred-1',
					issues: [],
					nodesWithSameCredential: [],
				},
			];

			expect(isNodeSetupComplete(requirements)).toBe(true);
		});

		it('should return false when a requirement has no selectedCredentialId', () => {
			const requirements: NodeCredentialRequirement[] = [
				{
					credentialType: 'testApi',
					credentialDisplayName: 'Test',
					selectedCredentialId: undefined,
					issues: [],
					nodesWithSameCredential: [],
				},
			];

			expect(isNodeSetupComplete(requirements)).toBe(false);
		});

		it('should return false when a requirement has issues', () => {
			const requirements: NodeCredentialRequirement[] = [
				{
					credentialType: 'testApi',
					credentialDisplayName: 'Test',
					selectedCredentialId: 'cred-1',
					issues: ['Token expired'],
					nodesWithSameCredential: [],
				},
			];

			expect(isNodeSetupComplete(requirements)).toBe(false);
		});

		it('should return true for empty requirements array', () => {
			expect(isNodeSetupComplete([])).toBe(true);
		});

		it('should return false if any one of multiple requirements is incomplete', () => {
			const requirements: NodeCredentialRequirement[] = [
				{
					credentialType: 'apiA',
					credentialDisplayName: 'A',
					selectedCredentialId: 'cred-1',
					issues: [],
					nodesWithSameCredential: [],
				},
				{
					credentialType: 'apiB',
					credentialDisplayName: 'B',
					selectedCredentialId: undefined,
					issues: [],
					nodesWithSameCredential: [],
				},
			];

			expect(isNodeSetupComplete(requirements)).toBe(false);
		});
	});

	describe('groupCredentialsByType', () => {
		const displayNameLookup = (type: string) => `Display: ${type}`;
		const isGenericAuthLookup = (_type: string) => false;

		it('should group multiple nodes sharing the same credential type', () => {
			const nodeA = createNode({
				name: 'NodeA',
				credentials: { slackApi: { id: 'cred-1', name: 'Slack' } },
			});
			const nodeB = createNode({
				name: 'NodeB',
				credentials: { slackApi: { id: 'cred-2', name: 'Slack 2' } },
			});

			const result = groupCredentialsByType(
				[
					{ node: nodeA, credentialTypes: ['slackApi'], isTrigger: false },
					{ node: nodeB, credentialTypes: ['slackApi'], isTrigger: false },
				],
				displayNameLookup,
				isGenericAuthLookup,
			);

			expect(result).toHaveLength(1);
			expect(result[0].credentialType).toBe('slackApi');
			expect(result[0].credentialDisplayName).toBe('Display: slackApi');
			expect(result[0].nodeNames).toEqual(['NodeA', 'NodeB']);
		});

		it('should pick selectedCredentialId from the first node that has it', () => {
			const nodeA = createNode({ name: 'NodeA' });
			const nodeB = createNode({
				name: 'NodeB',
				credentials: { slackApi: { id: 'cred-2', name: 'Slack' } },
			});

			const result = groupCredentialsByType(
				[
					{ node: nodeA, credentialTypes: ['slackApi'], isTrigger: false },
					{ node: nodeB, credentialTypes: ['slackApi'], isTrigger: false },
				],
				displayNameLookup,
				isGenericAuthLookup,
			);

			expect(result[0].selectedCredentialId).toBe('cred-2');
		});

		it('should merge issues from multiple nodes without duplicates', () => {
			const nodeA = createNode({
				name: 'NodeA',
				issues: { credentials: { slackApi: ['Token expired'] } },
			});
			const nodeB = createNode({
				name: 'NodeB',
				issues: { credentials: { slackApi: ['Token expired', 'Rate limited'] } },
			});

			const result = groupCredentialsByType(
				[
					{ node: nodeA, credentialTypes: ['slackApi'], isTrigger: false },
					{ node: nodeB, credentialTypes: ['slackApi'], isTrigger: false },
				],
				displayNameLookup,
				isGenericAuthLookup,
			);

			expect(result[0].issues).toEqual(['Token expired', 'Rate limited']);
		});

		it('should collect all nodeNames in the group', () => {
			const nodes = ['A', 'B', 'C'].map((name) =>
				createNode({ name, credentials: { api: { id: `cred-${name}`, name } } }),
			);

			const result = groupCredentialsByType(
				nodes.map((node) => ({ node, credentialTypes: ['api'], isTrigger: false })),
				displayNameLookup,
				isGenericAuthLookup,
			);

			expect(result[0].nodeNames).toEqual(['A', 'B', 'C']);
		});

		it('should set isComplete to true when selectedCredentialId exists and no issues', () => {
			const node = createNode({
				name: 'NodeA',
				credentials: { slackApi: { id: 'cred-1', name: 'Slack' } },
			});

			const result = groupCredentialsByType(
				[{ node, credentialTypes: ['slackApi'], isTrigger: false }],
				displayNameLookup,
				isGenericAuthLookup,
			);

			expect(result[0].isComplete).toBe(true);
		});

		it('should set isComplete to false when selectedCredentialId is missing', () => {
			const node = createNode({ name: 'NodeA' });

			const result = groupCredentialsByType(
				[{ node, credentialTypes: ['slackApi'], isTrigger: false }],
				displayNameLookup,
				isGenericAuthLookup,
			);

			expect(result[0].isComplete).toBe(false);
		});

		it('should set isComplete to false when there are issues', () => {
			const node = createNode({
				name: 'NodeA',
				credentials: { slackApi: { id: 'cred-1', name: 'Slack' } },
				issues: { credentials: { slackApi: ['Token expired'] } },
			});

			const result = groupCredentialsByType(
				[{ node, credentialTypes: ['slackApi'], isTrigger: false }],
				displayNameLookup,
				isGenericAuthLookup,
			);

			expect(result[0].isComplete).toBe(false);
		});

		it('should return empty array for empty input', () => {
			const result = groupCredentialsByType([], displayNameLookup, isGenericAuthLookup);

			expect(result).toEqual([]);
		});

		it('should create separate entries for different credential types', () => {
			const node = createNode({
				name: 'NodeA',
				credentials: {
					slackApi: { id: 'cred-1', name: 'Slack' },
					githubApi: { id: 'cred-2', name: 'GitHub' },
				},
			});

			const result = groupCredentialsByType(
				[{ node, credentialTypes: ['slackApi', 'githubApi'], isTrigger: false }],
				displayNameLookup,
				isGenericAuthLookup,
			);

			expect(result).toHaveLength(2);
			expect(result.map((s) => s.credentialType)).toEqual(['slackApi', 'githubApi']);
		});

		it('should initialize triggerNodes as empty array for non-trigger nodes', () => {
			const node = createNode({
				name: 'NodeA',
				credentials: { slackApi: { id: 'cred-1', name: 'Slack' } },
			});

			const result = groupCredentialsByType(
				[{ node, credentialTypes: ['slackApi'], isTrigger: false }],
				displayNameLookup,
				isGenericAuthLookup,
			);

			expect(result[0].triggerNodes).toEqual([]);
		});

		it('should populate triggerNodes for trigger nodes', () => {
			const triggerNode = createNode({
				name: 'SlackTrigger',
				type: 'n8n-nodes-base.slackTrigger',
				credentials: { slackApi: { id: 'cred-1', name: 'Slack' } },
			});

			const result = groupCredentialsByType(
				[{ node: triggerNode, credentialTypes: ['slackApi'], isTrigger: true }],
				displayNameLookup,
				isGenericAuthLookup,
			);

			expect(result[0].triggerNodes).toHaveLength(1);
			expect(result[0].triggerNodes[0].name).toBe('SlackTrigger');
		});

		it('should add trigger node to existing credential group', () => {
			const regularNode = createNode({
				name: 'SlackNode',
				credentials: { slackApi: { id: 'cred-1', name: 'Slack' } },
			});
			const triggerNode = createNode({
				name: 'SlackTrigger',
				type: 'n8n-nodes-base.slackTrigger',
				credentials: { slackApi: { id: 'cred-1', name: 'Slack' } },
			});

			const result = groupCredentialsByType(
				[
					{ node: regularNode, credentialTypes: ['slackApi'], isTrigger: false },
					{ node: triggerNode, credentialTypes: ['slackApi'], isTrigger: true },
				],
				displayNameLookup,
				isGenericAuthLookup,
			);

			expect(result).toHaveLength(1);
			expect(result[0].nodeNames).toEqual(['SlackNode', 'SlackTrigger']);
			expect(result[0].triggerNodes).toHaveLength(1);
			expect(result[0].triggerNodes[0].name).toBe('SlackTrigger');
		});
	});

	describe('isCredentialCardComplete', () => {
		it('should return true when credential is set, no issues, and no triggers', () => {
			const state: CredentialTypeSetupState = {
				credentialType: 'slackApi',
				credentialDisplayName: 'Slack',
				selectedCredentialId: 'cred-1',
				issues: [],
				nodeNames: ['SlackNode'],
				triggerNodes: [],
				isComplete: false,
				isGenericAuth: false,
			};

			expect(isCredentialCardComplete(state, () => false)).toBe(true);
		});

		it('should return false when credential is missing', () => {
			const state: CredentialTypeSetupState = {
				credentialType: 'slackApi',
				credentialDisplayName: 'Slack',
				selectedCredentialId: undefined,
				issues: [],
				nodeNames: ['SlackNode'],
				triggerNodes: [],
				isComplete: false,
				isGenericAuth: false,
			};

			expect(isCredentialCardComplete(state, () => true)).toBe(false);
		});

		it('should return false when there are issues', () => {
			const state: CredentialTypeSetupState = {
				credentialType: 'slackApi',
				credentialDisplayName: 'Slack',
				selectedCredentialId: 'cred-1',
				issues: ['Token expired'],
				nodeNames: ['SlackNode'],
				triggerNodes: [],
				isComplete: false,
				isGenericAuth: false,
			};

			expect(isCredentialCardComplete(state, () => true)).toBe(false);
		});

		it('should return false when trigger has not executed', () => {
			const triggerNode = createNode({ name: 'SlackTrigger' });
			const state: CredentialTypeSetupState = {
				credentialType: 'slackApi',
				credentialDisplayName: 'Slack',
				selectedCredentialId: 'cred-1',
				issues: [],
				nodeNames: ['SlackTrigger'],
				triggerNodes: [triggerNode],
				isComplete: false,
				isGenericAuth: false,
			};

			expect(isCredentialCardComplete(state, () => false)).toBe(false);
		});

		it('should return true when credential is set and all triggers have executed', () => {
			const triggerNode = createNode({ name: 'SlackTrigger' });
			const state: CredentialTypeSetupState = {
				credentialType: 'slackApi',
				credentialDisplayName: 'Slack',
				selectedCredentialId: 'cred-1',
				issues: [],
				nodeNames: ['SlackTrigger'],
				triggerNodes: [triggerNode],
				isComplete: false,
				isGenericAuth: false,
			};

			expect(isCredentialCardComplete(state, () => true)).toBe(true);
		});

		it('should return true when single embedded trigger has executed', () => {
			const trigger = createNode({ name: 'Trigger1' });
			const state: CredentialTypeSetupState = {
				credentialType: 'slackApi',
				credentialDisplayName: 'Slack',
				selectedCredentialId: 'cred-1',
				issues: [],
				nodeNames: ['Trigger1'],
				triggerNodes: [trigger],
				isComplete: false,
				isGenericAuth: false,
			};

			expect(isCredentialCardComplete(state, () => true)).toBe(true);
		});
	});

	describe('buildTriggerSetupState', () => {
		it('should be complete when trigger has no credential types and has executed', () => {
			const node = createNode({ name: 'Trigger' });

			const result = buildTriggerSetupState(node, [], [], true);

			expect(result.node).toBe(node);
			expect(result.isComplete).toBe(true);
		});

		it('should be incomplete when trigger has no credential types and has not executed', () => {
			const node = createNode({ name: 'Trigger' });

			const result = buildTriggerSetupState(node, [], [], false);

			expect(result.isComplete).toBe(false);
		});

		it('should be incomplete when credentials are complete but trigger has not executed', () => {
			const node = createNode({ name: 'Trigger' });
			const credentialTypeStates: CredentialTypeSetupState[] = [
				{
					credentialType: 'slackApi',
					credentialDisplayName: 'Slack',
					selectedCredentialId: 'cred-1',
					issues: [],
					nodeNames: ['Trigger'],
					triggerNodes: [],
					isComplete: true,
					isGenericAuth: false,
				},
			];

			const result = buildTriggerSetupState(node, ['slackApi'], credentialTypeStates, false);

			expect(result.isComplete).toBe(false);
		});

		it('should be incomplete when trigger has executed but credentials are incomplete', () => {
			const node = createNode({ name: 'Trigger' });
			const credentialTypeStates: CredentialTypeSetupState[] = [
				{
					credentialType: 'slackApi',
					credentialDisplayName: 'Slack',
					selectedCredentialId: undefined,
					issues: [],
					nodeNames: ['Trigger'],
					triggerNodes: [],
					isComplete: false,
					isGenericAuth: false,
				},
			];

			const result = buildTriggerSetupState(node, ['slackApi'], credentialTypeStates, true);

			expect(result.isComplete).toBe(false);
		});

		it('should be complete when all credentials are complete and trigger has executed', () => {
			const node = createNode({ name: 'Trigger' });
			const credentialTypeStates: CredentialTypeSetupState[] = [
				{
					credentialType: 'slackApi',
					credentialDisplayName: 'Slack',
					selectedCredentialId: 'cred-1',
					issues: [],
					nodeNames: ['Trigger'],
					triggerNodes: [],
					isComplete: true,
					isGenericAuth: false,
				},
				{
					credentialType: 'githubApi',
					credentialDisplayName: 'GitHub',
					selectedCredentialId: 'cred-2',
					issues: [],
					nodeNames: ['Trigger'],
					triggerNodes: [],
					isComplete: true,
					isGenericAuth: false,
				},
			];

			const result = buildTriggerSetupState(
				node,
				['slackApi', 'githubApi'],
				credentialTypeStates,
				true,
			);

			expect(result.isComplete).toBe(true);
		});

		it('should treat missing credential type states as complete', () => {
			const node = createNode({ name: 'Trigger' });

			const result = buildTriggerSetupState(node, ['unknownApi'], [], true);

			expect(result.isComplete).toBe(true);
		});
	});

	describe('sortNodesByExecutionOrder', () => {
		const makeSetupNode = (name: string, position: [number, number], isTrigger = false) => ({
			node: createNode({ name, position }),
			isTrigger,
			credentialTypes: ['testApi'],
		});

		it('should return empty array for empty input', () => {
			const result = sortNodesByExecutionOrder([], {});

			expect(result).toEqual([]);
		});

		it('should return empty array when there are no triggers', () => {
			const nodeA = makeSetupNode('A', [200, 0]);
			const nodeB = makeSetupNode('B', [100, 0]);

			const result = sortNodesByExecutionOrder([nodeA, nodeB], {});

			expect(result).toEqual([]);
		});

		it('should sort a linear chain by execution order', () => {
			const trigger = makeSetupNode('Trigger', [0, 0], true);
			const nodeA = makeSetupNode('A', [100, 0]);
			const nodeB = makeSetupNode('B', [200, 0]);

			const connections = {
				Trigger: { main: [[{ node: 'A', type: 'main' as const, index: 0 }]] },
				A: { main: [[{ node: 'B', type: 'main' as const, index: 0 }]] },
			};

			const result = sortNodesByExecutionOrder([nodeB, nodeA, trigger], connections);

			expect(result.map((n) => n.node.name)).toEqual(['Trigger', 'A', 'B']);
		});

		it('should drop orphaned nodes not connected to any trigger', () => {
			const trigger = makeSetupNode('Trigger', [0, 0], true);
			const connected = makeSetupNode('Connected', [100, 0]);
			const orphaned = makeSetupNode('Orphaned', [50, 0]);

			const connections = {
				Trigger: { main: [[{ node: 'Connected', type: 'main' as const, index: 0 }]] },
			};

			const result = sortNodesByExecutionOrder([orphaned, connected, trigger], connections);

			expect(result.map((n) => n.node.name)).toEqual(['Trigger', 'Connected']);
		});

		it('should group nodes by trigger, processing triggers by X position', () => {
			const triggerA = makeSetupNode('TriggerA', [200, 0], true);
			const triggerB = makeSetupNode('TriggerB', [0, 0], true);
			const nodeA = makeSetupNode('A', [300, 0]);
			const nodeB = makeSetupNode('B', [100, 0]);

			const connections = {
				TriggerA: { main: [[{ node: 'A', type: 'main' as const, index: 0 }]] },
				TriggerB: { main: [[{ node: 'B', type: 'main' as const, index: 0 }]] },
			};

			const result = sortNodesByExecutionOrder([nodeA, triggerA, nodeB, triggerB], connections);

			// TriggerB (x=0) first with its children, then TriggerA (x=200) with its children
			expect(result.map((n) => n.node.name)).toEqual(['TriggerB', 'B', 'TriggerA', 'A']);
		});

		it('should handle cycles gracefully', () => {
			const trigger = makeSetupNode('Trigger', [0, 0], true);
			const nodeA = makeSetupNode('A', [100, 0]);
			const nodeB = makeSetupNode('B', [200, 0]);

			const connections = {
				Trigger: { main: [[{ node: 'A', type: 'main' as const, index: 0 }]] },
				A: { main: [[{ node: 'B', type: 'main' as const, index: 0 }]] },
				B: { main: [[{ node: 'A', type: 'main' as const, index: 0 }]] },
			};

			const result = sortNodesByExecutionOrder([nodeB, nodeA, trigger], connections);

			expect(result.map((n) => n.node.name)).toEqual(['Trigger', 'A', 'B']);
		});

		it('should traverse through intermediate non-setup nodes', () => {
			const trigger = makeSetupNode('Trigger', [0, 0], true);
			const nodeC = makeSetupNode('C', [300, 0]);

			// Trigger → IntermediateNode → C, but IntermediateNode is not in the setup panel
			const connections = {
				Trigger: { main: [[{ node: 'IntermediateNode', type: 'main' as const, index: 0 }]] },
				IntermediateNode: { main: [[{ node: 'C', type: 'main' as const, index: 0 }]] },
			};

			const result = sortNodesByExecutionOrder([nodeC, trigger], connections);

			expect(result.map((n) => n.node.name)).toEqual(['Trigger', 'C']);
		});

		it('should follow depth-first order, completing each branch before the next', () => {
			const trigger = makeSetupNode('Trigger', [0, 0], true);
			const nodeA = makeSetupNode('A', [100, 0]);
			const nodeB = makeSetupNode('B', [200, 0]);
			const nodeC = makeSetupNode('C', [100, 100]);
			const nodeD = makeSetupNode('D', [200, 100]);

			// Trigger → A → B
			//         ↘ C → D
			const connections = {
				Trigger: {
					main: [
						[
							{ node: 'A', type: 'main' as const, index: 0 },
							{ node: 'C', type: 'main' as const, index: 0 },
						],
					],
				},
				A: { main: [[{ node: 'B', type: 'main' as const, index: 0 }]] },
				C: { main: [[{ node: 'D', type: 'main' as const, index: 0 }]] },
			};

			const result = sortNodesByExecutionOrder([nodeD, nodeC, nodeB, nodeA, trigger], connections);

			// DFS: completes A→B before visiting C→D
			// (BFS would produce: Trigger, A, C, B, D)
			expect(result.map((n) => n.node.name)).toEqual(['Trigger', 'A', 'B', 'C', 'D']);
		});

		it('should not duplicate nodes reachable from multiple triggers', () => {
			const triggerA = makeSetupNode('TriggerA', [0, 0], true);
			const triggerB = makeSetupNode('TriggerB', [100, 100], true);
			const shared = makeSetupNode('Shared', [200, 50]);

			const connections = {
				TriggerA: { main: [[{ node: 'Shared', type: 'main' as const, index: 0 }]] },
				TriggerB: { main: [[{ node: 'Shared', type: 'main' as const, index: 0 }]] },
			};

			const result = sortNodesByExecutionOrder([shared, triggerB, triggerA], connections);

			// Shared appears only once, under the first trigger (TriggerA, x=0)
			expect(result.map((n) => n.node.name)).toEqual(['TriggerA', 'Shared', 'TriggerB']);
		});
	});
});
