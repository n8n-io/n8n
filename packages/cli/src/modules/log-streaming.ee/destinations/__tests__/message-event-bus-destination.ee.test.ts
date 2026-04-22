import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';
import type { MessageEventBusDestinationOptions } from 'n8n-workflow';

import { EventMessageGeneric } from '@/eventbus/event-message-classes/event-message-generic';
import type {
	MessageEventBus,
	MessageWithCallback,
} from '@/eventbus/message-event-bus/message-event-bus';

import { MessageEventBusDestination } from '../message-event-bus-destination.ee';

// Create a concrete implementation for testing
class TestDestination extends MessageEventBusDestination {
	async receiveFromEventBus(_emitterPayload: MessageWithCallback): Promise<boolean> {
		return true;
	}
}

describe('MessageEventBusDestination', () => {
	mockInstance(Logger);

	const eventBus = {} as MessageEventBus;

	describe('hasSubscribedToEvent', () => {
		it('should return false when destination is disabled', () => {
			const options: MessageEventBusDestinationOptions = {
				__type: MessageEventBusDestinationTypeNames.webhook,
				label: 'Test',
				enabled: false,
				subscribedEvents: ['n8n.workflow.success'],
				credentials: {},
				anonymizeAuditMessages: false,
			};

			const destination = new TestDestination(eventBus, options);
			const msg = new EventMessageGeneric({ eventName: 'n8n.workflow.success' });

			expect(destination.hasSubscribedToEvent(msg)).toBe(false);
		});

		it('should return true when subscribed to wildcard', () => {
			const options: MessageEventBusDestinationOptions = {
				__type: MessageEventBusDestinationTypeNames.webhook,
				label: 'Test',
				enabled: true,
				subscribedEvents: ['*'],
				credentials: {},
				anonymizeAuditMessages: false,
			};

			const destination = new TestDestination(eventBus, options);
			const msg = new EventMessageGeneric({ eventName: 'n8n.workflow.success' });

			expect(destination.hasSubscribedToEvent(msg)).toBe(true);
		});

		it('should return true when event name matches exactly', () => {
			const options: MessageEventBusDestinationOptions = {
				__type: MessageEventBusDestinationTypeNames.webhook,
				label: 'Test',
				enabled: true,
				subscribedEvents: ['n8n.workflow.success'],
				credentials: {},
				anonymizeAuditMessages: false,
			};

			const destination = new TestDestination(eventBus, options);
			const msg = new EventMessageGeneric({ eventName: 'n8n.workflow.success' });

			expect(destination.hasSubscribedToEvent(msg)).toBe(true);
		});

		it('should return true when event name matches prefix', () => {
			const options: MessageEventBusDestinationOptions = {
				__type: MessageEventBusDestinationTypeNames.webhook,
				label: 'Test',
				enabled: true,
				subscribedEvents: ['n8n.workflow'],
				credentials: {},
				anonymizeAuditMessages: false,
			};

			const destination = new TestDestination(eventBus, options);
			const msg = new EventMessageGeneric({ eventName: 'n8n.workflow.success' });

			expect(destination.hasSubscribedToEvent(msg)).toBe(true);
		});

		it('should return false when event name does not match', () => {
			const options: MessageEventBusDestinationOptions = {
				__type: MessageEventBusDestinationTypeNames.webhook,
				label: 'Test',
				enabled: true,
				subscribedEvents: ['n8n.audit'],
				credentials: {},
				anonymizeAuditMessages: false,
			};

			const destination = new TestDestination(eventBus, options);
			const msg = new EventMessageGeneric({ eventName: 'n8n.workflow.success' });

			expect(destination.hasSubscribedToEvent(msg)).toBe(false);
		});
	});

	describe('getId', () => {
		it('should generate a valid UUID when no ID is provided', () => {
			const options: MessageEventBusDestinationOptions = {
				__type: MessageEventBusDestinationTypeNames.webhook,
				label: 'Test',
				enabled: true,
				subscribedEvents: [],
				credentials: {},
				anonymizeAuditMessages: false,
			};

			const destination = new TestDestination(eventBus, options);
			const id = destination.getId();

			expect(id).toHaveLength(36);
			expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
		});

		it('should use provided ID when it is valid', () => {
			const validId = '12345678-1234-1234-1234-123456789abc';
			const options: MessageEventBusDestinationOptions = {
				__type: MessageEventBusDestinationTypeNames.webhook,
				id: validId,
				label: 'Test',
				enabled: true,
				subscribedEvents: [],
				credentials: {},
				anonymizeAuditMessages: false,
			};

			const destination = new TestDestination(eventBus, options);

			expect(destination.getId()).toBe(validId);
		});

		it('should generate new ID when provided ID is invalid', () => {
			const invalidId = 'invalid-id';
			const options: MessageEventBusDestinationOptions = {
				__type: MessageEventBusDestinationTypeNames.webhook,
				id: invalidId,
				label: 'Test',
				enabled: true,
				subscribedEvents: [],
				credentials: {},
				anonymizeAuditMessages: false,
			};

			const destination = new TestDestination(eventBus, options);
			const id = destination.getId();

			expect(id).not.toBe(invalidId);
			expect(id).toHaveLength(36);
		});
	});

	describe('serialize', () => {
		it('should serialize base properties', () => {
			const options: MessageEventBusDestinationOptions = {
				__type: MessageEventBusDestinationTypeNames.webhook,
				id: '12345678-1234-1234-1234-123456789abc',
				label: 'Test Destination',
				enabled: true,
				subscribedEvents: ['n8n.workflow.success', 'n8n.audit'],
				credentials: {},
				anonymizeAuditMessages: true,
			};

			const destination = new TestDestination(eventBus, options);
			const serialized = destination.serialize();

			expect(serialized).toEqual({
				__type: MessageEventBusDestinationTypeNames.webhook,
				id: '12345678-1234-1234-1234-123456789abc',
				label: 'Test Destination',
				enabled: true,
				subscribedEvents: ['n8n.workflow.success', 'n8n.audit'],
				anonymizeAuditMessages: true,
			});
		});

		it('should apply default values when options are missing', () => {
			const options: MessageEventBusDestinationOptions = {
				__type: MessageEventBusDestinationTypeNames.webhook,
				credentials: {},
			};

			const destination = new TestDestination(eventBus, options);
			const serialized = destination.serialize();

			expect(serialized.label).toBe('Log Destination');
			expect(serialized.enabled).toBe(false);
			expect(serialized.subscribedEvents).toEqual([]);
			expect(serialized.anonymizeAuditMessages).toBe(false);
		});
	});

	describe('toString', () => {
		it('should return JSON string of serialized destination', () => {
			const options: MessageEventBusDestinationOptions = {
				__type: MessageEventBusDestinationTypeNames.webhook,
				id: '12345678-1234-1234-1234-123456789abc',
				label: 'Test',
				enabled: true,
				subscribedEvents: ['*'],
				credentials: {},
				anonymizeAuditMessages: false,
			};

			const destination = new TestDestination(eventBus, options);
			const str = destination.toString();

			expect(str).toBe(JSON.stringify(destination.serialize()));
			expect(() => JSON.parse(str)).not.toThrow();
		});
	});

	describe('close', () => {
		it('should disable the destination', async () => {
			const options: MessageEventBusDestinationOptions = {
				__type: MessageEventBusDestinationTypeNames.webhook,
				label: 'Test',
				enabled: true,
				subscribedEvents: ['*'],
				credentials: {},
				anonymizeAuditMessages: false,
			};

			const destination = new TestDestination(eventBus, options);
			expect(destination.enabled).toBe(true);

			await destination.close();

			expect(destination.enabled).toBe(false);
		});
	});
});
