import { createTestNode, createTestNodeProperties } from '@/__tests__/mocks';
import type { INodeUi } from '@/Interface';
import type { INodeTypeDescription } from 'n8n-workflow';

import {
	getNodeCredentialTypes,
	getNodeParametersIssues,
	groupCredentialsByType,
	isCredentialCardComplete,
	buildTriggerSetupState,
	type CompletionContext,
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

		it('should include credential types from node issues when displayable', () => {
			const node = createNode({
				issues: {
					credentials: {
						httpHeaderAuth: ['Credentials not set'],
					},
				},
			});
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'httpHeaderAuth' }]);

			const result = getNodeCredentialTypes(mockNodeTypeProvider, node);

			expect(result).toContain('httpHeaderAuth');
		});

		it('should include credential types from node issues even when not in displayable list', () => {
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

		it('should include credential types from assigned credentials when displayable', () => {
			const node = createNode({
				credentials: {
					slackApi: { id: 'cred-1', name: 'My Slack' },
				},
			});
			mockGetNodeTypeDisplayableCredentials.mockReturnValue([{ name: 'slackApi' }]);

			const result = getNodeCredentialTypes(mockNodeTypeProvider, node);

			expect(result).toContain('slackApi');
		});

		it('should include credential types from assigned credentials even when not in displayable list', () => {
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

		it('should group HTTP Request nodes with the same credential type and URL', () => {
			const httpNode1 = createNode({
				name: 'Google',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { url: 'https://www.google.com' },
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Auth' } },
			});
			const httpNode2 = createNode({
				name: 'Google 2',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { url: 'https://www.google.com' },
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Auth' } },
			});

			const result = groupCredentialsByType(
				[
					{ node: httpNode1, credentialTypes: ['httpHeaderAuth'] },
					{ node: httpNode2, credentialTypes: ['httpHeaderAuth'] },
				],
				displayNameLookup,
			);

			expect(result).toHaveLength(1);
			expect(result[0].credentialType).toBe('httpHeaderAuth');
			expect(result[0].nodes.map((n) => n.name)).toEqual(['Google', 'Google 2']);
		});

		it('should create separate cards for HTTP Request nodes with different URLs', () => {
			const httpNode1 = createNode({
				name: 'Google',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { url: 'https://www.google.com' },
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Auth' } },
			});
			const httpNode2 = createNode({
				name: 'Example',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { url: 'https://www.example.com' },
				credentials: { httpHeaderAuth: { id: 'cred-2', name: 'Auth 2' } },
			});

			const result = groupCredentialsByType(
				[
					{ node: httpNode1, credentialTypes: ['httpHeaderAuth'] },
					{ node: httpNode2, credentialTypes: ['httpHeaderAuth'] },
				],
				displayNameLookup,
			);

			expect(result).toHaveLength(2);
			expect(result[0].nodes[0].name).toBe('Google');
			expect(result[1].nodes[0].name).toBe('Example');
		});

		it('should still group non-HTTP-Request nodes normally alongside HTTP Request cards', () => {
			const slackNode1 = createNode({
				name: 'Slack1',
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Auth' } },
			});
			const slackNode2 = createNode({
				name: 'Slack2',
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Auth' } },
			});
			const httpNode = createNode({
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { url: 'https://api.example.com' },
				credentials: { httpHeaderAuth: { id: 'cred-2', name: 'Auth 2' } },
			});

			const result = groupCredentialsByType(
				[
					{ node: slackNode1, credentialTypes: ['httpHeaderAuth'] },
					{ node: slackNode2, credentialTypes: ['httpHeaderAuth'] },
					{ node: httpNode, credentialTypes: ['httpHeaderAuth'] },
				],
				displayNameLookup,
			);

			expect(result).toHaveLength(2);
			// First entry: grouped non-HTTP nodes
			expect(result[0].nodes.map((n) => n.name)).toEqual(['Slack1', 'Slack2']);
			// Second entry: HTTP Request card
			expect(result[1].nodes.map((n) => n.name)).toEqual(['HTTP Request']);
		});

		it('should apply URL-based grouping to HTTP Request Tool nodes', () => {
			const toolNode1 = createNode({
				name: 'Tool 1',
				type: 'n8n-nodes-base.httpRequestTool',
				parameters: { url: 'https://api.example.com/batch' },
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Auth' } },
			});
			const toolNode2 = createNode({
				name: 'Tool 2',
				type: 'n8n-nodes-base.httpRequestTool',
				parameters: { url: 'https://api.example.com/batch' },
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Auth' } },
			});
			const toolNode3 = createNode({
				name: 'Tool 3',
				type: 'n8n-nodes-base.httpRequestTool',
				parameters: { url: 'https://api.example.com/db' },
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Auth' } },
			});

			const result = groupCredentialsByType(
				[
					{ node: toolNode1, credentialTypes: ['httpHeaderAuth'] },
					{ node: toolNode2, credentialTypes: ['httpHeaderAuth'] },
					{ node: toolNode3, credentialTypes: ['httpHeaderAuth'] },
				],
				displayNameLookup,
			);

			expect(result).toHaveLength(2);
			expect(result[0].nodes.map((n) => n.name)).toEqual(['Tool 1', 'Tool 2']);
			expect(result[1].nodes.map((n) => n.name)).toEqual(['Tool 3']);
		});

		it('should create separate cards for HTTP Request nodes with unresolvable expression URLs', () => {
			const httpNode1 = createNode({
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { url: '={{ $json.url }}' },
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Auth' } },
			});
			const httpNode2 = createNode({
				name: 'HTTP Request1',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { url: '={{ $json.url }}' },
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Auth' } },
			});

			const result = groupCredentialsByType(
				[
					{ node: httpNode1, credentialTypes: ['httpHeaderAuth'] },
					{ node: httpNode2, credentialTypes: ['httpHeaderAuth'] },
				],
				displayNameLookup,
			);

			// Same expression but can't be resolved — each gets its own card
			expect(result).toHaveLength(2);
			expect(result[0].nodes[0].name).toBe('HTTP Request');
			expect(result[1].nodes[0].name).toBe('HTTP Request1');
		});

		it('should group HTTP Request nodes when expression URLs resolve to the same value', () => {
			const httpNode1 = createNode({
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { url: '={{ "https://api.example.com" }}' },
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Auth' } },
			});
			const httpNode2 = createNode({
				name: 'HTTP Request1',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { url: '={{ "https://api.example.com" }}' },
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Auth' } },
			});

			const resolveExpressionUrl = vi.fn().mockReturnValue('https://api.example.com');

			const result = groupCredentialsByType(
				[
					{ node: httpNode1, credentialTypes: ['httpHeaderAuth'] },
					{ node: httpNode2, credentialTypes: ['httpHeaderAuth'] },
				],
				displayNameLookup,
				resolveExpressionUrl,
			);

			expect(result).toHaveLength(1);
			expect(result[0].nodes.map((n) => n.name)).toEqual(['HTTP Request', 'HTTP Request1']);
		});

		it('should create separate cards when expression URLs resolve to different values', () => {
			const httpNode1 = createNode({
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { url: '={{ "https://api.google.com" }}' },
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Auth' } },
			});
			const httpNode2 = createNode({
				name: 'HTTP Request1',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { url: '={{ "https://api.example.com" }}' },
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Auth' } },
			});

			const resolveExpressionUrl = vi.fn().mockImplementation((url: string) => {
				if (url.includes('google')) return 'https://api.google.com';
				return 'https://api.example.com';
			});

			const result = groupCredentialsByType(
				[
					{ node: httpNode1, credentialTypes: ['httpHeaderAuth'] },
					{ node: httpNode2, credentialTypes: ['httpHeaderAuth'] },
				],
				displayNameLookup,
				resolveExpressionUrl,
			);

			expect(result).toHaveLength(2);
			expect(result[0].nodes[0].name).toBe('HTTP Request');
			expect(result[1].nodes[0].name).toBe('HTTP Request1');
		});

		it('should group resolved expression URL with matching static URL', () => {
			const httpNode1 = createNode({
				name: 'HTTP Static',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { url: 'https://api.example.com' },
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Auth' } },
			});
			const httpNode2 = createNode({
				name: 'HTTP Expression',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { url: '={{ "https://api.example.com" }}' },
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Auth' } },
			});

			const resolveExpressionUrl = vi.fn().mockReturnValue('https://api.example.com');

			const result = groupCredentialsByType(
				[
					{ node: httpNode1, credentialTypes: ['httpHeaderAuth'] },
					{ node: httpNode2, credentialTypes: ['httpHeaderAuth'] },
				],
				displayNameLookup,
				resolveExpressionUrl,
			);

			expect(result).toHaveLength(1);
			expect(result[0].nodes.map((n) => n.name)).toEqual(['HTTP Static', 'HTTP Expression']);
		});

		it('should fall back to separate cards when resolveExpressionUrl returns null', () => {
			const httpNode1 = createNode({
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { url: '={{ $json.url }}' },
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Auth' } },
			});
			const httpNode2 = createNode({
				name: 'HTTP Request1',
				type: 'n8n-nodes-base.httpRequest',
				parameters: { url: '={{ $json.url }}' },
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Auth' } },
			});

			const resolveExpressionUrl = vi.fn().mockReturnValue(null);

			const result = groupCredentialsByType(
				[
					{ node: httpNode1, credentialTypes: ['httpHeaderAuth'] },
					{ node: httpNode2, credentialTypes: ['httpHeaderAuth'] },
				],
				displayNameLookup,
				resolveExpressionUrl,
			);

			expect(result).toHaveLength(2);
			expect(result[0].nodes[0].name).toBe('HTTP Request');
			expect(result[1].nodes[0].name).toBe('HTTP Request1');
		});
	});

	describe('isCredentialCardComplete', () => {
		const isTriggerNode = (type: string) => type.includes('Trigger');
		const noUnfilledParams = () => false;

		function makeCtx(
			overrides: {
				hasTriggerExecuted?: (name: string) => boolean;
				isCredentialTestedOk?: (id: string) => boolean;
				firstTriggerName?: string | null;
			} = {},
		): CompletionContext {
			return {
				firstTriggerName: overrides.firstTriggerName ?? null,
				hasTriggerExecuted: overrides.hasTriggerExecuted ?? (() => false),
				isTriggerNode,
				isCredentialTestedOk: overrides.isCredentialTestedOk,
				hasUnfilledTemplateParams: noUnfilledParams,
			};
		}

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

			expect(isCredentialCardComplete(state, makeCtx())).toBe(true);
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

			expect(isCredentialCardComplete(state, makeCtx())).toBe(false);
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

			expect(isCredentialCardComplete(state, makeCtx())).toBe(false);
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

			expect(
				isCredentialCardComplete(
					state,
					makeCtx({
						hasTriggerExecuted: () => false,
						firstTriggerName: 'SlackTrigger',
					}),
				),
			).toBe(false);
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

			expect(
				isCredentialCardComplete(
					state,
					makeCtx({
						hasTriggerExecuted: () => true,
						firstTriggerName: 'SlackTrigger',
					}),
				),
			).toBe(true);
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

			expect(
				isCredentialCardComplete(
					state,
					makeCtx({
						hasTriggerExecuted: () => true,
						firstTriggerName: 'Trigger1',
					}),
				),
			).toBe(true);
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
					makeCtx({
						isCredentialTestedOk: () => false,
					}),
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
					makeCtx({
						isCredentialTestedOk: () => true,
					}),
				),
			).toBe(true);
		});

		it('should complete when isCredentialTestedOk is not provided (non-testable type)', () => {
			const slackNode = createNode({ name: 'SlackNode', type: 'n8n-nodes-base.slack' });
			const state: CredentialTypeSetupState = {
				credentialType: 'slackApi',
				credentialDisplayName: 'Slack',
				selectedCredentialId: 'cred-1',
				issues: [],
				nodes: [slackNode],
				isComplete: false,
			};

			expect(isCredentialCardComplete(state, makeCtx())).toBe(true);
		});
	});

	describe('getNodeParametersIssues', () => {
		it('should detect issues for the active variant when a parameter name has multiple displayOptions', () => {
			// Simulates node types like Google Drive Trigger that define multiple
			// properties with the same name (e.g. "event") for different triggerOn values.
			const nodeType = {
				properties: [
					createTestNodeProperties({
						displayName: 'Trigger On',
						name: 'triggerOn',
						type: 'options',
						required: true,
						default: '',
						options: [
							{ name: 'Specific File', value: 'specificFile' },
							{ name: 'Specific Folder', value: 'specificFolder' },
							{ name: 'Any File/Folder', value: 'anyFileFolder' },
						],
					}),
					createTestNodeProperties({
						displayName: 'Watch For',
						name: 'event',
						type: 'options',
						required: true,
						default: 'fileUpdated',
						displayOptions: { show: { triggerOn: ['specificFile'] } },
					}),
					createTestNodeProperties({
						displayName: 'Watch For',
						name: 'event',
						type: 'options',
						required: true,
						default: '',
						displayOptions: { show: { triggerOn: ['specificFolder'] } },
					}),
					createTestNodeProperties({
						displayName: 'Watch For',
						name: 'event',
						type: 'options',
						required: true,
						default: 'fileCreated',
						displayOptions: { show: { triggerOn: ['anyFileFolder'] } },
					}),
				],
			} as unknown as INodeTypeDescription;

			mockNodeTypeProvider.getNodeType.mockReturnValue(nodeType);

			const node = createTestNode({
				type: 'n8n-nodes-base.googleDriveTrigger',
				parameters: {
					triggerOn: 'specificFolder',
					event: '',
				},
			});

			const issues = getNodeParametersIssues(mockNodeTypeProvider, node);

			expect(issues).toHaveProperty('event');
		});

		it('should not include issues for parameter variants that are not displayed', () => {
			const nodeType = {
				properties: [
					createTestNodeProperties({
						displayName: 'Trigger On',
						name: 'triggerOn',
						type: 'options',
						required: true,
						default: 'specificFolder',
					}),
					createTestNodeProperties({
						displayName: 'Watch For',
						name: 'event',
						type: 'options',
						required: true,
						default: '',
						displayOptions: { show: { triggerOn: ['specificFile'] } },
					}),
				],
			} as unknown as INodeTypeDescription;

			mockNodeTypeProvider.getNodeType.mockReturnValue(nodeType);

			const node = createTestNode({
				type: 'n8n-nodes-base.testTrigger',
				parameters: {
					triggerOn: 'specificFolder',
					event: '',
				},
			});

			const issues = getNodeParametersIssues(mockNodeTypeProvider, node);

			expect(issues).not.toHaveProperty('event');
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
