import { mock } from 'jest-mock-extended';
import type { MessageEventBus } from '../MessageEventBus/MessageEventBus';
import { AuditorService } from '../auditor.service';
import type { AuditEventArgs } from '../audit.types';

describe('AuditorService', () => {
	const eventBus = mock<MessageEventBus>();
	const auditor = new AuditorService(eventBus);

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should handle `user-deleted` event', () => {
		const arg: AuditEventArgs['user-deleted'] = {
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
		const arg: AuditEventArgs['user-invite-email-click'] = {
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
