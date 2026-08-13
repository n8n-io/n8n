import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { mock } from 'vitest-mock-extended';
import { STORES } from '@n8n/stores';
import {
	createTestNode,
	createTestNodeProperties,
	createTestWorkflow,
	mockNodeTypeDescription,
} from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { SET_NODE_TYPE } from '@/app/constants';
import type { INodeUi, IWorkflowDb } from '@/Interface';
import { useWorkflowNormalization } from '@/app/composables/useWorkflowNormalization';

describe('useWorkflowNormalization', () => {
	const workflowId = 'test';

	beforeEach(() => {
		setActivePinia(
			createTestingPinia({
				initialState: {
					[STORES.NODE_TYPES]: {},
					[STORES.WORKFLOWS]: {
						workflowId,
						workflow: mock<IWorkflowDb>({
							id: workflowId,
							nodes: [],
							connections: {},
							tags: [],
							usedCredentials: [],
						}),
					},
					[STORES.SETTINGS]: {
						settings: {
							enterprise: {},
						},
					},
				},
			}),
		);
	});

	describe('normalizeWorkflowData', () => {
		it('should drop nodes with a missing type and sanitize their connections', () => {
			const validNode = createTestNode({ name: 'Start' });
			const invalidNode = createTestNode({ name: 'Missing', type: '' });
			const targetNode = createTestNode({ name: 'End' });
			const workflow = createTestWorkflow({
				nodes: [validNode, invalidNode, targetNode],
				connections: {
					Start: {
						main: [
							[
								{ node: 'End', type: 'main', index: 0 },
								{ node: 'Missing', type: 'main', index: 0 },
							],
						],
					},
					Missing: {
						main: [[{ node: 'End', type: 'main', index: 0 }]],
					},
				},
			});

			const { normalizeWorkflowData } = useWorkflowNormalization();
			const { nodes, connections } = normalizeWorkflowData(workflow);

			expect(nodes.map((node) => node.name)).toEqual(['Start', 'End']);
			expect(connections).toEqual({
				Start: {
					main: [[{ node: 'End', type: 'main', index: 0 }]],
				},
			});
		});

		it('should default position to [0, 0] for nodes with missing position', () => {
			const { position: _, ...nodeWithoutPosition } = createTestNode({ name: 'Start' });
			const workflow = createTestWorkflow({
				nodes: [nodeWithoutPosition as INodeUi],
				connections: {},
			});

			const { normalizeWorkflowData } = useWorkflowNormalization();
			const { nodes } = normalizeWorkflowData(workflow);

			expect(nodes).toEqual([expect.objectContaining({ name: 'Start', position: [0, 0] })]);
		});

		it('should resolve node parameters from the node type description for installed nodes', () => {
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const type = SET_NODE_TYPE;
			const version = 1;
			nodeTypesStore.nodeTypes = {
				[type]: {
					[version]: mockNodeTypeDescription({
						name: type,
						version,
						properties: [
							createTestNodeProperties({
								displayName: 'Value',
								name: 'value',
								type: 'boolean',
								default: true,
							}),
						],
					}),
				},
			};

			const workflow = createTestWorkflow({
				nodes: [createTestNode({ type, typeVersion: version })],
				connections: {},
			});

			const { normalizeWorkflowData } = useWorkflowNormalization();
			const { nodes } = normalizeWorkflowData(workflow);

			expect(nodes).toEqual([expect.objectContaining({ parameters: { value: true } })]);
		});

		it('should leave parameters untouched for not-installed node types', () => {
			const workflow = createTestWorkflow({
				nodes: [
					createTestNode({
						type: 'n8n-nodes-community.unknown',
						parameters: { custom: 'value' },
					}),
				],
				connections: {},
			});

			const { normalizeWorkflowData } = useWorkflowNormalization();
			const { nodes } = normalizeWorkflowData(workflow);

			expect(nodes).toEqual([expect.objectContaining({ parameters: { custom: 'value' } })]);
		});

		it('should not mutate the input nodes array', () => {
			const node = createTestNode({ name: 'Start' });
			const workflow = createTestWorkflow({ nodes: [node], connections: {} });
			const inputNodes = workflow.nodes;

			const { normalizeWorkflowData } = useWorkflowNormalization();
			const { nodes } = normalizeWorkflowData(workflow);

			expect(workflow.nodes).toBe(inputNodes);
			expect(nodes).not.toBe(inputNodes);
			expect(nodes[0]).not.toBe(node);
		});
	});

	describe('requireNodeTypeDescription', () => {
		it('should return a fallback description for unknown node types', () => {
			const { requireNodeTypeDescription } = useWorkflowNormalization();

			const result = requireNodeTypeDescription('unknown-type', 2);

			expect(result).toEqual(
				expect.objectContaining({
					displayName: 'unknown-type',
					name: 'unknown-type',
					version: 2,
					properties: [],
				}),
			);
		});

		it('should return the registered description for known node types', () => {
			const nodeTypesStore = mockedStore(useNodeTypesStore);
			const type = SET_NODE_TYPE;
			const version = 1;
			const description = mockNodeTypeDescription({ name: type, version });
			nodeTypesStore.nodeTypes = { [type]: { [version]: description } };

			const { requireNodeTypeDescription } = useWorkflowNormalization();

			expect(requireNodeTypeDescription(type, version)).toBe(description);
		});
	});
});
