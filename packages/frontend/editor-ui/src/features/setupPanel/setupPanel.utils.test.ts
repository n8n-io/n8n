import { createTestNode } from '@/__tests__/mocks';
import type { INodeUi } from '@/Interface';

import {
	getNodeCredentialTypes,
	buildCredentialRequirement,
	isNodeSetupComplete,
	buildNodeSetupState,
} from './setupPanel.utils';
import type { NodeCredentialRequirement } from './setupPanel.types';

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

		it('should return false when credential test has not passed', () => {
			const requirements: NodeCredentialRequirement[] = [
				{
					credentialType: 'testApi',
					credentialDisplayName: 'Test',
					selectedCredentialId: 'cred-1',
					issues: [],
					nodesWithSameCredential: [],
				},
			];
			const isTestedOk = () => false;

			expect(isNodeSetupComplete(requirements, isTestedOk)).toBe(false);
		});

		it('should return true when isCredentialTestedOk returns true', () => {
			const requirements: NodeCredentialRequirement[] = [
				{
					credentialType: 'testApi',
					credentialDisplayName: 'Test',
					selectedCredentialId: 'cred-1',
					issues: [],
					nodesWithSameCredential: [],
				},
			];
			const isTestedOk = () => true;

			expect(isNodeSetupComplete(requirements, isTestedOk)).toBe(true);
		});

		it('should be backward-compatible when isCredentialTestedOk is not provided', () => {
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

	describe('buildNodeSetupState', () => {
		const displayNameLookup = (type: string) => `Display: ${type}`;

		it('should build complete state for a fully configured node', () => {
			const node = createNode({
				credentials: {
					testApi: { id: 'cred-1', name: 'Test' },
				},
			});
			const nodeNames = new Map([['testApi', ['TestNode']]]);

			const result = buildNodeSetupState(node, ['testApi'], displayNameLookup, nodeNames);

			expect(result.node).toBe(node);
			expect(result.credentialRequirements).toHaveLength(1);
			expect(result.isComplete).toBe(true);
		});

		it('should build incomplete state for a node missing credentials', () => {
			const node = createNode();
			const nodeNames = new Map<string, string[]>();

			const result = buildNodeSetupState(node, ['testApi'], displayNameLookup, nodeNames);

			expect(result.isComplete).toBe(false);
			expect(result.credentialRequirements[0].selectedCredentialId).toBeUndefined();
		});

		it('should build state with multiple credential requirements', () => {
			const node = createNode({
				credentials: {
					apiA: { id: 'cred-1', name: 'A' },
				},
			});
			const nodeNames = new Map<string, string[]>();

			const result = buildNodeSetupState(node, ['apiA', 'apiB'], displayNameLookup, nodeNames);

			expect(result.credentialRequirements).toHaveLength(2);
			expect(result.isComplete).toBe(false);
		});

		it('should mark node incomplete when credential test has not passed', () => {
			const node = createNode({
				credentials: {
					testApi: { id: 'cred-1', name: 'Test' },
				},
			});
			const nodeNames = new Map([['testApi', ['TestNode']]]);
			const isTestedOk = () => false;

			const result = buildNodeSetupState(
				node,
				['testApi'],
				displayNameLookup,
				nodeNames,
				false,
				false,
				isTestedOk,
			);

			expect(result.isComplete).toBe(false);
		});
	});
});
