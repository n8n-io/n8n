import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useActions } from '../composables/useActions';
import {
	HTTP_REQUEST_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	NODE_CREATOR_OPEN_SOURCES,
	NO_OP_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	SPLIT_IN_BATCHES_NODE_TYPE,
	TRIGGER_NODE_CREATOR_VIEW,
} from '@/constants';

describe('useActions', () => {
	beforeAll(() => {
		setActivePinia(createTestingPinia());
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('getAddedNodesAndConnections', () => {
		test('should insert a manual trigger node when there are no triggers', () => {
			const workflowsStore = useWorkflowsStore();
			const nodeCreatorStore = useNodeCreatorStore();

			vi.spyOn(workflowsStore, 'workflowTriggerNodes', 'get').mockReturnValue([]);
			vi.spyOn(nodeCreatorStore, 'openSource', 'get').mockReturnValue(
				NODE_CREATOR_OPEN_SOURCES.ADD_NODE_BUTTON,
			);
			vi.spyOn(nodeCreatorStore, 'selectedView', 'get').mockReturnValue(TRIGGER_NODE_CREATOR_VIEW);

			const { getAddedNodesAndConnections } = useActions();

			expect(getAddedNodesAndConnections([{ type: HTTP_REQUEST_NODE_TYPE }])).toEqual({
				connections: [{ from: { nodeIndex: 0 }, to: { nodeIndex: 1 } }],
				nodes: [
					{ type: MANUAL_TRIGGER_NODE_TYPE, isAutoAdd: true },
					{ type: HTTP_REQUEST_NODE_TYPE, openDetail: true },
				],
			});
		});

		test('should not insert a manual trigger node when there is a trigger in the workflow', () => {
			const workflowsStore = useWorkflowsStore();
			const nodeCreatorStore = useNodeCreatorStore();

			vi.spyOn(workflowsStore, 'workflowTriggerNodes', 'get').mockReturnValue([
				{ type: SCHEDULE_TRIGGER_NODE_TYPE } as never,
			]);
			vi.spyOn(nodeCreatorStore, 'openSource', 'get').mockReturnValue(
				NODE_CREATOR_OPEN_SOURCES.ADD_NODE_BUTTON,
			);
			vi.spyOn(nodeCreatorStore, 'selectedView', 'get').mockReturnValue(TRIGGER_NODE_CREATOR_VIEW);

			const { getAddedNodesAndConnections } = useActions();

			expect(getAddedNodesAndConnections([{ type: HTTP_REQUEST_NODE_TYPE }])).toEqual({
				connections: [],
				nodes: [{ type: HTTP_REQUEST_NODE_TYPE, openDetail: true }],
			});
		});

		test('should insert a No Op node when a Loop Over Items Node is added', () => {
			const workflowsStore = useWorkflowsStore();
			const nodeCreatorStore = useNodeCreatorStore();

			vi.spyOn(workflowsStore, 'workflowTriggerNodes', 'get').mockReturnValue([]);
			vi.spyOn(nodeCreatorStore, 'openSource', 'get').mockReturnValue(
				NODE_CREATOR_OPEN_SOURCES.ADD_NODE_BUTTON,
			);
			vi.spyOn(nodeCreatorStore, 'selectedView', 'get').mockReturnValue(TRIGGER_NODE_CREATOR_VIEW);

			const { getAddedNodesAndConnections } = useActions();

			expect(getAddedNodesAndConnections([{ type: SPLIT_IN_BATCHES_NODE_TYPE }])).toEqual({
				connections: [
					{ from: { nodeIndex: 0 }, to: { nodeIndex: 1 } },
					{ from: { nodeIndex: 1, outputIndex: 1 }, to: { nodeIndex: 2 } },
					{ from: { nodeIndex: 2 }, to: { nodeIndex: 1 } },
				],
				nodes: [
					{ isAutoAdd: true, type: MANUAL_TRIGGER_NODE_TYPE },
					{ openDetail: true, type: SPLIT_IN_BATCHES_NODE_TYPE },
					{ isAutoAdd: true, name: 'Replace Me', type: NO_OP_NODE_TYPE },
				],
			});
		});
	});
});
