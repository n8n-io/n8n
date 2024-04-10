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

	get isSingleMainSetup() {
		return !this.isMultiMainSetupEnabled;
	}

	redisPublisher: RedisServicePubSubPublisher;

	get instanceId() {
		return config.getEnv('redis.queueModeId');
	}

	/**
	 * Whether this instance is the leader in a multi-main setup. Always `false` in single-main setup.
	 */
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
	 */
	shouldAddWebhooks(activationMode: WorkflowActivateMode) {
		// Always try to populate the webhook entity table as well as register the webhooks
		// to prevent issues with users upgrading from a version < 1.15, where the webhook entity
		// was cleared on shutdown to anything past 1.28.0, where we stopped populating it on init,
		// causing all webhooks to break
		if (activationMode === 'init') return true;

		if (activationMode === 'leadershipChange') return false;

		return this.isLeader; // 'update' or 'activate'
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
