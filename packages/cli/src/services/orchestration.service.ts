import { Service } from 'typedi';
import { Logger } from '@/Logger';
import config from '@/config';
import type { RedisServicePubSubPublisher } from './redis/RedisServicePubSubPublisher';
import type { RedisServiceBaseCommand, RedisServiceCommand } from './redis/RedisServiceCommands';

import { RedisService } from './redis.service';
import { MultiMainSetup } from './orchestration/main/MultiMainSetup.ee';
import type { WorkflowActivateMode } from 'n8n-workflow';

@Service()
export class OrchestrationService {
	constructor(
		private readonly logger: Logger,
		private readonly redisService: RedisService,
		readonly multiMainSetup: MultiMainSetup,
	) {}

	protected isInitialized = false;

	private isMultiMainSetupLicensed = false;

	setMultiMainSetupLicensed(newState: boolean) {
		this.isMultiMainSetupLicensed = newState;
	}

	get isMultiMainSetupEnabled() {
		return (
			config.getEnv('executions.mode') === 'queue' &&
			config.getEnv('multiMainSetup.enabled') &&
			config.getEnv('generic.instanceType') === 'main' &&
			this.isMultiMainSetupLicensed
		);
	}

	get isSingleMainEnabled() {
		return !this.isMultiMainSetupEnabled;
	}

	redisPublisher: RedisServicePubSubPublisher;

	get instanceId() {
		return config.getEnv('redis.queueModeId');
	}

	get isLeader() {
		return config.getEnv('multiMainSetup.instanceType') === 'leader';
	}

	get isFollower() {
		return config.getEnv('multiMainSetup.instanceType') !== 'leader';
	}

	sanityCheck() {
		return this.isInitialized && config.get('executions.mode') === 'queue';
	}

	async init() {
		if (this.isInitialized) return;

		if (config.get('executions.mode') === 'queue') await this.initPublisher();

		if (this.isMultiMainSetupEnabled) {
			await this.multiMainSetup.init();
		} else {
			config.set('multiMainSetup.instanceType', 'leader');
		}

		this.isInitialized = true;
	}

	async shutdown() {
		if (!this.isInitialized) return;

		if (this.isMultiMainSetupEnabled) await this.multiMainSetup.shutdown();

		await this.redisPublisher.destroy();

		this.isInitialized = false;
	}

	// ----------------------------------
	//            pubsub
	// ----------------------------------

	protected async initPublisher() {
		this.redisPublisher = await this.redisService.getPubSubPublisher();
	}

	async publish(command: RedisServiceCommand, data?: unknown) {
		if (!this.sanityCheck()) return;

		const payload = data as RedisServiceBaseCommand['payload'];

		this.logger.debug(`[Instance ID ${this.instanceId}] Publishing command "${command}"`, payload);

		await this.redisPublisher.publishToCommandChannel({ command, payload });
	}

	// ----------------------------------
	//         workers status
	// ----------------------------------

	async getWorkerStatus(id?: string) {
		if (!this.sanityCheck()) return;

		const command = 'getStatus';

		this.logger.debug(`Sending "${command}" to command channel`);

		await this.redisPublisher.publishToCommandChannel({
			command,
			targets: id ? [id] : undefined,
		});
	}

	async getWorkerIds() {
		if (!this.sanityCheck()) return;

		const command = 'getId';

		this.logger.debug(`Sending "${command}" to command channel`);

		await this.redisPublisher.publishToCommandChannel({ command });
	}

	// ----------------------------------
	//           activations
	// ----------------------------------

	/**
	 * Whether this instance may add webhooks to the `webhook_entity` table.
	 *
	 * In both single- and multi-main setup, only the leader is allowed to manage
	 * webhooks in the database. Webhooks do not require in-memory state, so we could
	 * have also allowed the follower to add webhooks, but it makes the implementation
	 * simpler to have the leader to manage webhooks and to have all followers
	 * proxy to the leader when webhooks need to be managed.
	 *
	 * On leadership change in multi-main setup, neither the leader nor the follower
	 * may add webhooks because these are already in the database.
	 */
	shouldAddWebhooks(activationMode: WorkflowActivateMode) {
		if (activationMode === 'leadershipChange') return false;

		return this.isLeader;
	}

	/**
	 * Whether this instance may add triggers and pollers to memory.
	 *
	 * In both single- and multi-main setup, only the leader is allowed to manage
	 * triggers and pollers in memory, to ensure they are not duplicated.
	 */
	shouldAddTriggersAndPollers() {
		return this.isLeader;
	}
}
