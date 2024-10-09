import { InstanceSettings } from 'n8n-core';
import { Service } from 'typedi';

import config from '@/config';
import { MessageEventBus } from '@/eventbus/message-event-bus/message-event-bus';
import { EventService } from '@/events/event.service';
import type { PubSubEventMap } from '@/events/maps/pub-sub.event-map';
import { ExternalSecretsManager } from '@/external-secrets/external-secrets-manager.ee';
import { License } from '@/license';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { CommunityPackagesService } from '@/services/community-packages.service';
import { assertNever } from '@/utils';

import { WorkerStatus } from '../worker-status';

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
		private readonly publisher: Publisher,
		private readonly workerStatus: WorkerStatus,
	) {}

	init() {
		switch (this.instanceSettings.instanceType) {
			case 'webhook':
				this.setupHandlers(this.commonHandlers);
				break;
			case 'worker':
				this.setupHandlers({
					...this.commonHandlers,
					'get-worker-status': async () =>
						await this.publisher.publishWorkerResponse({
							workerId: config.getEnv('redis.queueModeId'),
							command: 'get-worker-status',
							payload: this.workerStatus.generateStatus(),
						}),
				});
				break;
			case 'main':
				// TODO
				break;
			default:
				assertNever(this.instanceSettings.instanceType);
		}
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

	/** Handlers shared by webhook and worker processes. */
	private commonHandlers: {
		[K in keyof Pick<
			PubSubEventMap,
			| 'reload-license'
			| 'restart-event-bus'
			| 'reload-external-secrets-providers'
			| 'community-package-install'
			| 'community-package-update'
			| 'community-package-uninstall'
		>]: (event: PubSubEventMap[K]) => Promise<void>;
	} = {
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
	};
}
