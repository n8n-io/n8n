import { createTestNode } from '@/__tests__/mocks';
import type { INodeUi } from '@/Interface';

import {
	getNodeCredentialTypes,
	groupCredentialsByType,
	isCredentialCardComplete,
	buildTriggerSetupState,
} from '@/features/setupPanel/setupPanel.utils';
import type { CredentialTypeSetupState } from '@/features/setupPanel/setupPanel.types';

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

	describe('groupCredentialsByType', () => {
		const displayNameLookup = (type: string) => `Display: ${type}`;

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
					{ node: nodeA, credentialTypes: ['slackApi'] },
					{ node: nodeB, credentialTypes: ['slackApi'] },
				],
				displayNameLookup,
			);

			expect(result).toHaveLength(1);
			expect(result[0].credentialType).toBe('slackApi');
			expect(result[0].credentialDisplayName).toBe('Display: slackApi');
			expect(result[0].nodes.map((n) => n.name)).toEqual(['NodeA', 'NodeB']);
		});

		it('should pick selectedCredentialId from the first node that has it', () => {
			const nodeA = createNode({ name: 'NodeA' });
			const nodeB = createNode({
				name: 'NodeB',
				credentials: { slackApi: { id: 'cred-2', name: 'Slack' } },
			});

			const result = groupCredentialsByType(
				[
					{ node: nodeA, credentialTypes: ['slackApi'] },
					{ node: nodeB, credentialTypes: ['slackApi'] },
				],
				displayNameLookup,
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
					{ node: nodeA, credentialTypes: ['slackApi'] },
					{ node: nodeB, credentialTypes: ['slackApi'] },
				],
				displayNameLookup,
			);

			expect(result[0].issues).toEqual(['Token expired', 'Rate limited']);
		});

		it('should collect all nodes in the group', () => {
			const nodes = ['A', 'B', 'C'].map((name) =>
				createNode({ name, credentials: { api: { id: `cred-${name}`, name } } }),
			);

			const result = groupCredentialsByType(
				nodes.map((node) => ({ node, credentialTypes: ['api'] })),
				displayNameLookup,
			);

			expect(result[0].nodes.map((n) => n.name)).toEqual(['A', 'B', 'C']);
		});

		it('should set isComplete to true when selectedCredentialId exists and no issues', () => {
			const node = createNode({
				name: 'NodeA',
				credentials: { slackApi: { id: 'cred-1', name: 'Slack' } },
			});

			const result = groupCredentialsByType(
				[{ node, credentialTypes: ['slackApi'] }],
				displayNameLookup,
			);

			expect(result[0].isComplete).toBe(true);
		});

		it('should set isComplete to false when selectedCredentialId is missing', () => {
			const node = createNode({ name: 'NodeA' });

			const result = groupCredentialsByType(
				[{ node, credentialTypes: ['slackApi'] }],
				displayNameLookup,
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
				[{ node, credentialTypes: ['slackApi'] }],
				displayNameLookup,
			);

			expect(result[0].isComplete).toBe(false);
		});

		it('should return empty array for empty input', () => {
			const result = groupCredentialsByType([], displayNameLookup);

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
				[{ node, credentialTypes: ['slackApi', 'githubApi'] }],
				displayNameLookup,
			);

			expect(result).toHaveLength(2);
			expect(result.map((s) => s.credentialType)).toEqual(['slackApi', 'githubApi']);
		});

		it('should include all nodes in nodes array', () => {
			const node = createNode({
				name: 'NodeA',
				credentials: { slackApi: { id: 'cred-1', name: 'Slack' } },
			});

			const result = groupCredentialsByType(
				[{ node, credentialTypes: ['slackApi'] }],
				displayNameLookup,
			);

			expect(result[0].nodes).toHaveLength(1);
			expect(result[0].nodes[0].name).toBe('NodeA');
		});

		it('should add all nodes to the same credential group', () => {
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
					{ node: regularNode, credentialTypes: ['slackApi'] },
					{ node: triggerNode, credentialTypes: ['slackApi'] },
				],
				displayNameLookup,
			);

			expect(result).toHaveLength(1);
			expect(result[0].nodes.map((n) => n.name)).toEqual(['SlackNode', 'SlackTrigger']);
		});
	});

	describe('isCredentialCardComplete', () => {
		const isTrigger = (type: string) => type.includes('Trigger');

		it('should return true when credential is set, no issues, and no triggers', () => {
			const slackNode = createNode({ name: 'SlackNode', type: 'n8n-nodes-base.slack' });
			const state: CredentialTypeSetupState = {
				credentialType: 'slackApi',
				credentialDisplayName: 'Slack',
				selectedCredentialId: 'cred-1',
				issues: [],
				nodes: [slackNode],
				isComplete: false,
			};

			expect(isCredentialCardComplete(state, () => false, isTrigger)).toBe(true);
		});

		it('should return false when credential is missing', () => {
			const slackNode = createNode({ name: 'SlackNode', type: 'n8n-nodes-base.slack' });
			const state: CredentialTypeSetupState = {
				credentialType: 'slackApi',
				credentialDisplayName: 'Slack',
				selectedCredentialId: undefined,
				issues: [],
				nodes: [slackNode],
				isComplete: false,
			};

			expect(isCredentialCardComplete(state, () => true, isTrigger)).toBe(false);
		});

		it('should return false when there are issues', () => {
			const slackNode = createNode({ name: 'SlackNode', type: 'n8n-nodes-base.slack' });
			const state: CredentialTypeSetupState = {
				credentialType: 'slackApi',
				credentialDisplayName: 'Slack',
				selectedCredentialId: 'cred-1',
				issues: ['Token expired'],
				nodes: [slackNode],
				isComplete: false,
			};

			expect(isCredentialCardComplete(state, () => true, isTrigger)).toBe(false);
		});

		it('should return false when trigger has not executed', () => {
			const triggerNode = createNode({ name: 'SlackTrigger', type: 'n8n-nodes-base.slackTrigger' });
			const state: CredentialTypeSetupState = {
				credentialType: 'slackApi',
				credentialDisplayName: 'Slack',
				selectedCredentialId: 'cred-1',
				issues: [],
				nodes: [triggerNode],
				isComplete: false,
			};

			expect(isCredentialCardComplete(state, () => false, isTrigger)).toBe(false);
		});

		it('should return true when credential is set and all triggers have executed', () => {
			const triggerNode = createNode({ name: 'SlackTrigger', type: 'n8n-nodes-base.slackTrigger' });
			const state: CredentialTypeSetupState = {
				credentialType: 'slackApi',
				credentialDisplayName: 'Slack',
				selectedCredentialId: 'cred-1',
				issues: [],
				nodes: [triggerNode],
				isComplete: false,
			};

			expect(isCredentialCardComplete(state, () => true, isTrigger)).toBe(true);
		});

		it('should return true when single embedded trigger has executed', () => {
			const trigger = createNode({ name: 'Trigger1', type: 'n8n-nodes-base.slackTrigger' });
			const state: CredentialTypeSetupState = {
				credentialType: 'slackApi',
				credentialDisplayName: 'Slack',
				selectedCredentialId: 'cred-1',
				issues: [],
				nodes: [trigger],
				isComplete: false,
			};

			expect(isCredentialCardComplete(state, () => true, isTrigger)).toBe(true);
		});

		it('should return false when credential test has not passed', () => {
			const slackNode = createNode({ name: 'SlackNode', type: 'n8n-nodes-base.slack' });
			const state: CredentialTypeSetupState = {
				credentialType: 'slackApi',
				credentialDisplayName: 'Slack',
				selectedCredentialId: 'cred-1',
				issues: [],
				nodes: [slackNode],
				isComplete: false,
			};

			expect(
				isCredentialCardComplete(
					state,
					() => false,
					isTrigger,
					() => false,
				),
			).toBe(false);
		});

		it('should return true when credential test has passed', () => {
			const slackNode = createNode({ name: 'SlackNode', type: 'n8n-nodes-base.slack' });
			const state: CredentialTypeSetupState = {
				credentialType: 'slackApi',
				credentialDisplayName: 'Slack',
				selectedCredentialId: 'cred-1',
				issues: [],
				nodes: [slackNode],
				isComplete: false,
			};

			expect(
				isCredentialCardComplete(
					state,
					() => false,
					isTrigger,
					() => true,
				),
			).toBe(true);
		});

		it('should be backward-compatible when isCredentialTestedOk is not provided', () => {
			const slackNode = createNode({ name: 'SlackNode', type: 'n8n-nodes-base.slack' });
			const state: CredentialTypeSetupState = {
				credentialType: 'slackApi',
				credentialDisplayName: 'Slack',
				selectedCredentialId: 'cred-1',
				issues: [],
				nodes: [slackNode],
				isComplete: false,
			};

			expect(isCredentialCardComplete(state, () => false, isTrigger)).toBe(true);
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
					nodes: [node],
					isComplete: true,
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
					nodes: [node],
					isComplete: false,
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
					nodes: [node],
					isComplete: true,
				},
				{
					credentialType: 'githubApi',
					credentialDisplayName: 'GitHub',
					selectedCredentialId: 'cred-2',
					issues: [],
					nodes: [node],
					isComplete: true,
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
});
