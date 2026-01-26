import { setActivePinia } from 'pinia';
import { useLogStreamingStore } from './logStreaming.store';
import { createTestingPinia } from '@pinia/testing';

describe('LogStreamingStore', () => {
	let logStreamingStore: ReturnType<typeof useLogStreamingStore>;

	beforeAll(() => {
		setActivePinia(createTestingPinia({ stubActions: false }));
		logStreamingStore = useLogStreamingStore();
	});

	describe('addEventName', () => {
		it('should add a new event name', () => {
			logStreamingStore.addEventName('n8n.node.started');
			logStreamingStore.addEventName('n8n.node.success');
			logStreamingStore.addEventName('n8n.node.failed');
		});
	});

	describe('addDestination', () => {
		it('should add a new destination', () => {
			logStreamingStore.addDestination({
				id: 'destinationId',
				label: 'Test Destination',
				enabled: true,
				subscribedEvents: [],
				anonymizeAuditMessages: false,
			});
			expect(logStreamingStore.items.destinationId).toBeDefined();
			expect(logStreamingStore.items.destinationId.destination.label).toBe('Test Destination');
			expect(logStreamingStore.items.destinationId.eventGroups).toHaveLength(2);
			const nodeEventGroup = logStreamingStore.items.destinationId.eventGroups.find(
				(group) => group.name === 'n8n.node',
			);
			expect(nodeEventGroup).toBeDefined();
			expect(nodeEventGroup!.children).toHaveLength(3);
			expect(nodeEventGroup!.children.every((c) => !c.selected)).toBe(true);
		});
	});

	describe('setSelectedInGroup', () => {
		it('should select the group and unselect all children', () => {
			logStreamingStore.setSelectedInGroup('destinationId', 'n8n.node', true);
			const nodeEventGroup = logStreamingStore.items.destinationId.eventGroups.find(
				(group) => group.name === 'n8n.node',
			);
			expect(nodeEventGroup).toBeDefined();
			expect(nodeEventGroup!.selected).toBe(true);
			expect(nodeEventGroup!.children.every((e) => !e.selected)).toBe(true);
		});

		it('should select an event in a group and mark the group as indeterminate', () => {
			logStreamingStore.addSelectedEvent('destinationId', 'n8n.node.started');
			const nodeEventGroup = logStreamingStore.items.destinationId.eventGroups.find(
				(group) => group.name === 'n8n.node',
			);
			expect(nodeEventGroup).toBeDefined();
			expect(nodeEventGroup!.indeterminate).toBe(true);
			const startedEvent = nodeEventGroup!.children.find((e) => e.name === 'n8n.node.started');
			expect(startedEvent?.selected).toBe(true);
		});

		it('should select the group if all children are selected', () => {
			logStreamingStore.setSelectedInGroup('destinationId', 'n8n.node.started', true);
			logStreamingStore.setSelectedInGroup('destinationId', 'n8n.node.success', true);
			logStreamingStore.setSelectedInGroup('destinationId', 'n8n.node.failed', true);
			const nodeEventGroup = logStreamingStore.items.destinationId.eventGroups.find(
				(group) => group.name === 'n8n.node',
			);
			expect(nodeEventGroup).toBeDefined();
			expect(nodeEventGroup!.selected).toBe(true);
			expect(nodeEventGroup!.indeterminate).toBe(false);
			expect(nodeEventGroup!.children.every((e) => !e.selected)).toBe(true);
		});

		it('should deselect the group if any child is deselected', () => {
			logStreamingStore.setSelectedInGroup('destinationId', 'n8n.node.success', true);
			logStreamingStore.setSelectedInGroup('destinationId', 'n8n.node.failed', true);
			logStreamingStore.setSelectedInGroup('destinationId', 'n8n.node.started', false);
			const nodeEventGroup = logStreamingStore.items.destinationId.eventGroups.find(
				(group) => group.name === 'n8n.node',
			);
			expect(nodeEventGroup).toBeDefined();
			expect(nodeEventGroup!.selected).toBe(false);
			expect(nodeEventGroup!.indeterminate).toBe(true);
		});

		it('should unset the group indeterminate state if no children are selected', () => {
			logStreamingStore.setSelectedInGroup('destinationId', 'n8n.node.success', false);
			logStreamingStore.setSelectedInGroup('destinationId', 'n8n.node.failed', false);
			logStreamingStore.setSelectedInGroup('destinationId', 'n8n.node.started', false);
			const nodeEventGroup = logStreamingStore.items.destinationId.eventGroups.find(
				(group) => group.name === 'n8n.node',
			);
			expect(nodeEventGroup).toBeDefined();
			expect(nodeEventGroup!.selected).toBe(false);
			expect(nodeEventGroup!.indeterminate).toBe(false);
		});
	});
});
