import { mock } from 'jest-mock-extended';
import { AuditEventRelay } from '../audit-event-relay.service';
import type { MessageEventBus } from '../MessageEventBus/MessageEventBus';
import type { Event } from '../event.types';
import type { EventRelay } from '../event-relay.service';

describe('AuditorService', () => {
	const eventBus = mock<MessageEventBus>();
	const eventRelay = mock<EventRelay>();
	const auditor = new AuditEventRelay(eventRelay, eventBus);

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should handle `user-deleted` event', () => {
		const arg: Event['user-deleted'] = {
			user: {
				id: '123',
				email: 'john@n8n.io',
				firstName: 'John',
				lastName: 'Doe',
				role: 'some-role',
			},
		};

		// @ts-expect-error Private method
		auditor.userDeleted(arg);

		expect(eventBus.sendAuditEvent).toHaveBeenCalledWith({
			eventName: 'n8n.audit.user.deleted',
			payload: {
				userId: '123',
				_email: 'john@n8n.io',
				_firstName: 'John',
				_lastName: 'Doe',
				globalRole: 'some-role',
			},
		});
	});

	it('should handle `user-invite-email-click` event', () => {
		const arg: Event['user-invite-email-click'] = {
			inviter: {
				id: '123',
				email: 'john@n8n.io',
				firstName: 'John',
				lastName: 'Doe',
				role: 'some-role',
			},
			invitee: {
				id: '456',
				email: 'jane@n8n.io',
				firstName: 'Jane',
				lastName: 'Doe',
				role: 'some-other-role',
			},
		};

		// @ts-expect-error Private method
		auditor.userInviteEmailClick(arg);

		expect(eventBus.sendAuditEvent).toHaveBeenCalledWith({
			eventName: 'n8n.audit.user.invitation.accepted',
			payload: {
				inviter: {
					userId: '123',
					_email: 'john@n8n.io',
					_firstName: 'John',
					_lastName: 'Doe',
					globalRole: 'some-role',
				},
				invitee: {
					userId: '456',
					_email: 'jane@n8n.io',
					_firstName: 'Jane',
					_lastName: 'Doe',
					globalRole: 'some-other-role',
				},
			},
		});
	});
});
