import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useNodeCreatorStore } from '@/stores/nodeCreator.store';
import { useNodeTypesStore } from '@/stores/nodeTypes.store';
import { useWorkflowsStore } from '@/stores/workflows.store';
import { useActions } from './composables/useActions';
import {
	AGENT_NODE_TYPE,
	GITHUB_TRIGGER_NODE_TYPE,
	HTTP_REQUEST_NODE_TYPE,
	MANUAL_TRIGGER_NODE_TYPE,
	NODE_CREATOR_OPEN_SOURCES,
	NO_OP_NODE_TYPE,
	SCHEDULE_TRIGGER_NODE_TYPE,
	SLACK_NODE_TYPE,
	SPLIT_IN_BATCHES_NODE_TYPE,
	TRIGGER_NODE_CREATOR_VIEW,
	WEBHOOK_NODE_TYPE,
} from '@/constants';
import { CHAT_TRIGGER_NODE_TYPE } from 'n8n-workflow';

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
			vi.spyOn(workflowsStore, 'getNodeTypes').mockReturnValue({
				getByNameAndVersion: () => ({ description: { group: ['trigger'] } }),
			} as never);
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

		test('should insert a ChatTrigger node when an AI Agent is added on an empty canvas', () => {
			const workflowsStore = useWorkflowsStore();

			vi.spyOn(workflowsStore, 'workflowTriggerNodes', 'get').mockReturnValue([]);
			vi.spyOn(workflowsStore, 'allNodes', 'get').mockReturnValue([]);

			const { getAddedNodesAndConnections } = useActions();

			expect(getAddedNodesAndConnections([{ type: AGENT_NODE_TYPE }])).toEqual({
				connections: [
					{
						from: {
							nodeIndex: 0,
						},
						to: {
							nodeIndex: 1,
						},
					},
				],
				nodes: [
					{ type: CHAT_TRIGGER_NODE_TYPE, isAutoAdd: true },
					{ type: AGENT_NODE_TYPE, openDetail: true },
				],
			});
		});

		test('should insert a ChatTrigger node when an AI Agent is added with only a Manual Trigger present', () => {
			const workflowsStore = useWorkflowsStore();

			vi.spyOn(workflowsStore, 'workflowTriggerNodes', 'get').mockReturnValue([
				{ type: MANUAL_TRIGGER_NODE_TYPE } as never,
			]);
			vi.spyOn(workflowsStore, 'allNodes', 'get').mockReturnValue([
				{ type: MANUAL_TRIGGER_NODE_TYPE } as never,
			]);

			const { getAddedNodesAndConnections } = useActions();

			expect(getAddedNodesAndConnections([{ type: AGENT_NODE_TYPE }])).toEqual({
				connections: [
					{
						from: {
							nodeIndex: 0,
						},
						to: {
							nodeIndex: 1,
						},
					},
				],
				nodes: [
					{ type: CHAT_TRIGGER_NODE_TYPE, isAutoAdd: true },
					{ type: AGENT_NODE_TYPE, openDetail: true },
				],
			});
		});

		test('should not insert a ChatTrigger node when an AI Agent is added with a non-trigger node prseent', () => {
			const workflowsStore = useWorkflowsStore();

			vi.spyOn(workflowsStore, 'workflowTriggerNodes', 'get').mockReturnValue([
				{ type: GITHUB_TRIGGER_NODE_TYPE } as never,
			]);

			vi.spyOn(workflowsStore, 'allNodes', 'get').mockReturnValue([
				{ type: GITHUB_TRIGGER_NODE_TYPE } as never,
				{ type: HTTP_REQUEST_NODE_TYPE } as never,
			]);

			const { getAddedNodesAndConnections } = useActions();

			expect(getAddedNodesAndConnections([{ type: AGENT_NODE_TYPE }])).toEqual({
				connections: [],
				nodes: [{ type: AGENT_NODE_TYPE, openDetail: true }],
			});
		});

		test('should not insert a ChatTrigger node when an AI Agent is added with a Chat Trigger already present', () => {
			const workflowsStore = useWorkflowsStore();

			vi.spyOn(workflowsStore, 'workflowTriggerNodes', 'get').mockReturnValue([
				{ type: CHAT_TRIGGER_NODE_TYPE } as never,
			]);
			vi.spyOn(workflowsStore, 'allNodes', 'get').mockReturnValue([
				{ type: CHAT_TRIGGER_NODE_TYPE } as never,
			]);

			const { getAddedNodesAndConnections } = useActions();

			expect(getAddedNodesAndConnections([{ type: AGENT_NODE_TYPE }])).toEqual({
				connections: [],
				nodes: [{ type: AGENT_NODE_TYPE, openDetail: true }],
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

		test('should connect node to schedule trigger when adding them together', () => {
			const workflowsStore = useWorkflowsStore();
			const nodeCreatorStore = useNodeCreatorStore();
			const nodeTypesStore = useNodeTypesStore();

			vi.spyOn(workflowsStore, 'workflowTriggerNodes', 'get').mockReturnValue([
				{ type: SCHEDULE_TRIGGER_NODE_TYPE } as never,
			]);
			vi.spyOn(nodeCreatorStore, 'openSource', 'get').mockReturnValue(
				NODE_CREATOR_OPEN_SOURCES.ADD_NODE_BUTTON,
			);
			vi.spyOn(nodeCreatorStore, 'selectedView', 'get').mockReturnValue(TRIGGER_NODE_CREATOR_VIEW);
			nodeTypesStore.nodeTypes = {
				[SCHEDULE_TRIGGER_NODE_TYPE]: {
					1: {
						name: SCHEDULE_TRIGGER_NODE_TYPE,
						displayName: 'Schedule Trigger',
						group: ['trigger'],
						version: 1,
						defaults: {},
						inputs: [],
						outputs: [],
						properties: [],
						description: '',
					},
				},
			};
			const { getAddedNodesAndConnections } = useActions();

			expect(
				getAddedNodesAndConnections([
					{ type: SCHEDULE_TRIGGER_NODE_TYPE, openDetail: true },
					{ type: SLACK_NODE_TYPE },
				]),
			).toEqual({
				connections: [{ from: { nodeIndex: 0 }, to: { nodeIndex: 1 } }],
				nodes: [{ type: SCHEDULE_TRIGGER_NODE_TYPE, openDetail: true }, { type: SLACK_NODE_TYPE }],
			});
		});

		test('should connect node to webhook trigger when adding them together', () => {
			const workflowsStore = useWorkflowsStore();
			const nodeCreatorStore = useNodeCreatorStore();
			const nodeTypesStore = useNodeTypesStore();

			vi.spyOn(workflowsStore, 'workflowTriggerNodes', 'get').mockReturnValue([
				{ type: SCHEDULE_TRIGGER_NODE_TYPE } as never,
			]);
			vi.spyOn(nodeCreatorStore, 'openSource', 'get').mockReturnValue(
				NODE_CREATOR_OPEN_SOURCES.ADD_NODE_BUTTON,
			);
			vi.spyOn(nodeCreatorStore, 'selectedView', 'get').mockReturnValue(TRIGGER_NODE_CREATOR_VIEW);
			nodeTypesStore.nodeTypes = {
				[WEBHOOK_NODE_TYPE]: {
					1: {
						name: WEBHOOK_NODE_TYPE,
						displayName: 'Webhook',
						group: ['trigger'],
						version: 1,
						defaults: {},
						inputs: [],
						outputs: [],
						properties: [],
						description: '',
					},
				},
			};
			const { getAddedNodesAndConnections } = useActions();

			expect(
				getAddedNodesAndConnections([
					{ type: WEBHOOK_NODE_TYPE, openDetail: true },
					{ type: SLACK_NODE_TYPE },
				]),
			).toEqual({
				connections: [{ from: { nodeIndex: 0 }, to: { nodeIndex: 1 } }],
				nodes: [{ type: WEBHOOK_NODE_TYPE, openDetail: true }, { type: SLACK_NODE_TYPE }],
			});
		});
	});

	describe('actionDataToNodeTypeSelectedPayload', () => {
		test('should include actionName from ActionData', () => {
			const { actionDataToNodeTypeSelectedPayload } = useActions();

			const actionData = {
				name: 'Create Contact',
				key: 'hubspot',
				value: {
					resource: 'contact',
					operation: 'create',
				},
			};

			const result = actionDataToNodeTypeSelectedPayload(actionData);

			expect(result).toEqual({
				type: 'hubspot',
				actionName: 'Create Contact',
				parameters: {
					resource: 'contact',
					operation: 'create',
				},
			});
		});

		test('should include actionName even when parameters are undefined', () => {
			const { actionDataToNodeTypeSelectedPayload } = useActions();

			const actionData = {
				name: 'Send Message',
				key: 'slack',
				value: {},
			};

			const result = actionDataToNodeTypeSelectedPayload(actionData);

			expect(result).toEqual({
				type: 'slack',
				actionName: 'Send Message',
			});
		});

		test('should preserve existing resource and operation alongside actionName', () => {
			const { actionDataToNodeTypeSelectedPayload } = useActions();

			const actionData = {
				name: 'Update Record',
				key: 'airtable',
				value: {
					resource: 'base',
					operation: 'update',
					someOtherParam: 'value',
				},
			};

			const result = actionDataToNodeTypeSelectedPayload(actionData);

			expect(result).toEqual({
				type: 'airtable',
				actionName: 'Update Record',
				parameters: {
					resource: 'base',
					operation: 'update',
				},
			});
		});
	});

	describe('getAddedNodesAndConnections with actionName', () => {
		test('should preserve actionName in nodes array', () => {
			const workflowsStore = useWorkflowsStore();
			const nodeCreatorStore = useNodeCreatorStore();

			vi.spyOn(workflowsStore, 'workflowTriggerNodes', 'get').mockReturnValue([]);
			vi.spyOn(nodeCreatorStore, 'openSource', 'get').mockReturnValue(
				NODE_CREATOR_OPEN_SOURCES.ADD_NODE_BUTTON,
			);
			vi.spyOn(nodeCreatorStore, 'selectedView', 'get').mockReturnValue(TRIGGER_NODE_CREATOR_VIEW);

			const { getAddedNodesAndConnections } = useActions();

			const result = getAddedNodesAndConnections([
				{ type: HTTP_REQUEST_NODE_TYPE, actionName: 'Make API Call' },
			]);

			expect(result).toEqual({
				connections: [{ from: { nodeIndex: 0 }, to: { nodeIndex: 1 } }],
				nodes: [
					{ type: MANUAL_TRIGGER_NODE_TYPE, isAutoAdd: true },
					{ type: HTTP_REQUEST_NODE_TYPE, openDetail: true, actionName: 'Make API Call' },
				],
			});
		});

		test('should preserve actionName when no trigger is prepended', () => {
			const workflowsStore = useWorkflowsStore();
			const nodeCreatorStore = useNodeCreatorStore();

			vi.spyOn(workflowsStore, 'workflowTriggerNodes', 'get').mockReturnValue([
				{ type: MANUAL_TRIGGER_NODE_TYPE } as never,
			]);
			vi.spyOn(nodeCreatorStore, 'openSource', 'get').mockReturnValue(
				NODE_CREATOR_OPEN_SOURCES.ADD_NODE_BUTTON,
			);
			vi.spyOn(nodeCreatorStore, 'selectedView', 'get').mockReturnValue(TRIGGER_NODE_CREATOR_VIEW);

			const { getAddedNodesAndConnections } = useActions();

			const result = getAddedNodesAndConnections([
				{ type: SLACK_NODE_TYPE, actionName: 'Post Message' },
			]);

			expect(result).toEqual({
				connections: [],
				nodes: [{ type: SLACK_NODE_TYPE, openDetail: true, actionName: 'Post Message' }],
			});
		});

		test('should work with multiple nodes having actionNames', () => {
			const workflowsStore = useWorkflowsStore();
			const nodeCreatorStore = useNodeCreatorStore();

			vi.spyOn(workflowsStore, 'workflowTriggerNodes', 'get').mockReturnValue([
				{ type: MANUAL_TRIGGER_NODE_TYPE } as never,
			]);
			vi.spyOn(nodeCreatorStore, 'openSource', 'get').mockReturnValue(
				NODE_CREATOR_OPEN_SOURCES.ADD_NODE_BUTTON,
			);

			const { getAddedNodesAndConnections } = useActions();

			const result = getAddedNodesAndConnections([
				{ type: WEBHOOK_NODE_TYPE, openDetail: true, actionName: 'Receive Webhook' },
				{ type: SLACK_NODE_TYPE, actionName: 'Send Notification' },
			]);

			expect(result).toEqual({
				connections: [{ from: { nodeIndex: 0 }, to: { nodeIndex: 1 } }],
				nodes: [
					{ type: WEBHOOK_NODE_TYPE, openDetail: true, actionName: 'Receive Webhook' },
					{ type: SLACK_NODE_TYPE, actionName: 'Send Notification' },
				],
			});
		});
	});
});
