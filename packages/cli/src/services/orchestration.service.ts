import { GlobalConfig } from '@n8n/config';
import { InstanceSettings } from 'n8n-core';
import Container, { Service } from 'typedi';

import config from '@/config';
import type { Publisher } from '@/scaling/pubsub/publisher.service';
import type { Subscriber } from '@/scaling/pubsub/subscriber.service';

import { MultiMainSetup } from '../scaling/multi-main-setup.ee';

@Service()
export class OrchestrationService {
	constructor(
		readonly instanceSettings: InstanceSettings,
		readonly multiMainSetup: MultiMainSetup,
		readonly globalConfig: GlobalConfig,
	) {}

	private publisher: Publisher;

	private subscriber: Subscriber;

	isInitialized = false;

	private isMultiMainSetupLicensed = false;

	setMultiMainSetupLicensed(newState: boolean) {
		this.isMultiMainSetupLicensed = newState;
	}

	get isMultiMainSetupEnabled() {
		return (
			config.getEnv('executions.mode') === 'queue' &&
			this.globalConfig.multiMainSetup.enabled &&
			this.instanceSettings.instanceType === 'main' &&
			this.isMultiMainSetupLicensed
		);
	}

	get isSingleMainSetup() {
		return !this.isMultiMainSetupEnabled;
	}

	sanityCheck() {
		return this.isInitialized && config.get('executions.mode') === 'queue';
	}

	async init() {
		if (this.isInitialized) return;

		if (config.get('executions.mode') === 'queue') {
			const { Publisher } = await import('@/scaling/pubsub/publisher.service');
			this.publisher = Container.get(Publisher);

			const { Subscriber } = await import('@/scaling/pubsub/subscriber.service');
			this.subscriber = Container.get(Subscriber);
		}

		if (this.isMultiMainSetupEnabled) {
			await this.multiMainSetup.init();
		} else {
			this.instanceSettings.markAsLeader();
		}

		this.isInitialized = true;
	}

	// @TODO: Use `@OnShutdown()` decorator
	async shutdown() {
		if (!this.isInitialized) return;

		if (this.isMultiMainSetupEnabled) await this.multiMainSetup.shutdown();

		this.publisher.shutdown();
		this.subscriber.shutdown();

		this.isInitialized = false;
	}
}
