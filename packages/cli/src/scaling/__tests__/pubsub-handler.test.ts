import type { WorkerStatus } from '@n8n/api-types';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import type { IWorkflowBase, Workflow } from 'n8n-workflow';

import type { ActiveWorkflowManager } from '@/active-workflow-manager';
import type { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import type { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { EventService } from '@/events/event.service';
import type { ExternalSecretsManager } from '@/external-secrets.ee/external-secrets-manager.ee';
import type { License } from '@/license';
import type { Push } from '@/push';
import type { CommunityPackagesService } from '@/services/community-packages.service';
import type { TestWebhooks } from '@/webhooks/test-webhooks';

import type { Publisher } from '../pubsub/publisher.service';
import { PubSubHandler } from '../pubsub/pubsub-handler';
import type { WorkerStatusService } from '../worker-status.service.ee';

const flushPromises = async () => await new Promise((resolve) => setImmediate(resolve));

describe('PubSubHandler', () => {
	const eventService = new EventService();
	const license = mock<License>();
	const eventbus = mock<MessageEventBus>();
	const externalSecretsManager = mock<ExternalSecretsManager>();
	const communityPackagesService = mock<CommunityPackagesService>();
	const publisher = mock<Publisher>();
	const workerStatusService = mock<WorkerStatusService>();
	const activeWorkflowManager = mock<ActiveWorkflowManager>();
	const push = mock<Push>();
	const workflowRepository = mock<WorkflowRepository>();
	const testWebhooks = mock<TestWebhooks>();

	afterEach(() => {
		eventService.removeAllListeners();
	});

	describe('in webhook process', () => {
		const instanceSettings = mock<InstanceSettings>({ instanceType: 'webhook' });

		it('should set up handlers in webhook process', () => {
			// @ts-expect-error Spying on private method
			const setupHandlers = jest.spyOn(PubSubHandler.prototype, 'setupHandlers');

			new PubSubHandler(
				eventService,
				instanceSettings,
				license,
				eventbus,
				externalSecretsManager,
				communityPackagesService,
				publisher,
				workerStatusService,
				activeWorkflowManager,
				push,
				workflowRepository,
				testWebhooks,
			).init();

			expect(setupHandlers).toHaveBeenCalledWith({
				'reload-license': expect.any(Function),
				'restart-event-bus': expect.any(Function),
				'reload-external-secrets-providers': expect.any(Function),
				'community-package-install': expect.any(Function),
				'community-package-update': expect.any(Function),
				'community-package-uninstall': expect.any(Function),
			});
		});

		it('should reload license on `reload-license` event', () => {
			new PubSubHandler(
				eventService,
				instanceSettings,
				license,
				eventbus,
				externalSecretsManager,
				communityPackagesService,
				publisher,
				workerStatusService,
				activeWorkflowManager,
				push,
				workflowRepository,
				testWebhooks,
			).init();

			eventService.emit('reload-license');

			expect(license.reload).toHaveBeenCalled();
		});

		it('should restart event bus on `restart-event-bus` event', () => {
			new PubSubHandler(
				eventService,
				instanceSettings,
				license,
				eventbus,
				externalSecretsManager,
				communityPackagesService,
				publisher,
				workerStatusService,
				activeWorkflowManager,
				push,
				workflowRepository,
				testWebhooks,
			).init();

			eventService.emit('restart-event-bus');

			expect(eventbus.restart).toHaveBeenCalled();
		});

		it('should reload providers on `reload-external-secrets-providers` event', () => {
			new PubSubHandler(
				eventService,
				instanceSettings,
				license,
				eventbus,
				externalSecretsManager,
				communityPackagesService,
				publisher,
				workerStatusService,
				activeWorkflowManager,
				push,
				workflowRepository,
				testWebhooks,
			).init();

			eventService.emit('reload-external-secrets-providers');

			expect(externalSecretsManager.reloadAllProviders).toHaveBeenCalled();
		});

		it('should install community package on `community-package-install` event', () => {
			new PubSubHandler(
				eventService,
				instanceSettings,
				license,
				eventbus,
				externalSecretsManager,
				communityPackagesService,
				publisher,
				workerStatusService,
				activeWorkflowManager,
				push,
				workflowRepository,
				testWebhooks,
			).init();

			eventService.emit('community-package-install', {
				packageName: 'test-package',
				packageVersion: '1.0.0',
			});

			expect(communityPackagesService.installOrUpdateNpmPackage).toHaveBeenCalledWith(
				'test-package',
				'1.0.0',
			);
		});

		it('should update community package on `community-package-update` event', () => {
			new PubSubHandler(
				eventService,
				instanceSettings,
				license,
				eventbus,
				externalSecretsManager,
				communityPackagesService,
				publisher,
				workerStatusService,
				activeWorkflowManager,
				push,
				workflowRepository,
				testWebhooks,
			).init();

			eventService.emit('community-package-update', {
				packageName: 'test-package',
				packageVersion: '1.0.0',
			});

			expect(communityPackagesService.installOrUpdateNpmPackage).toHaveBeenCalledWith(
				'test-package',
				'1.0.0',
			);
		});

		it('should uninstall community package on `community-package-uninstall` event', () => {
			new PubSubHandler(
				eventService,
				instanceSettings,
				license,
				eventbus,
				externalSecretsManager,
				communityPackagesService,
				publisher,
				workerStatusService,
				activeWorkflowManager,
				push,
				workflowRepository,
				testWebhooks,
			).init();

			eventService.emit('community-package-uninstall', {
				packageName: 'test-package',
			});

			expect(communityPackagesService.removeNpmPackage).toHaveBeenCalledWith('test-package');
		});
	});

	describe('in worker process', () => {
		const instanceSettings = mock<InstanceSettings>({ instanceType: 'worker' });

		it('should set up handlers in worker process', () => {
			// @ts-expect-error Spying on private method
			const setupHandlersSpy = jest.spyOn(PubSubHandler.prototype, 'setupHandlers');

			new PubSubHandler(
				eventService,
				instanceSettings,
				license,
				eventbus,
				externalSecretsManager,
				communityPackagesService,
				publisher,
				workerStatusService,
				activeWorkflowManager,
				push,
				workflowRepository,
				testWebhooks,
			).init();

			expect(setupHandlersSpy).toHaveBeenCalledWith({
				'reload-license': expect.any(Function),
				'restart-event-bus': expect.any(Function),
				'reload-external-secrets-providers': expect.any(Function),
				'community-package-install': expect.any(Function),
				'community-package-update': expect.any(Function),
				'community-package-uninstall': expect.any(Function),
				'get-worker-status': expect.any(Function),
			});
		});

		it('should reload license on `reload-license` event', () => {
			new PubSubHandler(
				eventService,
				instanceSettings,
				license,
				eventbus,
				externalSecretsManager,
				communityPackagesService,
				publisher,
				workerStatusService,
				activeWorkflowManager,
				push,
				workflowRepository,
				testWebhooks,
			).init();

			eventService.emit('reload-license');

			expect(license.reload).toHaveBeenCalled();
		});

		it('should restart event bus on `restart-event-bus` event', () => {
			new PubSubHandler(
				eventService,
				instanceSettings,
				license,
				eventbus,
				externalSecretsManager,
				communityPackagesService,
				publisher,
				workerStatusService,
				activeWorkflowManager,
				push,
				workflowRepository,
				testWebhooks,
			).init();

			eventService.emit('restart-event-bus');

			expect(eventbus.restart).toHaveBeenCalled();
		});

		it('should reload providers on `reload-external-secrets-providers` event', () => {
			new PubSubHandler(
				eventService,
				instanceSettings,
				license,
				eventbus,
				externalSecretsManager,
				communityPackagesService,
				publisher,
				workerStatusService,
				activeWorkflowManager,
				push,
				workflowRepository,
				testWebhooks,
			).init();

			eventService.emit('reload-external-secrets-providers');

			expect(externalSecretsManager.reloadAllProviders).toHaveBeenCalled();
		});

		it('should install community package on `community-package-install` event', () => {
			new PubSubHandler(
				eventService,
				instanceSettings,
				license,
				eventbus,
				externalSecretsManager,
				communityPackagesService,
				publisher,
				workerStatusService,
				activeWorkflowManager,
				push,
				workflowRepository,
				testWebhooks,
			).init();

			eventService.emit('community-package-install', {
				packageName: 'test-package',
				packageVersion: '1.0.0',
			});

			expect(communityPackagesService.installOrUpdateNpmPackage).toHaveBeenCalledWith(
				'test-package',
				'1.0.0',
			);
		});

		it('should update community package on `community-package-update` event', () => {
			new PubSubHandler(
				eventService,
				instanceSettings,
				license,
				eventbus,
				externalSecretsManager,
				communityPackagesService,
				publisher,
				workerStatusService,
				activeWorkflowManager,
				push,
				workflowRepository,
				testWebhooks,
			).init();

			eventService.emit('community-package-update', {
				packageName: 'test-package',
				packageVersion: '1.0.0',
			});

			expect(communityPackagesService.installOrUpdateNpmPackage).toHaveBeenCalledWith(
				'test-package',
				'1.0.0',
			);
		});

		it('should uninstall community package on `community-package-uninstall` event', () => {
			new PubSubHandler(
				eventService,
				instanceSettings,
				license,
				eventbus,
				externalSecretsManager,
				communityPackagesService,
				publisher,
				workerStatusService,
				activeWorkflowManager,
				push,
				workflowRepository,
				testWebhooks,
			).init();

			eventService.emit('community-package-uninstall', {
				packageName: 'test-package',
			});

			expect(communityPackagesService.removeNpmPackage).toHaveBeenCalledWith('test-package');
		});

		it('should generate status on `get-worker-status` event', () => {
			new PubSubHandler(
				eventService,
				instanceSettings,
				license,
				eventbus,
				externalSecretsManager,
				communityPackagesService,
				publisher,
				workerStatusService,
				activeWorkflowManager,
				push,
				workflowRepository,
				testWebhooks,
			).init();

			eventService.emit('get-worker-status');

			expect(workerStatusService.generateStatus).toHaveBeenCalled();
		});
	});

	describe('in main process', () => {
		const instanceSettings = mock<InstanceSettings>({
			instanceType: 'main',
			isLeader: true,
			isFollower: false,
		});

		afterEach(() => {
			jest.clearAllMocks();
		});

		it('should set up command and worker response handlers in main process', () => {
			// @ts-expect-error Spying on private method
			const setupHandlersSpy = jest.spyOn(PubSubHandler.prototype, 'setupHandlers');

			new PubSubHandler(
				eventService,
				instanceSettings,
				license,
				eventbus,
				externalSecretsManager,
				communityPackagesService,
				publisher,
				workerStatusService,
				activeWorkflowManager,
				push,
				workflowRepository,
				testWebhooks,
			).init();

			expect(setupHandlersSpy).toHaveBeenCalledWith({
				'reload-license': expect.any(Function),
				'restart-event-bus': expect.any(Function),
				'reload-external-secrets-providers': expect.any(Function),
				'community-package-install': expect.any(Function),
				'community-package-update': expect.any(Function),
				'community-package-uninstall': expect.any(Function),
				'add-webhooks-triggers-and-pollers': expect.any(Function),
				'remove-triggers-and-pollers': expect.any(Function),
				'display-workflow-activation': expect.any(Function),
				'display-workflow-deactivation': expect.any(Function),
				'display-workflow-activation-error': expect.any(Function),
				'relay-execution-lifecycle-event': expect.any(Function),
				'clear-test-webhooks': expect.any(Function),
				'response-to-get-worker-status': expect.any(Function),
			});
		});

		it('should reload license on `reload-license` event', () => {
			new PubSubHandler(
				eventService,
				instanceSettings,
				license,
				eventbus,
				externalSecretsManager,
				communityPackagesService,
				publisher,
				workerStatusService,
				activeWorkflowManager,
				push,
				workflowRepository,
				testWebhooks,
			).init();

			eventService.emit('reload-license');

			expect(license.reload).toHaveBeenCalled();
		});

		it('should restart event bus on `restart-event-bus` event', () => {
			new PubSubHandler(
				eventService,
				instanceSettings,
				license,
				eventbus,
				externalSecretsManager,
				communityPackagesService,
				publisher,
				workerStatusService,
				activeWorkflowManager,
				push,
				workflowRepository,
				testWebhooks,
			).init();

			eventService.emit('restart-event-bus');

			expect(eventbus.restart).toHaveBeenCalled();
		});

		it('should reload providers on `reload-external-secrets-providers` event', () => {
			new PubSubHandler(
				eventService,
				instanceSettings,
				license,
				eventbus,
				externalSecretsManager,
				communityPackagesService,
				publisher,
				workerStatusService,
				activeWorkflowManager,
				push,
				workflowRepository,
				testWebhooks,
			).init();

			eventService.emit('reload-external-secrets-providers');

			expect(externalSecretsManager.reloadAllProviders).toHaveBeenCalled();
		});

		it('should install community package on `community-package-install` event', () => {
			new PubSubHandler(
				eventService,
				instanceSettings,
				license,
				eventbus,
				externalSecretsManager,
				communityPackagesService,
				publisher,
				workerStatusService,
				activeWorkflowManager,
				push,
				workflowRepository,
				testWebhooks,
			).init();

			eventService.emit('community-package-install', {
				packageName: 'test-package',
				packageVersion: '1.0.0',
			});

			expect(communityPackagesService.installOrUpdateNpmPackage).toHaveBeenCalledWith(
				'test-package',
				'1.0.0',
			);
		});

		it('should update community package on `community-package-update` event', () => {
			new PubSubHandler(
				eventService,
				instanceSettings,
				license,
				eventbus,
				externalSecretsManager,
				communityPackagesService,
				publisher,
				workerStatusService,
				activeWorkflowManager,
				push,
				workflowRepository,
				testWebhooks,
			).init();

			eventService.emit('community-package-update', {
				packageName: 'test-package',
				packageVersion: '1.0.0',
			});

			expect(communityPackagesService.installOrUpdateNpmPackage).toHaveBeenCalledWith(
				'test-package',
				'1.0.0',
			);
		});

		it('should uninstall community package on `community-package-uninstall` event', () => {
			new PubSubHandler(
				eventService,
				instanceSettings,
				license,
				eventbus,
				externalSecretsManager,
				communityPackagesService,
				publisher,
				workerStatusService,
				activeWorkflowManager,
				push,
				workflowRepository,
				testWebhooks,
			).init();

			eventService.emit('community-package-uninstall', {
				packageName: 'test-package',
			});

			expect(communityPackagesService.removeNpmPackage).toHaveBeenCalledWith('test-package');
		});

		describe('multi-main setup', () => {
			it('if leader, should handle `add-webhooks-triggers-and-pollers` event', async () => {
				new PubSubHandler(
					eventService,
					instanceSettings,
					license,
					eventbus,
					externalSecretsManager,
					communityPackagesService,
					publisher,
					workerStatusService,
					activeWorkflowManager,
					push,
					workflowRepository,
					testWebhooks,
				).init();

				const workflowId = 'test-workflow-id';

				eventService.emit('add-webhooks-triggers-and-pollers', { workflowId });

				await flushPromises();

				expect(activeWorkflowManager.add).toHaveBeenCalledWith(workflowId, 'activate', undefined, {
					shouldPublish: false,
				});
				expect(push.broadcast).toHaveBeenCalledWith({
					type: 'workflowActivated',
					data: { workflowId },
				});
				expect(publisher.publishCommand).toHaveBeenCalledWith({
					command: 'display-workflow-activation',
					payload: { workflowId },
				});
			});

			it('if follower, should skip `add-webhooks-triggers-and-pollers` event', async () => {
				new PubSubHandler(
					eventService,
					mock<InstanceSettings>({ instanceType: 'main', isLeader: false, isFollower: true }),
					license,
					eventbus,
					externalSecretsManager,
					communityPackagesService,
					publisher,
					workerStatusService,
					activeWorkflowManager,
					push,
					workflowRepository,
					testWebhooks,
				).init();

				const workflowId = 'test-workflow-id';

				eventService.emit('add-webhooks-triggers-and-pollers', { workflowId });

				await flushPromises();

				expect(activeWorkflowManager.add).not.toHaveBeenCalled();
				expect(push.broadcast).not.toHaveBeenCalled();
				expect(publisher.publishCommand).not.toHaveBeenCalled();
			});

			it('if leader, should handle `remove-triggers-and-pollers` event', async () => {
				new PubSubHandler(
					eventService,
					instanceSettings,
					license,
					eventbus,
					externalSecretsManager,
					communityPackagesService,
					publisher,
					workerStatusService,
					activeWorkflowManager,
					push,
					workflowRepository,
					testWebhooks,
				).init();

				const workflowId = 'test-workflow-id';

				eventService.emit('remove-triggers-and-pollers', { workflowId });

				await flushPromises();

				expect(activeWorkflowManager.removeActivationError).toHaveBeenCalledWith(workflowId);
				expect(activeWorkflowManager.removeWorkflowTriggersAndPollers).toHaveBeenCalledWith(
					workflowId,
				);
				expect(push.broadcast).toHaveBeenCalledWith({
					type: 'workflowDeactivated',
					data: { workflowId },
				});
				expect(publisher.publishCommand).toHaveBeenCalledWith({
					command: 'display-workflow-deactivation',
					payload: { workflowId },
				});
			});

			it('if follower, should skip `remove-triggers-and-pollers` event', async () => {
				new PubSubHandler(
					eventService,
					mock<InstanceSettings>({ instanceType: 'main', isLeader: false, isFollower: true }),
					license,
					eventbus,
					externalSecretsManager,
					communityPackagesService,
					publisher,
					workerStatusService,
					activeWorkflowManager,
					push,
					workflowRepository,
					testWebhooks,
				).init();

				const workflowId = 'test-workflow-id';

				eventService.emit('remove-triggers-and-pollers', { workflowId });

				await flushPromises();

				expect(activeWorkflowManager.removeActivationError).not.toHaveBeenCalled();
				expect(activeWorkflowManager.removeWorkflowTriggersAndPollers).not.toHaveBeenCalled();
				expect(push.broadcast).not.toHaveBeenCalled();
				expect(publisher.publishCommand).not.toHaveBeenCalled();
			});

			it('should handle `display-workflow-activation` event', () => {
				new PubSubHandler(
					eventService,
					instanceSettings,
					license,
					eventbus,
					externalSecretsManager,
					communityPackagesService,
					publisher,
					workerStatusService,
					activeWorkflowManager,
					push,
					workflowRepository,
					testWebhooks,
				).init();

				const workflowId = 'test-workflow-id';

				eventService.emit('display-workflow-activation', { workflowId });

				expect(push.broadcast).toHaveBeenCalledWith({
					type: 'workflowActivated',
					data: { workflowId },
				});
			});

			it('should handle `display-workflow-deactivation` event', () => {
				new PubSubHandler(
					eventService,
					instanceSettings,
					license,
					eventbus,
					externalSecretsManager,
					communityPackagesService,
					publisher,
					workerStatusService,
					activeWorkflowManager,
					push,
					workflowRepository,
					testWebhooks,
				).init();

				const workflowId = 'test-workflow-id';

				eventService.emit('display-workflow-deactivation', { workflowId });

				expect(push.broadcast).toHaveBeenCalledWith({
					type: 'workflowDeactivated',
					data: { workflowId },
				});
			});

			it('should handle `display-workflow-activation-error` event', () => {
				new PubSubHandler(
					eventService,
					instanceSettings,
					license,
					eventbus,
					externalSecretsManager,
					communityPackagesService,
					publisher,
					workerStatusService,
					activeWorkflowManager,
					push,
					workflowRepository,
					testWebhooks,
				).init();

				const workflowId = 'test-workflow-id';
				const errorMessage = 'Test error message';

				eventService.emit('display-workflow-activation-error', { workflowId, errorMessage });

				expect(push.broadcast).toHaveBeenCalledWith({
					type: 'workflowFailedToActivate',
					data: {
						workflowId,
						errorMessage,
					},
				});
			});

			it('should handle `relay-execution-lifecycle-event` event', () => {
				new PubSubHandler(
					eventService,
					instanceSettings,
					license,
					eventbus,
					externalSecretsManager,
					communityPackagesService,
					publisher,
					workerStatusService,
					activeWorkflowManager,
					push,
					workflowRepository,
					testWebhooks,
				).init();

				const pushRef = 'test-push-ref';
				const type = 'executionStarted';
				const data = {
					executionId: '123',
					mode: 'webhook' as const,
					startedAt: new Date(),
					workflowId: '456',
					flattedRunData: '[]',
				};

				push.hasPushRef.mockReturnValue(true);

				eventService.emit('relay-execution-lifecycle-event', { type, data, pushRef });

				expect(push.send).toHaveBeenCalledWith({ type, data }, pushRef);
			});

			it('should handle `clear-test-webhooks` event', () => {
				new PubSubHandler(
					eventService,
					instanceSettings,
					license,
					eventbus,
					externalSecretsManager,
					communityPackagesService,
					publisher,
					workerStatusService,
					activeWorkflowManager,
					push,
					workflowRepository,
					testWebhooks,
				).init();

				const webhookKey = 'test-webhook-key';
				const workflowEntity = mock<IWorkflowBase>({ id: 'test-workflow-id' });
				const pushRef = 'test-push-ref';

				push.hasPushRef.mockReturnValue(true);
				testWebhooks.toWorkflow.mockReturnValue(mock<Workflow>({ id: 'test-workflow-id' }));

				eventService.emit('clear-test-webhooks', { webhookKey, workflowEntity, pushRef });

				expect(testWebhooks.clearTimeout).toHaveBeenCalledWith(webhookKey);
				expect(testWebhooks.deactivateWebhooks).toHaveBeenCalled();
			});

			it('should handle `response-to-get-worker-status event', () => {
				new PubSubHandler(
					eventService,
					instanceSettings,
					license,
					eventbus,
					externalSecretsManager,
					communityPackagesService,
					publisher,
					workerStatusService,
					activeWorkflowManager,
					push,
					workflowRepository,
					testWebhooks,
				).init();

				const workerStatus = mock<WorkerStatus>({ senderId: 'worker-1', loadAvg: [123] });

				eventService.emit('response-to-get-worker-status', workerStatus);

				expect(push.broadcast).toHaveBeenCalledWith({
					type: 'sendWorkerStatusMessage',
					data: {
						workerId: workerStatus.senderId,
						status: workerStatus,
					},
				});
			});
		});
	});
});
