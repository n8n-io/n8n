import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { EventService } from '@/events/event.service';
import type { ExternalSecretsManager } from '@/external-secrets/external-secrets-manager.ee';
import type { License } from '@/license';
import type { CommunityPackagesService } from '@/services/community-packages.service';

import { PubSubHandler } from '../pubsub/pubsub-handler';

describe('PubSubHandler', () => {
	const eventService = new EventService();
	const license = mock<License>();
	const eventbus = mock<MessageEventBus>();
	const externalSecretsManager = mock<ExternalSecretsManager>();
	const communityPackagesService = mock<CommunityPackagesService>();

	describe('in webhook process', () => {
		const instanceSettings = mock<InstanceSettings>({ instanceType: 'webhook' });

		it('should set up handlers in webhook process', () => {
			// @ts-expect-error Spying on private method
			const setupWebhookHandlersSpy = jest.spyOn(PubSubHandler.prototype, 'setupWebhookHandlers');

			new PubSubHandler(
				eventService,
				instanceSettings,
				license,
				eventbus,
				externalSecretsManager,
				communityPackagesService,
			).init();

			expect(setupWebhookHandlersSpy).toHaveBeenCalled();
		});

		it('should reload license on `reload-license` event', () => {
			new PubSubHandler(
				eventService,
				instanceSettings,
				license,
				eventbus,
				externalSecretsManager,
				communityPackagesService,
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
			).init();

			eventService.emit('community-package-uninstall', {
				packageName: 'test-package',
			});

			expect(communityPackagesService.removeNpmPackage).toHaveBeenCalledWith('test-package');
		});
	});
});
