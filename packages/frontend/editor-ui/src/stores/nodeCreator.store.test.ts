import { createPinia, setActivePinia } from 'pinia';
import { useNodeCreatorStore } from './nodeCreator.store';
import { useTelemetry } from '@/composables/useTelemetry';
import {
	AI_UNCATEGORIZED_CATEGORY,
	CUSTOM_API_CALL_KEY,
	REGULAR_NODE_CREATOR_VIEW,
} from '@/constants';
import type { INodeCreateElement } from '@/Interface';
import { parseCanvasConnectionHandleString } from '@/utils/canvasUtils';
import { NodeConnectionTypes } from 'n8n-workflow';
import { CanvasConnectionMode } from '@/types';

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

// Mock the workflows store so that getNodeById returns a dummy node.
vi.mock('@/stores/workflows.store', () => {
	return {
		useWorkflowsStore: () => ({
			getNodeById: vi.fn((id?: string) => {
				return id ? { id, name: 'Test Node' } : null;
			}),
			workflowTriggerNodes: [],
			workflowId: 'dummy-workflow-id',
			workflowObject: {
				getNode: vi.fn(() => ({
					type: 'n8n-node.example',
					typeVersion: 1,
				})),
			},
		}),
	};
});

vi.mock('@/utils/canvasUtils', () => {
	return {
		parseCanvasConnectionHandleString: vi.fn(),
	};
});

describe('useNodeCreatorStore', () => {
	let nodeCreatorStore: ReturnType<typeof useNodeCreatorStore>;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.restoreAllMocks();
		setActivePinia(createPinia());
		nodeCreatorStore = useNodeCreatorStore();
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
				name: 'n8n-node.exampleTrigge',
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

		nodeCreatorStore.onCreatorOpened({
			source,
			mode,
			workflow_id,
		});
		nodeCreatorStore.onNodeFilterChanged({
			newValue,
			filteredNodes: [mockCustom, mockRegular, mockTrigger],
			filterMode: REGULAR_NODE_CREATOR_VIEW,
			subcategory,
			title,
		});

		expect(useTelemetry().track).toHaveBeenCalledWith('User entered nodes panel search term', {
			search_string: newValue,
			filter_mode: 'regular',
			category_name: subcategory,
			results_count: 2,
			trigger_count: 1,
			regular_count: 1,
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
});

function getSessionId(time: number) {
	return `nodes_panel_session_${time}`;
}
