import { TypedEmitter } from '@/typed-emitter';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { MultiMainMetadata } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { ErrorReporter, InstanceSettings } from 'n8n-core';

import type * as LeaderElectionClientModule from '@/scaling/leader-election-client';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import { RedisClientService } from '@/services/redis-client.service';

import { MultiMainSetupLegacy } from './multi-main-setup-legacy';
import type { MultiMainStrategy } from './multi-main-setup.types';
import { MultiMainSetupV2 } from './multi-main-setup-v2';

type MultiMainEvents = {
	/**
	 * Emitted when this instance loses leadership. In response, its various
	 * services will stop triggers, pollers, pruning, wait-tracking, license
	 * renewal, queue recovery, insights, etc.
	 */
	'leader-stepdown': never;

	/**
	 * Emitted when this instance gains leadership. In response, its various
	 * services will start triggers, pollers, pruning, wait-tracking, license
	 * renewal, queue recovery, insights, etc.
	 */
	'leader-takeover': never;
};

/** Designates leader and followers when running multiple main processes. */
@Service()
export class MultiMainSetup extends TypedEmitter<MultiMainEvents> {
	private readonly strategy: MultiMainStrategy;

	private leaderCheckInterval: NodeJS.Timeout | undefined;

	constructor(
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
		private readonly globalConfig: GlobalConfig,
		private readonly metadata: MultiMainMetadata,
		private readonly errorReporter: ErrorReporter,
		private readonly publisher: Publisher,
		private readonly redisClientService: RedisClientService,
	) {
		super();
		this.logger = this.logger.scoped(['scaling', 'multi-main-setup']);

		const emitFn = (event: 'leader-takeover' | 'leader-stepdown') => this.emit(event);

		if (this.globalConfig.multiMainSetup.newLeaderElection) {
			const { LeaderElectionClient } =
				require('@/scaling/leader-election-client') as typeof LeaderElectionClientModule;
			const client = Container.get(LeaderElectionClient);
			this.strategy = new MultiMainSetupV2(
				this.logger,
				this.instanceSettings,
				this.errorReporter,
				client,
				emitFn,
			);
		} else {
			this.strategy = new MultiMainSetupLegacy(
				this.logger,
				this.instanceSettings,
				this.publisher,
				this.redisClientService,
				this.globalConfig,
				this.errorReporter,
				emitFn,
			);
		}
	}

	async init() {
		await this.strategy.init();

		this.leaderCheckInterval = setInterval(async () => {
			await this.strategy.checkLeader();
		}, this.globalConfig.multiMainSetup.interval * Time.seconds.toMilliseconds);
	}

	// @TODO: Use `@OnShutdown()` decorator
	async shutdown() {
		clearInterval(this.leaderCheckInterval);

		await this.strategy.shutdown();
	}

	async fetchLeaderKey(): Promise<string | null> {
		return await this.strategy.fetchLeaderKey();
	}

	registerEventHandlers() {
		const handlers = this.metadata.getHandlers();

		for (const { eventHandlerClass, methodName, eventName } of handlers) {
			const instance = Container.get(eventHandlerClass);
			this.on(eventName, async () => {
				return await instance[methodName].call(instance);
			});
		}
	}
}
