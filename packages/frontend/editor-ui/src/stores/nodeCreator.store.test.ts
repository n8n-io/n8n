import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { useViewStacks } from '@/components/Node/NodeCreator/composables/useViewStacks';
import { prepareCommunityNodeDetailsViewStack } from '@/components/Node/NodeCreator/utils';
import { useTelemetry } from '@/composables/useTelemetry';
import {
	AI_UNCATEGORIZED_CATEGORY,
	CUSTOM_API_CALL_KEY,
	REGULAR_NODE_CREATOR_VIEW,
} from '@/constants';
import type { ActionsRecord, INodeCreateElement, INodeUi, SimplifiedNodeType } from '@/Interface';
import { CanvasConnectionMode } from '@/features/canvas/canvas.types';
import { parseCanvasConnectionHandleString } from '@/features/canvas/canvas.utils';
import { getNodeIconSource } from '@/utils/nodeIcon';
import type { CommunityNodeType } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import type { INodeTypeDescription } from 'n8n-workflow';
import { setActivePinia } from 'pinia';
import { NodeConnectionTypes } from 'n8n-workflow';
import { useNDVStore } from './ndv.store';
import { useNodeCreatorStore } from './nodeCreator.store';
import { useNodeTypesStore } from './nodeTypes.store';
import { useWorkflowsStore } from './workflows.store';

const workflow_id = 'workflow-id';
const category_name = 'category-name';
const source = 'source';
const mode = 'mode';
const now = 1717602004819;
const now1 = 1718602004819;
const node_type = 'node-type';
const node_id = 'node-id';
const node_version = 1;
const input_node_type = 'input-node-type';
const actions = ['action1'];

vi.mock('@/composables/useTelemetry', () => {
	const track = vi.fn();
	return {
		useTelemetry: () => {
			return {
				track,
			};
		},
	};
});

vi.mock('@/features/canvas/canvas.utils', () => {
	return {
		parseCanvasConnectionHandleString: vi.fn(),
	};
});

vi.mock('@/components/Node/NodeCreator/utils', async () => {
	return {
		prepareCommunityNodeDetailsViewStack: vi.fn(),
	};
});

vi.mock('@/utils/nodeIcon', () => {
	return {
		getNodeIconSource: vi.fn(),
	};
});

const mockedPrepareCommunityNodeDetailsViewStack = vi.mocked(prepareCommunityNodeDetailsViewStack);
const mockedGetNodeIconSource = vi.mocked(getNodeIconSource);

describe('useNodeCreatorStore', () => {
	let nodeCreatorStore: ReturnType<typeof useNodeCreatorStore>;
	let mockUseNodeTypesStore: MockedStore<typeof useNodeTypesStore>;
	let mockUseWorkflowsStore: MockedStore<typeof useWorkflowsStore>;
	let mockUseNDVStore: MockedStore<typeof useNDVStore>;
	let mockUseViewStacks: MockedStore<typeof useViewStacks>;

	beforeEach(async () => {
		vi.useFakeTimers();
		vi.resetAllMocks();
		setActivePinia(createTestingPinia({ stubActions: false }));
		nodeCreatorStore = useNodeCreatorStore();
		mockUseNodeTypesStore = mockedStore(useNodeTypesStore);
		mockUseWorkflowsStore = mockedStore(useWorkflowsStore);
		mockUseNDVStore = mockedStore(useNDVStore);
		mockUseViewStacks = mockedStore(useViewStacks);

		mockUseWorkflowsStore.getNodeByName = vi.fn((name?: string) => {
			return name ? ({ id: 'Test Node', name, type: name } as INodeUi) : null;
		});
		mockUseWorkflowsStore.getNodeById = vi.fn((id?: string) => {
			return id ? ({ id, name: 'Test Node', type: 'test-type' } as INodeUi) : undefined;
		});
		mockUseWorkflowsStore.workflowId = 'dummy-workflow-id';
		mockUseWorkflowsStore.workflowObject = {
			...mockUseWorkflowsStore.workflowObject,
			getNode: vi.fn(
				() =>
					({
						type: 'n8n-node.example',
						typeVersion: 1,
					}) as INodeUi,
			),
		};

		mockedPrepareCommunityNodeDetailsViewStack.mockReturnValue({
			title: 'Test Node',
			subcategory: '*',
			mode: 'community-node',
		});

		mockedGetNodeIconSource.mockReturnValue({
			type: 'icon',
			name: 'test-icon',
		});

		mockUseViewStacks.pushViewStack = vi.fn();

		vi.setSystemTime(now);
	});

	it('tracks when node creator is opened', () => {
		nodeCreatorStore.onCreatorOpened({
			source,
			mode,
			workflow_id,
		});

		expect(useTelemetry().track).toHaveBeenCalledWith('User opened nodes panel', {
			mode,
			source,
			nodes_panel_session_id: getSessionId(now),
			workflow_id,
		});
	});

	it('resets session id every time node creator is opened', () => {
		nodeCreatorStore.onCreatorOpened({
			source,
			mode,
			workflow_id,
		});

		expect(useTelemetry().track).toHaveBeenCalledWith('User opened nodes panel', {
			mode,
			source,
			nodes_panel_session_id: getSessionId(now),
			workflow_id,
		});

		vi.setSystemTime(now1);

		nodeCreatorStore.onCreatorOpened({
			source,
			mode,
			workflow_id,
		});

		expect(useTelemetry().track).toHaveBeenCalledWith('User opened nodes panel', {
			mode,
			source,
			nodes_panel_session_id: getSessionId(now1),
			workflow_id,
		});
	});

	it('tracks event on category expanded', () => {
		nodeCreatorStore.onCreatorOpened({
			source,
			mode,
			workflow_id,
		});
		nodeCreatorStore.onCategoryExpanded({ workflow_id, category_name });

		expect(useTelemetry().track).toHaveBeenCalledWith('User viewed node category', {
			category_name,
			is_subcategory: false,
			nodes_panel_session_id: getSessionId(now),
			workflow_id,
		});
	});

	it('tracks event when node is added to canvas', () => {
		nodeCreatorStore.onCreatorOpened({
			source,
			mode,
			workflow_id,
		});
		nodeCreatorStore.onNodeAddedToCanvas({
			node_id,
			node_type,
			node_version,
			is_auto_add: true,
			workflow_id,
			drag_and_drop: true,
			input_node_type,
		});

		expect(useTelemetry().track).toHaveBeenCalledWith('User added node to workflow canvas', {
			node_id,
			node_type,
			node_version,
			is_auto_add: true,
			drag_and_drop: true,
			input_node_type,
			nodes_panel_session_id: getSessionId(now),
			workflow_id,
		});
	});

	it('tracks when custom api action is clicked', () => {
		nodeCreatorStore.onCreatorOpened({
			source,
			mode,
			workflow_id,
		});
		nodeCreatorStore.onActionsCustomAPIClicked({
			app_identifier: node_type,
		});

		expect(useTelemetry().track).toHaveBeenCalledWith('User clicked custom API from node actions', {
			app_identifier: node_type,
			nodes_panel_session_id: getSessionId(now),
		});
	});

	it('tracks when action is viewed', () => {
		nodeCreatorStore.onCreatorOpened({
			source,
			mode,
			workflow_id,
		});
		nodeCreatorStore.onViewActions({
			app_identifier: node_type,
			actions,
			regular_action_count: 1,
			trigger_action_count: 2,
		});

		expect(useTelemetry().track).toHaveBeenCalledWith('User viewed node actions', {
			app_identifier: node_type,
			actions,
			regular_action_count: 1,
			trigger_action_count: 2,
			nodes_panel_session_id: getSessionId(now),
		});
	});

	it('tracks when search filter is updated, ignoring custom actions in count', () => {
		const newValue = 'new-value';
		const subcategory = 'subcategory';
		const title = 'title';

		const mockTrigger = {
			key: 'n8n-node.exampleTrigger',
			properties: {
				name: 'n8n-node.exampleTrigger',
				displayName: 'Example Trigger',
			},
		} as INodeCreateElement;

		const mockCustom = {
			key: 'action',
			properties: {
				actionKey: CUSTOM_API_CALL_KEY,
			},
		} as INodeCreateElement;

		const mockRegular = {
			key: 'n8n-node.example',
			properties: {},
		} as INodeCreateElement;

		const mockCommunity1 = {
			key: 'community-node1.example',
			properties: {
				name: 'n8n-nodes-community-node1',
			},
		} as INodeCreateElement;

		const mockCommunity2 = {
			key: 'community-node2.example',
			properties: {
				name: '@author/n8n-nodes-community-node2',
			},
		} as INodeCreateElement;

		nodeCreatorStore.onCreatorOpened({
			source,
			mode,
			workflow_id,
		});
		nodeCreatorStore.onNodeFilterChanged({
			newValue,
			filteredNodes: [mockCustom, mockRegular, mockTrigger, mockCommunity1, mockCommunity2],
			filterMode: REGULAR_NODE_CREATOR_VIEW,
			subcategory,
			title,
		});

		expect(useTelemetry().track).toHaveBeenCalledWith('User entered nodes panel search term', {
			search_string: newValue,
			filter_mode: 'regular',
			category_name: subcategory,
			results_count: 4,
			trigger_count: 1,
			regular_count: 3,
			community_count: 2,
			nodes_panel_session_id: getSessionId(now),
			title,
		});
	});
	describe('selective connection view', () => {
		const mockedParseCanvasConnectionHandleString = vi.mocked(
			parseCanvasConnectionHandleString,
			true,
		);

		it('sets nodeCreatorView to AI_UNCATEGORIZED_CATEGORY when connection type is not Main', async () => {
			mockedParseCanvasConnectionHandleString.mockReturnValue({
				type: NodeConnectionTypes.AiLanguageModel, // any value that is not NodeConnectionTypes.Main
				index: 0,
				mode: CanvasConnectionMode.Input,
			});

			const connection = {
				source: 'node-1',
				sourceHandle: 'fake-handle',
			};

			nodeCreatorStore.openNodeCreatorForConnectingNode({
				connection,
				eventSource: 'plus_endpoint',
				nodeCreatorView: REGULAR_NODE_CREATOR_VIEW,
			});

			expect(nodeCreatorStore.selectedView).toEqual(AI_UNCATEGORIZED_CATEGORY);
		});

		it('uses the provided nodeCreatorView when connection type is Main', async () => {
			mockedParseCanvasConnectionHandleString.mockReturnValue({
				type: NodeConnectionTypes.Main,
				index: 0,
				mode: CanvasConnectionMode.Input,
			});

			const connection = {
				source: 'node-2',
				sourceHandle: 'fake-handle-main',
			};

			nodeCreatorStore.openNodeCreatorForConnectingNode({
				connection,
				eventSource: 'plus_endpoint',
				nodeCreatorView: REGULAR_NODE_CREATOR_VIEW,
			});

			expect(nodeCreatorStore.selectedView).toEqual(REGULAR_NODE_CREATOR_VIEW);
		});

		it('does not update state if no source node is found', async () => {
			const connection = {
				source: '',
				sourceHandle: 'any-handle',
			};

			nodeCreatorStore.openNodeCreatorForConnectingNode({
				connection,
				eventSource: 'plus_endpoint',
				nodeCreatorView: REGULAR_NODE_CREATOR_VIEW,
			});

			expect(nodeCreatorStore.selectedView).not.toEqual(REGULAR_NODE_CREATOR_VIEW);
		});
	});

	it('tracks when node is added to canvas with action parameter', () => {
		nodeCreatorStore.onCreatorOpened({
			source,
			mode,
			workflow_id,
		});
		nodeCreatorStore.onNodeAddedToCanvas({
			node_id,
			node_type,
			node_version,
			workflow_id,
			action: 'Create Contact',
			resource: 'contact',
			operation: 'create',
		});

		expect(useTelemetry().track).toHaveBeenCalledWith('User added node to workflow canvas', {
			node_id,
			node_type,
			node_version,
			workflow_id,
			action: 'Create Contact',
			resource: 'contact',
			operation: 'create',
			nodes_panel_session_id: getSessionId(now),
		});
	});

	describe('openNodeCreatorWithNode', () => {
		const nodeName = 'test-node';
		const nodeType = {
			name: 'test-node-type',
			displayName: 'Test Node Type',
			description: 'Test description',
		};

		it('should return early when nodeData is null', async () => {
			mockUseWorkflowsStore.getNodeByName.mockReturnValue(null);

			mockUseNDVStore.unsetActiveNodeName = vi.fn();
			mockUseNodeTypesStore.getNodeType = vi.fn();
			mockUseNodeTypesStore.communityNodeType = vi.fn();

			await nodeCreatorStore.openNodeCreatorWithNode(nodeName);

			expect(mockUseNDVStore.unsetActiveNodeName).not.toHaveBeenCalled();
			expect(mockUseNodeTypesStore.getNodeType).not.toHaveBeenCalled();
			expect(mockUseNodeTypesStore.communityNodeType).not.toHaveBeenCalled();
		});

		it('should return early when nodeType is null', async () => {
			mockUseWorkflowsStore.getNodeByName.mockReturnValue({
				id: 'test-id',
				name: nodeName,
				type: 'test-type',
			} as INodeUi);
			mockUseNodeTypesStore.getNodeType = vi.fn(() => null);
			mockUseNodeTypesStore.communityNodeType = vi.fn(() => undefined);

			await nodeCreatorStore.openNodeCreatorWithNode(nodeName);

			expect(mockUseNDVStore.unsetActiveNodeName).toHaveBeenCalled();
			expect(mockUseNodeTypesStore.getNodeType).toHaveBeenCalledWith('test-type');
			expect(mockUseNodeTypesStore.communityNodeType).toHaveBeenCalledWith('test-type');
			expect(nodeCreatorStore.isCreateNodeActive).toBe(false);
		});

		it('should successfully open node creator with regular node type', async () => {
			mockUseWorkflowsStore.getNodeByName.mockReturnValue({
				id: 'test-id',
				name: nodeName,
				type: 'test-type',
			} as INodeUi);
			mockUseNodeTypesStore.getNodeType = vi.fn(() => nodeType as INodeTypeDescription);
			mockUseNodeTypesStore.communityNodeType = vi.fn(() => undefined);

			nodeCreatorStore.actions = {
				[nodeType.name]: [
					{
						actionKey: 'test-action',
						displayName: 'Test Action',
					},
				],
			} as ActionsRecord<SimplifiedNodeType[]>;

			await nodeCreatorStore.openNodeCreatorWithNode(nodeName);
			expect(mockUseNDVStore.unsetActiveNodeName).toHaveBeenCalled();
			expect(mockUseNodeTypesStore.getNodeType).toHaveBeenCalledWith('test-type');
			expect(nodeCreatorStore.isCreateNodeActive).toBe(true);
			expect(mockedPrepareCommunityNodeDetailsViewStack).toHaveBeenCalledWith(
				{
					key: nodeType.name,
					properties: nodeType,
					type: 'node',
					subcategory: '*',
				},
				{ type: 'icon', name: 'test-icon' },
				'Regular',
				[
					{
						actionKey: 'test-action',
						displayName: 'Test Action',
					},
				],
			);
			expect(mockUseViewStacks.pushViewStack).toHaveBeenCalledWith(
				{
					title: 'Test Node',
					subcategory: '*',
					mode: 'community-node',
				},
				{ resetStacks: true },
			);
		});

		it('should successfully open node creator with community node type', async () => {
			mockUseWorkflowsStore.getNodeByName.mockReturnValue({
				id: 'test-id',
				name: nodeName,
				type: 'test-type',
			} as INodeUi);
			mockUseNodeTypesStore.getNodeType = vi.fn(() => null);
			mockUseNodeTypesStore.communityNodeType = vi.fn(
				() =>
					({
						nodeDescription: nodeType as INodeTypeDescription,
					}) as CommunityNodeType,
			);

			nodeCreatorStore.actions = {
				[nodeType.name]: [],
			};

			await nodeCreatorStore.openNodeCreatorWithNode(nodeName);

			expect(mockUseNDVStore.unsetActiveNodeName).toHaveBeenCalled();
			expect(mockUseNodeTypesStore.getNodeType).toHaveBeenCalledWith('test-type');
			expect(mockUseNodeTypesStore.communityNodeType).toHaveBeenCalledWith('test-type');
			expect(nodeCreatorStore.isCreateNodeActive).toBe(true);
			expect(mockedPrepareCommunityNodeDetailsViewStack).toHaveBeenCalledWith(
				{
					key: nodeType.name,
					properties: nodeType,
					type: 'node',
					subcategory: '*',
				},
				{ type: 'icon', name: 'test-icon' },
				'Regular',
				[],
			);
			expect(mockUseViewStacks.pushViewStack).toHaveBeenCalledWith(
				{
					title: 'Test Node',
					subcategory: '*',
					mode: 'community-node',
				},
				{ resetStacks: true },
			);
		});

		it('should handle empty actions array', async () => {
			mockUseWorkflowsStore.getNodeByName.mockReturnValue({
				id: 'test-id',
				name: nodeName,
				type: 'test-type',
			} as INodeUi);
			mockUseNodeTypesStore.getNodeType = vi.fn(() => nodeType as INodeTypeDescription);
			mockUseNodeTypesStore.communityNodeType = vi.fn(() => undefined);

			nodeCreatorStore.actions = {};

			await nodeCreatorStore.openNodeCreatorWithNode(nodeName);

			expect(mockedPrepareCommunityNodeDetailsViewStack).toHaveBeenCalledWith(
				{
					key: nodeType.name,
					properties: nodeType,
					type: 'node',
					subcategory: '*',
				},
				{ type: 'icon', name: 'test-icon' },
				'Regular',
				[],
			);
		});
	});
});

function getSessionId(time: number) {
	return `nodes_panel_session_${time}`;
}
