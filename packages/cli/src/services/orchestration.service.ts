import { Service } from 'typedi';
import { Logger } from '@/Logger';
import config from '@/config';
import type { RedisServicePubSubPublisher } from './redis/RedisServicePubSubPublisher';
import type { RedisServiceBaseCommand, RedisServiceCommand } from './redis/RedisServiceCommands';

import { RedisService } from './redis.service';
import { MultiMainSetup } from './orchestration/main/MultiMainSetup.ee';
import type { WorkflowActivateMode } from 'n8n-workflow';
import { ApplicationError } from 'n8n-workflow';

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
	 * Webhooks are added to the `webhook_entity` table on certain events.
	 *
	 * In single-main setup, the single main instance adds webhooks.
	 *
	 * In multi-main setup, only the leader may add webhooks on `init` or `activate`
	 * or `update`, so that we have always the same instance handling webhooks.
	 * On leadership change, neither the leader nor the follower may add webhooks
	 * because these are already in the `webhook_entity` table.
	 */
	shouldAddWebhooks(activationMode: WorkflowActivateMode) {
		if (this.isSingleMainEnabled) return true;

		if (['activate', 'update', 'init'].includes(activationMode)) return this.isLeader;

		if (activationMode === 'leadershipChange') return false;

		throw new ApplicationError(`Unexpected activation mode: ${activationMode}`);
	}

	/**
	 * Triggers and pollers are removed from instance memory on certain events.
	 *
	 * In single-main setup, the single main instance removes triggers and pollers.
	 *
	 * In multi-main setup, only the leader may remove triggers and pollers in all cases.
	 * More generally, only the leader may manage triggers and pollers - they are only
	 * ever running in the leader.
	 */
	shouldAddTriggersAndPollers() {
		if (this.isSingleMainEnabled) return true;

		return this.isLeader;
	}
}
