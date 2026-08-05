import { mockInstance } from '@n8n/backend-test-utils';
import { MessageEventBusDestinationTypeNames } from 'n8n-workflow';

import type { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';

import { AuditLogEventRepository } from '../../database/repositories/audit-log-event.repository';
import { MessageEventBusDestinationDatabase } from '../message-event-bus-destination-database.ee';

const mockEventBus = {} as MessageEventBus;

const createMessage = () =>
	({
		id: 'event-1',
		eventName: 'n8n.audit.user.login.success',
		message: 'user logged in',
		ts: { toJSDate: () => new Date('2020-01-01T00:00:00.000Z') },
		payload: { userId: 'u1' },
		anonymize: () => ({ anonymized: true }),
	}) as any;

const buildDestination = () =>
	new MessageEventBusDestinationDatabase(mockEventBus, {
		__type: MessageEventBusDestinationTypeNames.database,
		enabled: true,
		subscribedEvents: ['*'],
	});

describe('MessageEventBusDestinationDatabase', () => {
	let repository: ReturnType<typeof mockInstance<AuditLogEventRepository>>;

	beforeEach(() => {
		vi.clearAllMocks();
		repository = mockInstance(AuditLogEventRepository);
		repository.create.mockImplementation((row) => row as never);
	});

	it('should persist the mapped event and confirm delivery', async () => {
		const confirmCallback = vi.fn();
		const destination = buildDestination();

		const result = await destination.receiveFromEventBus({
			msg: createMessage(),
			confirmCallback,
		} as any);

		expect(result).toBe(true);
		expect(repository.store).toHaveBeenCalledWith({
			id: 'event-1',
			eventName: 'n8n.audit.user.login.success',
			message: 'user logged in',
			ts: new Date('2020-01-01T00:00:00.000Z'),
			payload: { userId: 'u1' },
		});
		expect(confirmCallback).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'event-1' }),
			expect.objectContaining({ name: 'Audit Log Database' }),
		);
	});

	it('should store the anonymized payload when anonymization is enabled', async () => {
		const destination = new MessageEventBusDestinationDatabase(mockEventBus, {
			__type: MessageEventBusDestinationTypeNames.database,
			enabled: true,
			subscribedEvents: ['*'],
			anonymizeAuditMessages: true,
		});

		await destination.receiveFromEventBus({
			msg: createMessage(),
			confirmCallback: vi.fn(),
		} as any);

		expect(repository.store).toHaveBeenCalledWith(
			expect.objectContaining({ payload: { anonymized: true } }),
		);
	});
});
