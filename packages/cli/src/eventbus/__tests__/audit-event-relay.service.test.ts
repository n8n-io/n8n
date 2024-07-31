import { mock } from 'jest-mock-extended';
import { AuditEventRelay } from '../audit-event-relay.service';
import type { MessageEventBus } from '../MessageEventBus/MessageEventBus';
import type { Event } from '../event.types';
import { EventService } from '../event.service';
import type { INode, IRun, IWorkflowBase } from 'n8n-workflow';

describe('AuditEventRelay', () => {
	const eventBus = mock<MessageEventBus>();
	const eventService = new EventService();
	const auditor = new AuditEventRelay(eventService, eventBus);
	auditor.init();

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('workflow events', () => {
		it('should log on `workflow-created` event', () => {
			const event: Event['workflow-created'] = {
				user: {
					id: '123',
					email: 'john@n8n.io',
					firstName: 'John',
					lastName: 'Doe',
					role: 'owner',
				},
				workflow: mock<IWorkflowBase>({
					id: 'wf123',
					name: 'Test Workflow',
				}),
			};

			eventService.emit('workflow-created', event);

			expect(eventBus.sendAuditEvent).toHaveBeenCalledWith({
				eventName: 'n8n.audit.workflow.created',
				payload: {
					userId: '123',
					_email: 'john@n8n.io',
					_firstName: 'John',
					_lastName: 'Doe',
					globalRole: 'owner',
					workflowId: 'wf123',
					workflowName: 'Test Workflow',
				},
			});
		});

		it('should log on `workflow-deleted` event', () => {
			const event: Event['workflow-deleted'] = {
				user: {
					id: '456',
					email: 'jane@n8n.io',
					firstName: 'Jane',
					lastName: 'Smith',
					role: 'user',
				},
				workflowId: 'wf789',
			};

			eventService.emit('workflow-deleted', event);

			expect(eventBus.sendAuditEvent).toHaveBeenCalledWith({
				eventName: 'n8n.audit.workflow.deleted',
				payload: {
					userId: '456',
					_email: 'jane@n8n.io',
					_firstName: 'Jane',
					_lastName: 'Smith',
					globalRole: 'user',
					workflowId: 'wf789',
				},
			});
		});

		it('should log on `workflow-saved` event', () => {
			const event: Event['workflow-saved'] = {
				user: {
					id: '789',
					email: 'alex@n8n.io',
					firstName: 'Alex',
					lastName: 'Johnson',
					role: 'editor',
				},
				workflowId: 'wf101',
				workflowName: 'Updated Workflow',
			};

			eventService.emit('workflow-saved', event);

			expect(eventBus.sendAuditEvent).toHaveBeenCalledWith({
				eventName: 'n8n.audit.workflow.updated',
				payload: {
					userId: '789',
					_email: 'alex@n8n.io',
					_firstName: 'Alex',
					_lastName: 'Johnson',
					globalRole: 'editor',
					workflowId: 'wf101',
					workflowName: 'Updated Workflow',
				},
			});
		});

		it('should log on `workflow-pre-execute` event', () => {
			const workflow = mock<IWorkflowBase>({
				id: 'wf202',
				name: 'Test Workflow',
				active: true,
				nodes: [],
				connections: {},
				staticData: undefined,
				settings: {},
			});

			const event: Event['workflow-pre-execute'] = {
				executionId: 'exec123',
				data: workflow,
			};

			eventService.emit('workflow-pre-execute', event);

			expect(eventBus.sendWorkflowEvent).toHaveBeenCalledWith({
				eventName: 'n8n.workflow.started',
				payload: {
					executionId: 'exec123',
					userId: undefined,
					workflowId: 'wf202',
					isManual: false,
					workflowName: 'Test Workflow',
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

	describe('user events', () => {
		it('should log on `user-updated` event', () => {
			const event: Event['user-updated'] = {
				user: {
					id: 'user456',
					email: 'updated@example.com',
					firstName: 'Updated',
					lastName: 'User',
					role: 'global:member',
				},
				fieldsChanged: ['firstName', 'lastName', 'password'],
			};

			eventService.emit('user-updated', event);

			expect(eventBus.sendAuditEvent).toHaveBeenCalledWith({
				eventName: 'n8n.audit.user.updated',
				payload: {
					userId: 'user456',
					_email: 'updated@example.com',
					_firstName: 'Updated',
					_lastName: 'User',
					globalRole: 'global:member',
					fieldsChanged: ['firstName', 'lastName', 'password'],
				},
			});
		});

		it('should log on `user-deleted` event', () => {
			const event: Event['user-deleted'] = {
				user: {
					id: '123',
					email: 'john@n8n.io',
					firstName: 'John',
					lastName: 'Doe',
					role: 'some-role',
				},
			};

			eventService.emit('user-deleted', event);

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
	});

	describe('click events', () => {
		it('should log on `user-password-reset-request-click` event', () => {
			const event: Event['user-password-reset-request-click'] = {
				user: {
					id: 'user101',
					email: 'user101@example.com',
					firstName: 'John',
					lastName: 'Doe',
					role: 'global:member',
				},
			};

			eventService.emit('user-password-reset-request-click', event);

			expect(eventBus.sendAuditEvent).toHaveBeenCalledWith({
				eventName: 'n8n.audit.user.reset.requested',
				payload: {
					userId: 'user101',
					_email: 'user101@example.com',
					_firstName: 'John',
					_lastName: 'Doe',
					globalRole: 'global:member',
				},
			});
		});

		it('should log on `user-invite-email-click` event', () => {
			const event: Event['user-invite-email-click'] = {
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

			eventService.emit('user-invite-email-click', event);

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

	describe('node events', () => {
		it('should log on `node-pre-execute` event', () => {
			const workflow = mock<IWorkflowBase>({
				id: 'wf303',
				name: 'Test Workflow with Nodes',
				active: true,
				nodes: [
					{
						id: 'node1',
						name: 'Start Node',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [100, 200],
					},
					{
						id: 'node2',
						name: 'HTTP Request',
						type: 'n8n-nodes-base.httpRequest',
						typeVersion: 1,
						position: [300, 200],
					},
				],
				connections: {},
				settings: {},
			});

			const event: Event['node-pre-execute'] = {
				executionId: 'exec456',
				nodeName: 'HTTP Request',
				workflow,
			};

			eventService.emit('node-pre-execute', event);

			expect(eventBus.sendNodeEvent).toHaveBeenCalledWith({
				eventName: 'n8n.node.started',
				payload: {
					executionId: 'exec456',
					nodeName: 'HTTP Request',
					workflowId: 'wf303',
					workflowName: 'Test Workflow with Nodes',
					nodeType: 'n8n-nodes-base.httpRequest',
				},
			});
		});

		it('should log on `node-post-execute` event', () => {
			const workflow = mock<IWorkflowBase>({
				id: 'wf404',
				name: 'Test Workflow with Completed Node',
				active: true,
				nodes: [
					{
						id: 'node1',
						name: 'Start Node',
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						position: [100, 200],
					},
					{
						id: 'node2',
						name: 'HTTP Response',
						type: 'n8n-nodes-base.httpResponse',
						typeVersion: 1,
						position: [300, 200],
					},
				],
				connections: {},
				settings: {},
			});

			const event: Event['node-post-execute'] = {
				executionId: 'exec789',
				nodeName: 'HTTP Response',
				workflow,
			};

			eventService.emit('node-post-execute', event);

			expect(eventBus.sendNodeEvent).toHaveBeenCalledWith({
				eventName: 'n8n.node.finished',
				payload: {
					executionId: 'exec789',
					nodeName: 'HTTP Response',
					workflowId: 'wf404',
					workflowName: 'Test Workflow with Completed Node',
					nodeType: 'n8n-nodes-base.httpResponse',
				},
			});
		});
	});

	describe('credentials events', () => {
		it('should log on `credentials-shared` event', () => {
			const event: Event['credentials-shared'] = {
				user: {
					id: 'user123',
					email: 'sharer@example.com',
					firstName: 'Alice',
					lastName: 'Sharer',
					role: 'global:owner',
				},
				credentialId: 'cred789',
				credentialType: 'githubApi',
				userIdSharer: 'user123',
				userIdsShareesAdded: ['user456', 'user789'],
				shareesRemoved: null,
			};

			eventService.emit('credentials-shared', event);

			expect(eventBus.sendAuditEvent).toHaveBeenCalledWith({
				eventName: 'n8n.audit.user.credentials.shared',
				payload: {
					userId: 'user123',
					_email: 'sharer@example.com',
					_firstName: 'Alice',
					_lastName: 'Sharer',
					globalRole: 'global:owner',
					credentialId: 'cred789',
					credentialType: 'githubApi',
					userIdSharer: 'user123',
					userIdsShareesAdded: ['user456', 'user789'],
					shareesRemoved: null,
				},
			});
		});

		it('should log on `credentials-created` event', () => {
			const event: Event['credentials-created'] = {
				user: {
					id: 'user123',
					email: 'user@example.com',
					firstName: 'Test',
					lastName: 'User',
					role: 'global:owner',
				},
				credentialType: 'githubApi',
				credentialId: 'cred456',
				publicApi: false,
				projectId: 'proj789',
				projectType: 'Personal',
			};

			eventService.emit('credentials-created', event);

			expect(eventBus.sendAuditEvent).toHaveBeenCalledWith({
				eventName: 'n8n.audit.user.credentials.created',
				payload: {
					userId: 'user123',
					_email: 'user@example.com',
					_firstName: 'Test',
					_lastName: 'User',
					globalRole: 'global:owner',
					credentialType: 'githubApi',
					credentialId: 'cred456',
					publicApi: false,
					projectId: 'proj789',
					projectType: 'Personal',
				},
			});
		});
	});

	describe('auth events', () => {
		it('should log on `user-login-failed` event', () => {
			const event: Event['user-login-failed'] = {
				userEmail: 'user@example.com',
				authenticationMethod: 'email',
				reason: 'Invalid password',
			};

			eventService.emit('user-login-failed', event);

			expect(eventBus.sendAuditEvent).toHaveBeenCalledWith({
				eventName: 'n8n.audit.user.login.failed',
				payload: {
					userEmail: 'user@example.com',
					authenticationMethod: 'email',
					reason: 'Invalid password',
				},
			});
		});
	});

	describe('community package events', () => {
		it('should log on `community-package-updated` event', () => {
			const event: Event['community-package-updated'] = {
				user: {
					id: 'user202',
					email: 'packageupdater@example.com',
					firstName: 'Package',
					lastName: 'Updater',
					role: 'global:admin',
				},
				packageName: 'n8n-nodes-awesome-package',
				packageVersionCurrent: '1.0.0',
				packageVersionNew: '1.1.0',
				packageNodeNames: ['AwesomeNode1', 'AwesomeNode2'],
				packageAuthor: 'Jane Doe',
				packageAuthorEmail: 'jane@example.com',
			};

			eventService.emit('community-package-updated', event);

			expect(eventBus.sendAuditEvent).toHaveBeenCalledWith({
				eventName: 'n8n.audit.package.updated',
				payload: {
					userId: 'user202',
					_email: 'packageupdater@example.com',
					_firstName: 'Package',
					_lastName: 'Updater',
					globalRole: 'global:admin',
					packageName: 'n8n-nodes-awesome-package',
					packageVersionCurrent: '1.0.0',
					packageVersionNew: '1.1.0',
					packageNodeNames: ['AwesomeNode1', 'AwesomeNode2'],
					packageAuthor: 'Jane Doe',
					packageAuthorEmail: 'jane@example.com',
				},
			});
		});

		it('should log on `community-package-installed` event', () => {
			const event: Event['community-package-installed'] = {
				user: {
					id: 'user789',
					email: 'admin@example.com',
					firstName: 'Admin',
					lastName: 'User',
					role: 'global:admin',
				},
				inputString: 'n8n-nodes-custom-package',
				packageName: 'n8n-nodes-custom-package',
				success: true,
				packageVersion: '1.0.0',
				packageNodeNames: ['CustomNode1', 'CustomNode2'],
				packageAuthor: 'John Doe',
				packageAuthorEmail: 'john@example.com',
			};

			eventService.emit('community-package-installed', event);

			expect(eventBus.sendAuditEvent).toHaveBeenCalledWith({
				eventName: 'n8n.audit.package.installed',
				payload: {
					userId: 'user789',
					_email: 'admin@example.com',
					_firstName: 'Admin',
					_lastName: 'User',
					globalRole: 'global:admin',
					inputString: 'n8n-nodes-custom-package',
					packageName: 'n8n-nodes-custom-package',
					success: true,
					packageVersion: '1.0.0',
					packageNodeNames: ['CustomNode1', 'CustomNode2'],
					packageAuthor: 'John Doe',
					packageAuthorEmail: 'john@example.com',
				},
			});
		});
	});

	describe('email events', () => {
		it('should log on `email-failed` event', () => {
			const event: Event['email-failed'] = {
				user: {
					id: 'user789',
					email: 'recipient@example.com',
					firstName: 'Failed',
					lastName: 'Recipient',
					role: 'global:member',
				},
				messageType: 'New user invite',
			};

			eventService.emit('email-failed', event);

			expect(eventBus.sendAuditEvent).toHaveBeenCalledWith({
				eventName: 'n8n.audit.user.email.failed',
				payload: {
					userId: 'user789',
					_email: 'recipient@example.com',
					_firstName: 'Failed',
					_lastName: 'Recipient',
					globalRole: 'global:member',
					messageType: 'New user invite',
				},
			});
		});
	});

	describe('public API events', () => {
		it('should log on `public-api-key-created` event', () => {
			const event: Event['public-api-key-created'] = {
				user: {
					id: 'user101',
					email: 'apiuser@example.com',
					firstName: 'API',
					lastName: 'User',
					role: 'global:owner',
				},
				publicApi: true,
			};

			eventService.emit('public-api-key-created', event);

			expect(eventBus.sendAuditEvent).toHaveBeenCalledWith({
				eventName: 'n8n.audit.user.api.created',
				payload: {
					userId: 'user101',
					_email: 'apiuser@example.com',
					_firstName: 'API',
					_lastName: 'User',
					globalRole: 'global:owner',
				},
			});
		});
	});

	describe('execution events', () => {
		it('should log on `execution-throttled` event', () => {
			const event: Event['execution-throttled'] = {
				executionId: 'exec123456',
			};

			eventService.emit('execution-throttled', event);

			expect(eventBus.sendExecutionEvent).toHaveBeenCalledWith({
				eventName: 'n8n.execution.throttled',
				payload: {
					executionId: 'exec123456',
				},
			});
		});
	});
});
