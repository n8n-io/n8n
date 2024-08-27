import { mock } from 'jest-mock-extended';
import { LogStreamingEventRelay } from '@/events/log-streaming-event-relay';
import { EventService } from '@/events/event.service';
import type { INode, IRun, IWorkflowBase } from 'n8n-workflow';
import type { IWorkflowDb } from '@/Interfaces';
import type { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import type { RelayEventMap } from '@/events/relay-event-map';

describe('LogStreamingEventRelay', () => {
	const eventBus = mock<MessageEventBus>();
	const eventService = new EventService();
	new LogStreamingEventRelay(eventService, eventBus).init();

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('workflow events', () => {
		it('should log on `workflow-created` event', () => {
			const event: RelayEventMap['workflow-created'] = {
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
				publicApi: false,
				projectId: 'proj123',
				projectType: 'personal',
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
			const event: RelayEventMap['workflow-deleted'] = {
				user: {
					id: '456',
					email: 'jane@n8n.io',
					firstName: 'Jane',
					lastName: 'Smith',
					role: 'user',
				},
				workflowId: 'wf789',
				publicApi: false,
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
			const event: RelayEventMap['workflow-saved'] = {
				user: {
					id: '789',
					email: 'alex@n8n.io',
					firstName: 'Alex',
					lastName: 'Johnson',
					role: 'editor',
				},
				workflow: mock<IWorkflowDb>({ id: 'wf101', name: 'Updated Workflow' }),
				publicApi: false,
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

			const event: RelayEventMap['workflow-pre-execute'] = {
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
			const payload = mock<RelayEventMap['workflow-post-execute']>({
				executionId: 'some-id',
				userId: 'some-id',
				workflow: mock<IWorkflowBase>({ id: 'some-id', name: 'some-name' }),
				runData: mock<IRun>({
					finished: true,
					status: 'success',
					mode: 'manual',
					data: { resultData: {} },
				}),
			});

			eventService.emit('workflow-post-execute', payload);

			const { runData: _, workflow: __, ...rest } = payload;

			expect(eventBus.sendWorkflowEvent).toHaveBeenCalledWith({
				eventName: 'n8n.workflow.success',
				payload: {
					...rest,
					success: true, // same as finished
					isManual: true,
					workflowName: 'some-name',
					workflowId: 'some-id',
				},
			});
		});

		it('should log on `workflow-post-execute` event for failed execution', () => {
			const runData = mock<IRun>({
				status: 'error',
				mode: 'manual',
				finished: false,
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
				userId: 'some-id',
				workflow: mock<IWorkflowBase>({ id: 'some-id', name: 'some-name' }),
				runData,
			};

			eventService.emit('workflow-post-execute', event);

			const { runData: _, workflow: __, ...rest } = event;

			expect(eventBus.sendWorkflowEvent).toHaveBeenCalledWith({
				eventName: 'n8n.workflow.failed',
				payload: {
					...rest,
					success: false, // same as finished
					isManual: true,
					workflowName: 'some-name',
					workflowId: 'some-id',
					lastNodeExecuted: 'some-node',
					errorNodeType: 'some-type',
					errorMessage: 'some-message',
				},
			});
		});
	});

	describe('user events', () => {
		it('should log on `user-updated` event', () => {
			const event: RelayEventMap['user-updated'] = {
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
			const event: RelayEventMap['user-deleted'] = {
				user: {
					id: '123',
					email: 'john@n8n.io',
					firstName: 'John',
					lastName: 'Doe',
					role: 'some-role',
				},
				targetUserOldStatus: 'active',
				publicApi: false,
				migrationStrategy: 'transfer_data',
				targetUserId: '456',
				migrationUserId: '789',
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

		it('should log on `user-invited` event', () => {
			const event: RelayEventMap['user-invited'] = {
				user: {
					id: 'user101',
					email: 'inviter@example.com',
					firstName: 'Inviter',
					lastName: 'User',
					role: 'global:owner',
				},
				targetUserId: ['newUser123'],
				publicApi: false,
				emailSent: true,
				inviteeRole: 'global:member',
			};

			eventService.emit('user-invited', event);

			expect(eventBus.sendAuditEvent).toHaveBeenCalledWith({
				eventName: 'n8n.audit.user.invited',
				payload: {
					userId: 'user101',
					_email: 'inviter@example.com',
					_firstName: 'Inviter',
					_lastName: 'User',
					globalRole: 'global:owner',
					targetUserId: ['newUser123'],
				},
			});
		});

		it('should log on `user-reinvited` event', () => {
			const event: RelayEventMap['user-reinvited'] = {
				user: {
					id: 'user202',
					email: 'reinviter@example.com',
					firstName: 'Reinviter',
					lastName: 'User',
					role: 'global:admin',
				},
				targetUserId: ['existingUser456'],
			};

			eventService.emit('user-reinvited', event);

			expect(eventBus.sendAuditEvent).toHaveBeenCalledWith({
				eventName: 'n8n.audit.user.reinvited',
				payload: {
					userId: 'user202',
					_email: 'reinviter@example.com',
					_firstName: 'Reinviter',
					_lastName: 'User',
					globalRole: 'global:admin',
					targetUserId: ['existingUser456'],
				},
			});
		});

		it('should log on `user-signed-up` event', () => {
			const event: RelayEventMap['user-signed-up'] = {
				user: {
					id: 'user303',
					email: 'newuser@example.com',
					firstName: 'New',
					lastName: 'User',
					role: 'global:member',
				},
				userType: 'email',
				wasDisabledLdapUser: false,
			};

			eventService.emit('user-signed-up', event);

			expect(eventBus.sendAuditEvent).toHaveBeenCalledWith({
				eventName: 'n8n.audit.user.signedup',
				payload: {
					userId: 'user303',
					_email: 'newuser@example.com',
					_firstName: 'New',
					_lastName: 'User',
					globalRole: 'global:member',
				},
			});
		});

		it('should log on `user-logged-in` event', () => {
			const event: RelayEventMap['user-logged-in'] = {
				user: {
					id: 'user404',
					email: 'loggedin@example.com',
					firstName: 'Logged',
					lastName: 'In',
					role: 'global:owner',
				},
				authenticationMethod: 'email',
			};

			eventService.emit('user-logged-in', event);

			expect(eventBus.sendAuditEvent).toHaveBeenCalledWith({
				eventName: 'n8n.audit.user.login.success',
				payload: {
					userId: 'user404',
					_email: 'loggedin@example.com',
					_firstName: 'Logged',
					_lastName: 'In',
					globalRole: 'global:owner',
					authenticationMethod: 'email',
				},
			});
		});
	});

	describe('click events', () => {
		it('should log on `user-password-reset-request-click` event', () => {
			const event: RelayEventMap['user-password-reset-request-click'] = {
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
			const event: RelayEventMap['user-invite-email-click'] = {
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

		it('should log on `user-password-reset-email-click` event', () => {
			const event: RelayEventMap['user-password-reset-email-click'] = {
				user: {
					id: 'user505',
					email: 'resetuser@example.com',
					firstName: 'Reset',
					lastName: 'User',
					role: 'global:member',
				},
			};

			eventService.emit('user-password-reset-email-click', event);

			expect(eventBus.sendAuditEvent).toHaveBeenCalledWith({
				eventName: 'n8n.audit.user.reset',
				payload: {
					userId: 'user505',
					_email: 'resetuser@example.com',
					_firstName: 'Reset',
					_lastName: 'User',
					globalRole: 'global:member',
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

			const event: RelayEventMap['node-pre-execute'] = {
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

			const event: RelayEventMap['node-post-execute'] = {
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
			const event: RelayEventMap['credentials-shared'] = {
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
			const event: RelayEventMap['credentials-created'] = {
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

		it('should log on `credentials-deleted` event', () => {
			const event: RelayEventMap['credentials-deleted'] = {
				user: {
					id: 'user707',
					email: 'creduser@example.com',
					firstName: 'Cred',
					lastName: 'User',
					role: 'global:owner',
				},
				credentialId: 'cred789',
				credentialType: 'githubApi',
			};

			eventService.emit('credentials-deleted', event);

			expect(eventBus.sendAuditEvent).toHaveBeenCalledWith({
				eventName: 'n8n.audit.user.credentials.deleted',
				payload: {
					userId: 'user707',
					_email: 'creduser@example.com',
					_firstName: 'Cred',
					_lastName: 'User',
					globalRole: 'global:owner',
					credentialId: 'cred789',
					credentialType: 'githubApi',
				},
			});
		});

		it('should log on `credentials-updated` event', () => {
			const event: RelayEventMap['credentials-updated'] = {
				user: {
					id: 'user808',
					email: 'updatecred@example.com',
					firstName: 'Update',
					lastName: 'Cred',
					role: 'global:owner',
				},
				credentialId: 'cred101',
				credentialType: 'slackApi',
			};

			eventService.emit('credentials-updated', event);

			expect(eventBus.sendAuditEvent).toHaveBeenCalledWith({
				eventName: 'n8n.audit.user.credentials.updated',
				payload: {
					userId: 'user808',
					_email: 'updatecred@example.com',
					_firstName: 'Update',
					_lastName: 'Cred',
					globalRole: 'global:owner',
					credentialId: 'cred101',
					credentialType: 'slackApi',
				},
			});
		});
	});

	describe('auth events', () => {
		it('should log on `user-login-failed` event', () => {
			const event: RelayEventMap['user-login-failed'] = {
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
			const event: RelayEventMap['community-package-updated'] = {
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
			const event: RelayEventMap['community-package-installed'] = {
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

		it('should log on `community-package-deleted` event', () => {
			const event: RelayEventMap['community-package-deleted'] = {
				user: {
					id: 'user909',
					email: 'packagedeleter@example.com',
					firstName: 'Package',
					lastName: 'Deleter',
					role: 'global:admin',
				},
				packageName: 'n8n-nodes-awesome-package',
				packageVersion: '1.0.0',
				packageNodeNames: ['AwesomeNode1', 'AwesomeNode2'],
				packageAuthor: 'John Doe',
				packageAuthorEmail: 'john@example.com',
			};

			eventService.emit('community-package-deleted', event);

			expect(eventBus.sendAuditEvent).toHaveBeenCalledWith({
				eventName: 'n8n.audit.package.deleted',
				payload: {
					userId: 'user909',
					_email: 'packagedeleter@example.com',
					_firstName: 'Package',
					_lastName: 'Deleter',
					globalRole: 'global:admin',
					packageName: 'n8n-nodes-awesome-package',
					packageVersion: '1.0.0',
					packageNodeNames: ['AwesomeNode1', 'AwesomeNode2'],
					packageAuthor: 'John Doe',
					packageAuthorEmail: 'john@example.com',
				},
			});
		});
	});

	describe('email events', () => {
		it('should log on `email-failed` event', () => {
			const event: RelayEventMap['email-failed'] = {
				user: {
					id: 'user789',
					email: 'recipient@example.com',
					firstName: 'Failed',
					lastName: 'Recipient',
					role: 'global:member',
				},
				messageType: 'New user invite',
				publicApi: false,
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
			const event: RelayEventMap['public-api-key-created'] = {
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

		it('should log on `public-api-key-deleted` event', () => {
			const event: RelayEventMap['public-api-key-deleted'] = {
				user: {
					id: 'user606',
					email: 'apiuser@example.com',
					firstName: 'API',
					lastName: 'User',
					role: 'global:owner',
				},
				publicApi: true,
			};

			eventService.emit('public-api-key-deleted', event);

			expect(eventBus.sendAuditEvent).toHaveBeenCalledWith({
				eventName: 'n8n.audit.user.api.deleted',
				payload: {
					userId: 'user606',
					_email: 'apiuser@example.com',
					_firstName: 'API',
					_lastName: 'User',
					globalRole: 'global:owner',
				},
			});
		});
	});

	describe('execution events', () => {
		it('should log on `execution-started-during-bootup` event', () => {
			const event: RelayEventMap['execution-started-during-bootup'] = {
				executionId: 'exec101010',
			};

			eventService.emit('execution-started-during-bootup', event);

			expect(eventBus.sendExecutionEvent).toHaveBeenCalledWith({
				eventName: 'n8n.execution.started-during-bootup',
				payload: {
					executionId: 'exec101010',
				},
			});
		});

		it('should log on `execution-throttled` event', () => {
			const event: RelayEventMap['execution-throttled'] = {
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
