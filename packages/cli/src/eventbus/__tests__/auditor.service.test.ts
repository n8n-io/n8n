import { mock } from 'jest-mock-extended';
import type { MessageEventBus } from '../MessageEventBus/MessageEventBus';
import { AuditorService } from '../auditor.service';
import type { AuditEventArgs } from '../audit.types';

describe('AuditorService', () => {
	const eventBus = mock<MessageEventBus>();
	const auditor = new AuditorService(eventBus);

	it('should handle `user-deleted` event', () => {
		const arg: AuditEventArgs['user-deleted'] = {
			user: {
				id: '123',
				email: 'test@example.com',
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
				user: {
					id: arg.user.id,
					email: undefined,
					firstName: undefined,
					lastName: undefined,
					role: arg.user.role,
				},
			},
		});
	});
});
