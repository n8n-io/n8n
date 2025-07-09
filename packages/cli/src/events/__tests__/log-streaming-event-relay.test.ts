import type { IWorkflowDb } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import type { INode, IRun, IWorkflowBase } from 'n8n-workflow';

import type { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { EventService } from '@/events/event.service';
import type { RelayEventMap } from '@/events/maps/relay.event-map';
import { LogStreamingEventRelay } from '@/events/relays/log-streaming.event-relay';

describe('LogStreamingEventRelay', () => {
	const eventBus = mock<MessageEventBus>();
	const eventService = new EventService();
	const hostId = 'host-xyz';
	const instanceSettings = mock<InstanceSettings>({ hostId });
	new LogStreamingEventRelay(eventService, eventBus, instanceSettings).init();

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

		it('should log on `workflow-archived` event', () => {
			const event: RelayEventMap['workflow-archived'] = {
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

			eventService.emit('workflow-archived', event);

			expect(eventBus.sendAuditEvent).toHaveBeenCalledWith({
				eventName: 'n8n.audit.workflow.archived',
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

		it('should log on `workflow-unarchived` event', () => {
			const event: RelayEventMap['workflow-unarchived'] = {
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

			eventService.emit('workflow-unarchived', event);

			expect(eventBus.sendAuditEvent).toHaveBeenCalledWith({
				eventName: 'n8n.audit.workflow.unarchived',
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

		it('should log job completion on `workflow-post-execute` for successful job', () => {
			const runData = mock<IRun>({
				finished: true,
				status: 'success',
				mode: 'manual',
				jobId: '12345',
				data: { resultData: {} },
			});

			const event = {
				executionId: 'exec-123',
				userId: 'user-456',
				workflow: mock<IWorkflowBase>({ id: 'wf-789', name: 'Test Workflow' }),
				runData,
			};

			eventService.emit('workflow-post-execute', event);

			expect(eventBus.sendQueueEvent).toHaveBeenCalledWith({
				eventName: 'n8n.queue.job.completed',
				payload: {
					executionId: 'exec-123',
					workflowId: 'wf-789',
					hostId: 'host-xyz',
					jobId: '12345',
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

		it('should log job failure on `workflow-post-execute` for failed job', () => {
			const runData = mock<IRun>({
				finished: false,
				status: 'error',
				mode: 'manual',
				jobId: '67890',
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
				executionId: 'exec-456',
				userId: 'user-789',
				workflow: mock<IWorkflowBase>({ id: 'wf-101', name: 'Failed Workflow' }),
				runData,
			};

			eventService.emit('workflow-post-execute', event);

			expect(eventBus.sendQueueEvent).toHaveBeenCalledWith({
				eventName: 'n8n.queue.job.failed',
				payload: {
					executionId: 'exec-456',
					workflowId: 'wf-101',
					hostId: 'host-xyz',
					jobId: '67890',
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
				nodeId: 'node2',
				nodeType: 'n8n-nodes-base.httpRequest',
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
					nodeId: 'node2',
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
				nodeId: 'node2',
				nodeType: 'n8n-nodes-base.httpResponse',
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
					nodeId: 'node2',
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
				type: 'production',
			};

			eventService.emit('execution-throttled', event);

			expect(eventBus.sendExecutionEvent).toHaveBeenCalledWith({
				eventName: 'n8n.execution.throttled',
				payload: {
					executionId: 'exec123456',
					type: 'production',
				},
			});
		});
	});

	describe('AI events', () => {
		it('should log on `ai-messages-retrieved-from-memory` event', () => {
			const payload: RelayEventMap['ai-messages-retrieved-from-memory'] = {
				msg: 'Hello, world!',
				executionId: 'exec789',
				nodeName: 'Memory',
				workflowId: 'wf123',
				workflowName: 'My Workflow',
				nodeType: 'n8n-nodes-base.memory',
			};

			eventService.emit('ai-messages-retrieved-from-memory', payload);

			expect(eventBus.sendAiNodeEvent).toHaveBeenCalledWith({
				eventName: 'n8n.ai.memory.get.messages',
				payload,
			});
		});

		it('should log on `ai-message-added-to-memory` event', () => {
			const payload: RelayEventMap['ai-message-added-to-memory'] = {
				msg: 'Test',
				executionId: 'exec456',
				nodeName: 'Memory',
				workflowId: 'wf789',
				workflowName: 'My Workflow',
				nodeType: 'n8n-nodes-base.memory',
			};

			eventService.emit('ai-message-added-to-memory', payload);

			expect(eventBus.sendAiNodeEvent).toHaveBeenCalledWith({
				eventName: 'n8n.ai.memory.added.message',
				payload,
			});
		});

		it('should log on `ai-output-parsed` event', () => {
			const payload: RelayEventMap['ai-output-parsed'] = {
				msg: 'Test',
				executionId: 'exec123',
				nodeName: 'Output Parser',
				workflowId: 'wf456',
				workflowName: 'My Workflow',
				nodeType: 'n8n-nodes-base.outputParser',
			};

			eventService.emit('ai-output-parsed', payload);

			expect(eventBus.sendAiNodeEvent).toHaveBeenCalledWith({
				eventName: 'n8n.ai.output.parser.parsed',
				payload,
			});
		});

		it('should log on `ai-documents-retrieved` event', () => {
			const payload: RelayEventMap['ai-documents-retrieved'] = {
				msg: 'Test',
				executionId: 'exec789',
				nodeName: 'Retriever',
				workflowId: 'wf123',
				workflowName: 'My Workflow',
				nodeType: 'n8n-nodes-base.retriever',
			};

			eventService.emit('ai-documents-retrieved', payload);

			expect(eventBus.sendAiNodeEvent).toHaveBeenCalledWith({
				eventName: 'n8n.ai.retriever.get.relevant.documents',
				payload,
			});
		});

		it('should log on `ai-document-embedded` event', () => {
			const payload: RelayEventMap['ai-document-embedded'] = {
				msg: 'Test',
				executionId: 'exec456',
				nodeName: 'Embeddings',
				workflowId: 'wf789',
				workflowName: 'My Workflow',
				nodeType: 'n8n-nodes-base.embeddings',
			};

			eventService.emit('ai-document-embedded', payload);

			expect(eventBus.sendAiNodeEvent).toHaveBeenCalledWith({
				eventName: 'n8n.ai.embeddings.embedded.document',
				payload,
			});
		});

		it('should log on `ai-query-embedded` event', () => {
			const payload: RelayEventMap['ai-query-embedded'] = {
				msg: 'Test',
				executionId: 'exec123',
				nodeName: 'Embeddings',
				workflowId: 'wf456',
				workflowName: 'My Workflow',
				nodeType: 'n8n-nodes-base.embeddings',
			};

			eventService.emit('ai-query-embedded', payload);

			expect(eventBus.sendAiNodeEvent).toHaveBeenCalledWith({
				eventName: 'n8n.ai.embeddings.embedded.query',
				payload,
			});
		});

		it('should log on `ai-document-processed` event', () => {
			const payload: RelayEventMap['ai-document-processed'] = {
				msg: 'Test',
				executionId: 'exec789',
				nodeName: 'Embeddings',
				workflowId: 'wf789',
				workflowName: 'My Workflow',
				nodeType: 'n8n-nodes-base.embeddings',
			};

			eventService.emit('ai-document-processed', payload);

			expect(eventBus.sendAiNodeEvent).toHaveBeenCalledWith({
				eventName: 'n8n.ai.document.processed',
				payload,
			});
		});

		it('should log on `ai-text-split` event', () => {
			const payload: RelayEventMap['ai-text-split'] = {
				msg: 'Test',
				executionId: 'exec456',
				nodeName: 'Text Splitter',
				workflowId: 'wf789',
				workflowName: 'My Workflow',
				nodeType: 'n8n-nodes-base.textSplitter',
			};

			eventService.emit('ai-text-split', payload);

			expect(eventBus.sendAiNodeEvent).toHaveBeenCalledWith({
				eventName: 'n8n.ai.text.splitter.split',
				payload,
			});
		});

		it('should log on `ai-tool-called` event', () => {
			const payload: RelayEventMap['ai-tool-called'] = {
				msg: 'Test',
				executionId: 'exec123',
				nodeName: 'Tool',
				workflowId: 'wf456',
				workflowName: 'My Workflow',
				nodeType: 'n8n-nodes-base.tool',
			};

			eventService.emit('ai-tool-called', payload);

			expect(eventBus.sendAiNodeEvent).toHaveBeenCalledWith({
				eventName: 'n8n.ai.tool.called',
				payload,
			});
		});

		it('should log on `ai-vector-store-searched` event', () => {
			const payload: RelayEventMap['ai-vector-store-searched'] = {
				msg: 'Test',
				executionId: 'exec789',
				nodeName: 'Vector Store',
				workflowId: 'wf123',
				workflowName: 'My Workflow',
				nodeType: 'n8n-nodes-base.vectorStore',
			};

			eventService.emit('ai-vector-store-searched', payload);

			expect(eventBus.sendAiNodeEvent).toHaveBeenCalledWith({
				eventName: 'n8n.ai.vector.store.searched',
				payload,
			});
		});

		it('should log on `ai-llm-generated-output` event', () => {
			const payload: RelayEventMap['ai-llm-generated-output'] = {
				msg: 'Test',
				executionId: 'exec456',
				nodeName: 'OpenAI',
				workflowId: 'wf789',
				workflowName: 'My Workflow',
				nodeType: 'n8n-nodes-base.openai',
			};

			eventService.emit('ai-llm-generated-output', payload);

			expect(eventBus.sendAiNodeEvent).toHaveBeenCalledWith({
				eventName: 'n8n.ai.llm.generated',
				payload,
			});
		});

		it('should log on `ai-llm-errored` event', () => {
			const payload: RelayEventMap['ai-llm-errored'] = {
				msg: 'Test',
				executionId: 'exec789',
				nodeName: 'OpenAI',
				workflowId: 'wf123',
				workflowName: 'My Workflow',
				nodeType: 'n8n-nodes-base.openai',
			};

			eventService.emit('ai-llm-errored', payload);

			expect(eventBus.sendAiNodeEvent).toHaveBeenCalledWith({
				eventName: 'n8n.ai.llm.error',
				payload,
			});
		});

		it('should log on `ai-vector-store-populated` event', () => {
			const payload: RelayEventMap['ai-vector-store-populated'] = {
				msg: 'Test',
				executionId: 'exec456',
				nodeName: 'Vector Store',
				workflowId: 'wf789',
				workflowName: 'My Workflow',
				nodeType: 'n8n-nodes-base.vectorStore',
			};

			eventService.emit('ai-vector-store-populated', payload);

			expect(eventBus.sendAiNodeEvent).toHaveBeenCalledWith({
				eventName: 'n8n.ai.vector.store.populated',
				payload,
			});
		});

		it('should log on `ai-vector-store-updated` event', () => {
			const payload: RelayEventMap['ai-vector-store-updated'] = {
				msg: 'Test',
				executionId: 'exec789',
				nodeName: 'Vector Store',
				workflowId: 'wf123',
				workflowName: 'My Workflow',
				nodeType: 'n8n-nodes-base.vectorStore',
			};

			eventService.emit('ai-vector-store-updated', payload);

			expect(eventBus.sendAiNodeEvent).toHaveBeenCalledWith({
				eventName: 'n8n.ai.vector.store.updated',
				payload,
			});
		});
	});

	describe('runner events', () => {
		it('should log on `runner-task-requested` event', () => {
			const event: RelayEventMap['runner-task-requested'] = {
				taskId: 't-1',
				nodeId: 'n-2',
				executionId: 'e-3',
				workflowId: 'w-4',
			};

			eventService.emit('runner-task-requested', event);

			expect(eventBus.sendRunnerEvent).toHaveBeenCalledWith({
				eventName: 'n8n.runner.task.requested',
				payload: {
					taskId: 't-1',
					nodeId: 'n-2',
					executionId: 'e-3',
					workflowId: 'w-4',
				},
			});
		});

		it('should log on `runner-response-received` event', () => {
			const event: RelayEventMap['runner-response-received'] = {
				taskId: 't-1',
				nodeId: 'n-2',
				executionId: 'e-3',
				workflowId: 'w-4',
			};

			eventService.emit('runner-response-received', event);

			expect(eventBus.sendRunnerEvent).toHaveBeenCalledWith({
				eventName: 'n8n.runner.response.received',
				payload: {
					taskId: 't-1',
					nodeId: 'n-2',
					executionId: 'e-3',
					workflowId: 'w-4',
				},
			});
		});
	});

	describe('job events', () => {
		it('should log on `job-enqueued` event', () => {
			const event: RelayEventMap['job-enqueued'] = {
				executionId: 'exec-1',
				workflowId: 'wf-2',
				hostId,
				jobId: 'job-4',
			};

			eventService.emit('job-enqueued', event);

			expect(eventBus.sendQueueEvent).toHaveBeenCalledWith({
				eventName: 'n8n.queue.job.enqueued',
				payload: {
					executionId: 'exec-1',
					workflowId: 'wf-2',
					hostId,
					jobId: 'job-4',
				},
			});
		});

		it('should log on `job-dequeued` event', () => {
			const event: RelayEventMap['job-dequeued'] = {
				executionId: 'exec-1',
				workflowId: 'wf-2',
				hostId,
				jobId: 'job-4',
			};

			eventService.emit('job-dequeued', event);

			expect(eventBus.sendQueueEvent).toHaveBeenCalledWith({
				eventName: 'n8n.queue.job.dequeued',
				payload: {
					executionId: 'exec-1',
					workflowId: 'wf-2',
					hostId,
					jobId: 'job-4',
				},
			});
		});

		it('should log on `job-stalled` event', () => {
			const event: RelayEventMap['job-stalled'] = {
				executionId: 'exec-1',
				workflowId: 'wf-2',
				hostId,
				jobId: 'job-4',
			};

			eventService.emit('job-stalled', event);

			expect(eventBus.sendQueueEvent).toHaveBeenCalledWith({
				eventName: 'n8n.queue.job.stalled',
				payload: {
					executionId: 'exec-1',
					workflowId: 'wf-2',
					hostId,
					jobId: 'job-4',
				},
			});
		});
	});
});
