import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	NodeConnectionTypes,
	NodeHelpers,
	type INodeInputConfiguration,
	type Workflow,
} from 'n8n-workflow';
import { AGENT_NODE_TYPE, AGENT_TOOL_NODE_TYPE } from '@/app/constants';
import type { INodeUi, INodeCreateElement } from '@/Interface';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { mockNode, mockNodeTypeDescription } from '@/__tests__/mocks';
import { useGetNodeCreatorFilter } from './useGetNodeCreatorFilter';

describe('useGetNodeCreatorFilter', () => {
	let mockUseNodeTypesStore: MockedStore<typeof useNodeTypesStore>;
	let mockUseWorkflowsStore: MockedStore<typeof useWorkflowsStore>;
	let getNodeCreatorFilter: ReturnType<typeof useGetNodeCreatorFilter>['getNodeCreatorFilter'];
	let mockWorkflow: Workflow;
	beforeEach(() => {
		vi.clearAllMocks();
		setActivePinia(createTestingPinia({ stubActions: false }));

		mockUseNodeTypesStore = mockedStore(useNodeTypesStore);
		mockUseWorkflowsStore = mockedStore(useWorkflowsStore);

		const getNodeMock = vi.fn();
		mockWorkflow = {
			getNode: getNodeMock,
		} as unknown as Workflow;

		mockUseWorkflowsStore.workflowObject = mockWorkflow;

		vi.spyOn(NodeHelpers, 'getNodeInputs').mockReturnValue([]);

		const { getNodeCreatorFilter: getFilter } = useGetNodeCreatorFilter();
		getNodeCreatorFilter = getFilter;
	});

	describe('when workflow node does not exist', () => {
		it('should return { nodes: [] }', () => {
			vi.mocked(mockWorkflow.getNode).mockReturnValue(null);

			const result = getNodeCreatorFilter(
				'non-existent-node',
				NodeConnectionTypes.Main,
				mockNode({ name: 'source', type: 'test' }),
			);

			expect(result).toEqual({ nodes: [] });
		});
	});

	describe('when node type does not exist', () => {
		it('should return undefined filter', () => {
			const workflowNode = { type: 'test-node', typeVersion: 1 } as INodeUi;
			vi.mocked(mockWorkflow.getNode).mockReturnValue(workflowNode);
			mockUseNodeTypesStore.getNodeType = vi.fn().mockReturnValue(null);
			mockUseNodeTypesStore.communityNodeType = vi.fn().mockReturnValue(undefined);
			vi.spyOn(NodeHelpers, 'getNodeInputs').mockReturnValue([]);

			const result = getNodeCreatorFilter(
				'test-node',
				NodeConnectionTypes.Main,
				mockNode({ name: 'source', type: 'test' }),
			);

			expect(result).toBeUndefined();
			expect(mockUseNodeTypesStore.getNodeType).toHaveBeenCalledWith('test-node', 1);
			expect(mockUseNodeTypesStore.communityNodeType).toHaveBeenCalledWith('test-node');
		});
	});

	describe('when no matching input configuration found', () => {
		it('should return undefined filter when inputs are strings', () => {
			const workflowNode = { type: 'test-node', typeVersion: 1 } as INodeUi;
			const nodeType = mockNodeTypeDescription({
				name: 'test-node',
				inputs: [NodeConnectionTypes.Main],
			});

			vi.mocked(mockWorkflow.getNode).mockReturnValue(workflowNode);
			mockUseNodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeType);
			vi.spyOn(NodeHelpers, 'getNodeInputs').mockReturnValue([NodeConnectionTypes.Main]);

			const result = getNodeCreatorFilter(
				'test-node',
				NodeConnectionTypes.Main,
				mockNode({ name: 'source', type: 'test' }),
			);

			expect(result).toBeUndefined();
		});

		it('should return undefined filter when input type does not match', () => {
			const workflowNode = { type: 'test-node', typeVersion: 1 } as INodeUi;
			const nodeType = mockNodeTypeDescription({
				name: 'test-node',
				inputs: [],
			});
			const inputConfig: INodeInputConfiguration = {
				type: NodeConnectionTypes.AiTool,
				filter: { nodes: ['tool1'] },
			};

			vi.mocked(mockWorkflow.getNode).mockReturnValue(workflowNode);
			mockUseNodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeType);
			vi.spyOn(NodeHelpers, 'getNodeInputs').mockReturnValue([inputConfig]);

			const result = getNodeCreatorFilter(
				'test-node',
				NodeConnectionTypes.Main,
				mockNode({ name: 'source', type: 'test' }),
			);

			expect(result).toBeUndefined();
		});

		it('should return undefined filter when input has no filter property', () => {
			const workflowNode = { type: 'test-node', typeVersion: 1 } as INodeUi;
			const nodeType = mockNodeTypeDescription({
				name: 'test-node',
				inputs: [],
			});
			const inputConfig: INodeInputConfiguration = {
				type: NodeConnectionTypes.Main,
			};

			vi.mocked(mockWorkflow.getNode).mockReturnValue(workflowNode);
			mockUseNodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeType);
			vi.spyOn(NodeHelpers, 'getNodeInputs').mockReturnValue([inputConfig]);

			const result = getNodeCreatorFilter(
				'test-node',
				NodeConnectionTypes.Main,
				mockNode({ name: 'source', type: 'test' }),
			);

			expect(result).toBeUndefined();
		});
	});

	describe('when matching input configuration found', () => {
		it('should return filter from input configuration', () => {
			const workflowNode = { type: 'test-node', typeVersion: 1 } as INodeUi;
			const nodeType = mockNodeTypeDescription({
				name: 'test-node',
				inputs: [],
			});
			const filter = { nodes: ['node1', 'node2'] };
			const inputConfig: INodeInputConfiguration = {
				type: NodeConnectionTypes.Main,
				filter,
			};

			vi.mocked(mockWorkflow.getNode).mockReturnValue(workflowNode);
			mockUseNodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeType);
			vi.spyOn(NodeHelpers, 'getNodeInputs').mockReturnValue([inputConfig]);

			const result = getNodeCreatorFilter(
				'test-node',
				NodeConnectionTypes.Main,
				mockNode({ name: 'source', type: 'test' }),
			);

			expect(result).toEqual(filter);
		});

		it('should return first matching filter when multiple inputs match', () => {
			const workflowNode = { type: 'test-node', typeVersion: 1 } as INodeUi;
			const nodeType = mockNodeTypeDescription({
				name: 'test-node',
				inputs: [],
			});
			const filter1 = { nodes: ['node1'] };
			const filter2 = { nodes: ['node2'] };
			const inputConfig1: INodeInputConfiguration = {
				type: NodeConnectionTypes.Main,
				filter: filter1,
			};
			const inputConfig2: INodeInputConfiguration = {
				type: NodeConnectionTypes.Main,
				filter: filter2,
			};

			vi.mocked(mockWorkflow.getNode).mockReturnValue(workflowNode);
			mockUseNodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeType);
			vi.spyOn(NodeHelpers, 'getNodeInputs').mockReturnValue([inputConfig1, inputConfig2]);

			const result = getNodeCreatorFilter(
				'test-node',
				NodeConnectionTypes.Main,
				mockNode({ name: 'source', type: 'test' }),
			);

			expect(result).toEqual(filter1);
		});
	});

	describe('when outputType is AiTool', () => {
		it.each([AGENT_NODE_TYPE, AGENT_TOOL_NODE_TYPE])(
			'should add HITL tool conditions when sourceNode is %s node',
			(sourceNodeType) => {
				const workflowNode = { type: 'test-node', typeVersion: 1 } as INodeUi;
				const nodeType = mockNodeTypeDescription({
					name: 'test-node',
					inputs: [],
				});
				const filter = { nodes: ['node1'] };
				const inputConfig: INodeInputConfiguration = {
					type: NodeConnectionTypes.AiTool,
					filter,
				};
				const sourceNode = mockNode({ name: 'agent', type: sourceNodeType });

				vi.mocked(mockWorkflow.getNode).mockReturnValue(workflowNode);
				mockUseNodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeType);
				vi.spyOn(NodeHelpers, 'getNodeInputs').mockReturnValue([inputConfig]);

				const result = getNodeCreatorFilter('test-node', NodeConnectionTypes.AiTool, sourceNode);

				expect(result).toEqual({
					...filter,
					conditions: expect.any(Array),
				});
				expect(result?.conditions).toHaveLength(1);

				// Test that the condition allows HITL tools for agent nodes
				const condition = result?.conditions?.[0];
				expect(condition).toBeDefined();
				if (condition) {
					const hitlNode: INodeCreateElement = { key: 'CustomHitlTool' } as INodeCreateElement;
					const regularNode: INodeCreateElement = { key: 'RegularTool' } as INodeCreateElement;
					expect(condition(hitlNode)).toBe(true);
					expect(condition(regularNode)).toBe(true);
				}
			},
		);

		it('should add HITL tool conditions when sourceNode is not agent node', () => {
			const workflowNode = { type: 'test-node', typeVersion: 1 } as INodeUi;
			const nodeType = mockNodeTypeDescription({
				name: 'test-node',
				inputs: [],
			});
			const filter = { nodes: ['node1'] };
			const inputConfig: INodeInputConfiguration = {
				type: NodeConnectionTypes.AiTool,
				filter,
			};
			const sourceNode = mockNode({ name: 'regular-node', type: 'n8n-nodes-base.set' });

			vi.mocked(mockWorkflow.getNode).mockReturnValue(workflowNode);
			mockUseNodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeType);
			vi.spyOn(NodeHelpers, 'getNodeInputs').mockReturnValue([inputConfig]);

			const result = getNodeCreatorFilter('test-node', NodeConnectionTypes.AiTool, sourceNode);

			expect(result).toEqual({
				...filter,
				conditions: expect.any(Array),
			});
			expect(result?.conditions).toHaveLength(1);

			// Test that the condition filters out HITL tools for non-agent nodes
			const condition = result?.conditions?.[0];
			expect(condition).toBeDefined();
			if (condition) {
				const hitlNode: INodeCreateElement = { key: 'CustomHitlTool' } as INodeCreateElement;
				const regularNode: INodeCreateElement = { key: 'RegularTool' } as INodeCreateElement;
				expect(condition(hitlNode)).toBe(false);
				expect(condition(regularNode)).toBe(true);
			}
		});

		it('should replace existing conditions with HITL conditions', () => {
			const workflowNode = { type: 'test-node', typeVersion: 1 } as INodeUi;
			const nodeType = mockNodeTypeDescription({
				name: 'test-node',
				inputs: [],
			});
			const existingFilter = {
				nodes: ['node1'],
				conditions: [(node: INodeCreateElement) => node.key !== 'excluded-node'],
			};
			const inputConfig: INodeInputConfiguration = {
				type: NodeConnectionTypes.AiTool,
				filter: existingFilter,
			};
			const sourceNode = mockNode({ name: 'regular-node', type: 'n8n-nodes-base.set' });

			vi.mocked(mockWorkflow.getNode).mockReturnValue(workflowNode);
			mockUseNodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeType);
			vi.spyOn(NodeHelpers, 'getNodeInputs').mockReturnValue([inputConfig]);

			const result = getNodeCreatorFilter('test-node', NodeConnectionTypes.AiTool, sourceNode);

			expect(result).toEqual({
				...existingFilter,
				conditions: expect.any(Array),
			});
			// Conditions are replaced, not merged (based on implementation: filter = { ...filter, conditions })
			expect(result?.conditions).toHaveLength(1);
		});

		it('should add HITL conditions even when no filter exists', () => {
			const workflowNode = { type: 'test-node', typeVersion: 1 } as INodeUi;
			const nodeType = mockNodeTypeDescription({
				name: 'test-node',
				inputs: [],
			});
			const inputConfig: INodeInputConfiguration = {
				type: NodeConnectionTypes.AiTool,
			};
			const sourceNode = mockNode({ name: 'regular-node', type: 'n8n-nodes-base.set' });

			vi.mocked(mockWorkflow.getNode).mockReturnValue(workflowNode);
			mockUseNodeTypesStore.getNodeType = vi.fn().mockReturnValue(nodeType);
			vi.spyOn(NodeHelpers, 'getNodeInputs').mockReturnValue([inputConfig]);

			const result = getNodeCreatorFilter('test-node', NodeConnectionTypes.AiTool, sourceNode);

			expect(result).toEqual({
				conditions: expect.any(Array),
			});
			expect(result?.conditions).toHaveLength(1);
		});
	});

	describe('when using community node type', () => {
		it('should use community node type when regular node type is not found', () => {
			const workflowNode = { type: 'community-node', typeVersion: 1 } as INodeUi;
			const nodeDescription = mockNodeTypeDescription({
				name: 'community-node',
				inputs: [],
			});
			const communityNodeType = {
				nodeDescription,
			};
			const filter = { nodes: ['node1'] };
			const inputConfig: INodeInputConfiguration = {
				type: NodeConnectionTypes.Main,
				filter,
			};

			vi.mocked(mockWorkflow.getNode).mockReturnValue(workflowNode);
			mockUseNodeTypesStore.getNodeType = vi.fn().mockReturnValue(null);
			mockUseNodeTypesStore.communityNodeType = vi.fn().mockReturnValue(communityNodeType);
			vi.spyOn(NodeHelpers, 'getNodeInputs').mockReturnValue([inputConfig]);

			const result = getNodeCreatorFilter(
				'community-node',
				NodeConnectionTypes.Main,
				mockNode({ name: 'source', type: 'test' }),
			);

			expect(result).toEqual(filter);
			expect(mockUseNodeTypesStore.getNodeType).toHaveBeenCalledWith('community-node', 1);
			expect(mockUseNodeTypesStore.communityNodeType).toHaveBeenCalledWith('community-node');
		});
	});
});
