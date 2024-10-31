import { createPinia, setActivePinia } from 'pinia';
import { useNodeCreatorStore } from './nodeCreator.store';
import { useTelemetry } from '@/composables/useTelemetry';
import { CUSTOM_API_CALL_KEY, REGULAR_NODE_CREATOR_VIEW } from '@/constants';
import type { INodeCreateElement } from '@/Interface';

const workflow_id = 'workflow-id';
const category_name = 'category-name';
const source = 'source';
const mode = 'mode';
const now = 1717602004819;
const now1 = 1718602004819;
const node_type = 'node-type';
const node_version = 1;
const input_node_type = 'input-node-type';
const action = 'action';
const source_mode = 'source-mode';
const resource = 'resource';
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

		expect(useTelemetry().track).toHaveBeenCalledWith(
			'User opened nodes panel',
			{
				mode,
				source,
				nodes_panel_session_id: getSessionId(now),
				workflow_id,
			},
			{
				withPostHog: false,
			},
		);
	});

	it('resets session id every time node creator is opened', () => {
		nodeCreatorStore.onCreatorOpened({
			source,
			mode,
			workflow_id,
		});

		expect(useTelemetry().track).toHaveBeenCalledWith(
			'User opened nodes panel',
			{
				mode,
				source,
				nodes_panel_session_id: getSessionId(now),
				workflow_id,
			},
			{
				withPostHog: false,
			},
		);

		vi.setSystemTime(now1);

		nodeCreatorStore.onCreatorOpened({
			source,
			mode,
			workflow_id,
		});

		expect(useTelemetry().track).toHaveBeenCalledWith(
			'User opened nodes panel',
			{
				mode,
				source,
				nodes_panel_session_id: getSessionId(now1),
				workflow_id,
			},
			{
				withPostHog: false,
			},
		);
	});

	it('tracks event on category expanded', () => {
		nodeCreatorStore.onCreatorOpened({
			source,
			mode,
			workflow_id,
		});
		nodeCreatorStore.onCategoryExpanded({ workflow_id, category_name });

		expect(useTelemetry().track).toHaveBeenCalledWith(
			'User viewed node category',
			{
				category_name,
				is_subcategory: false,
				nodes_panel_session_id: getSessionId(now),
				workflow_id,
			},
			{
				withPostHog: false,
			},
		);
	});

	it('tracks event when node is added to canvas', () => {
		nodeCreatorStore.onCreatorOpened({
			source,
			mode,
			workflow_id,
		});
		nodeCreatorStore.onNodeAddedToCanvas({
			node_type,
			node_version,
			is_auto_add: true,
			workflow_id,
			drag_and_drop: true,
			input_node_type,
		});

		expect(useTelemetry().track).toHaveBeenCalledWith(
			'User added node to workflow canvas',
			{
				node_type,
				node_version,
				is_auto_add: true,
				drag_and_drop: true,
				input_node_type,
				nodes_panel_session_id: getSessionId(now),
				workflow_id,
			},
			{
				withPostHog: true,
			},
		);
	});

	it('tracks event when action is added', () => {
		nodeCreatorStore.onCreatorOpened({
			source,
			mode,
			workflow_id,
		});
		nodeCreatorStore.onAddActions({
			node_type,
			action,
			source_mode,
			resource,
		});

		expect(useTelemetry().track).toHaveBeenCalledWith(
			'User added action',
			{
				node_type,
				action,
				source_mode,
				resource,
				nodes_panel_session_id: getSessionId(now),
			},
			{
				withPostHog: false,
			},
		);
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

		expect(useTelemetry().track).toHaveBeenCalledWith(
			'User clicked custom API from node actions',
			{
				app_identifier: node_type,
				nodes_panel_session_id: getSessionId(now),
			},
			{
				withPostHog: false,
			},
		);
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

		expect(useTelemetry().track).toHaveBeenCalledWith(
			'User viewed node actions',
			{
				app_identifier: node_type,
				actions,
				regular_action_count: 1,
				trigger_action_count: 2,
				nodes_panel_session_id: getSessionId(now),
			},
			{
				withPostHog: false,
			},
		);
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

		expect(useTelemetry().track).toHaveBeenCalledWith(
			'User entered nodes panel search term',
			{
				search_string: newValue,
				filter_mode: 'regular',
				category_name: subcategory,
				results_count: 2,
				trigger_count: 1,
				regular_count: 1,
				nodes_panel_session_id: getSessionId(now),
				title,
			},
			{
				withPostHog: false,
			},
		);
	});
});

function getSessionId(time: number) {
	return `nodes_panel_session_${time}`;
}
