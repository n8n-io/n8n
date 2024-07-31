import { mock } from 'jest-mock-extended';
import { AuditEventRelay } from '../audit-event-relay.service';
import type { MessageEventBus } from '../MessageEventBus/MessageEventBus';
import type { Event } from '../event.types';
import { EventService } from '../event.service';
import type { INode, IRun } from 'n8n-workflow';

describe('AuditorService', () => {
	const eventBus = mock<MessageEventBus>();
	const eventService = new EventService();
	const auditor = new AuditEventRelay(eventService, eventBus);
	auditor.init();

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

	it('should log on `workflow-post-execute` for successful execution', () => {
		const payload = mock<Event['workflow-post-execute']>({
			executionId: 'some-id',
			success: true,
			userId: 'some-id',
			workflowId: 'some-id',
			isManual: true,
			workflowName: 'some-name',
			metadata: {},
			runData: mock<IRun>({ data: { resultData: {} } }),
		});

		eventService.emit('workflow-post-execute', payload);

		const { runData: _, ...rest } = payload;

		expect(eventBus.sendWorkflowEvent).toHaveBeenCalledWith({
			eventName: 'n8n.workflow.success',
			payload: rest,
		});
	});

	it('should handle `workflow-post-execute` event for unsuccessful execution', () => {
		const runData = mock<IRun>({
			data: {
				resultData: {
					lastNodeExecuted: 'some-node',
					// @ts-expect-error Partial mock
					error: {
						node: mock<INode>({ type: 'some-type' }),
						message: 'some-message',
					},
					errorMessage: 'some-message',
				},
			},
		}) as unknown as IRun;

		const event = {
			executionId: 'some-id',
			success: false,
			userId: 'some-id',
			workflowId: 'some-id',
			isManual: true,
			workflowName: 'some-name',
			metadata: {},
			runData,
		};

		eventService.emit('workflow-post-execute', event);

		const { runData: _, ...rest } = event;

		expect(eventBus.sendWorkflowEvent).toHaveBeenCalledWith({
			eventName: 'n8n.workflow.failed',
			payload: {
				...rest,
				lastNodeExecuted: 'some-node',
				errorNodeType: 'some-type',
				errorMessage: 'some-message',
			},
		});
	});
});
