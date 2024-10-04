import { InstanceSettings } from 'n8n-core';
import { Service } from 'typedi';

import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { EventService } from '@/events/event.service';
import type { PubSubEventMap } from '@/events/maps/pub-sub.event-map';
import { ExternalSecretsManager } from '@/external-secrets/external-secrets-manager.ee';
import { License } from '@/license';
import { CommunityPackagesService } from '@/services/community-packages.service';

/**
 * Responsible for handling events emitted from messages received via a pubsub channel.
 */
@Service()
export class PubSubHandler {
	constructor(
		private readonly eventService: EventService,
		private readonly instanceSettings: InstanceSettings,
		private readonly license: License,
		private readonly eventbus: MessageEventBus,
		private readonly externalSecretsManager: ExternalSecretsManager,
		private readonly communityPackagesService: CommunityPackagesService,
	) {}

	init() {
		if (this.instanceSettings.instanceType === 'webhook') this.setupWebhookHandlers();
	}

	private setupHandlers<EventNames extends keyof PubSubEventMap>(
		map: {
			[EventName in EventNames]?: (event: PubSubEventMap[EventName]) => void | Promise<void>;
		},
	) {
		for (const [eventName, handlerFn] of Object.entries(map) as Array<
			[EventNames, (event: PubSubEventMap[EventNames]) => void | Promise<void>]
		>) {
			this.eventService.on(eventName, async (event) => {
				await handlerFn(event);
			});
		}
	}

	// #region Webhook process

	private setupWebhookHandlers() {
		this.setupHandlers({
			'reload-license': async () => await this.license.reload(),
			'restart-event-bus': async () => await this.eventbus.restart(),
			'reload-external-secrets-providers': async () =>
				await this.externalSecretsManager.reloadAllProviders(),
			'community-package-install': async ({ packageName, packageVersion }) =>
				await this.communityPackagesService.installOrUpdateNpmPackage(packageName, packageVersion),
			'community-package-update': async ({ packageName, packageVersion }) =>
				await this.communityPackagesService.installOrUpdateNpmPackage(packageName, packageVersion),
			'community-package-uninstall': async ({ packageName }) =>
				await this.communityPackagesService.removeNpmPackage(packageName),
		});
	}

	// #endregion
}
