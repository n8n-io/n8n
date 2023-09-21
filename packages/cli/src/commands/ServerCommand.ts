import { Container } from 'typedi';
import config from '@/config';
import type { AbstractServer } from '@/AbstractServer';
import type { N8nInstanceType } from '@/Interfaces';
import { License } from '@/License';
import { ExternalSecretsManager } from '@/ExternalSecrets/ExternalSecretsManager.ee';
import { generateNanoId } from '@db/utils/generators';
import { BaseCommand } from './BaseCommand';

export abstract class ServerCommand extends BaseCommand {
	abstract instanceType: N8nInstanceType;

	protected server?: AbstractServer;

	queueModeId: string;

	async init() {
		config.set('generic.instanceType', this.instanceType);

		if (config.getEnv('executions.mode') === 'queue') {
			this.queueModeId = `${this.instanceType}-${generateNanoId()}`;
			config.set('redis.queueModeId', this.queueModeId);
		} else if (this.instanceType !== 'main') {
			/**
			 * It is technically possible to run without queues but
			 * there are 2 known bugs when running in this mode:
			 * - Executions list will be problematic as the main process
			 * is not aware of current executions in the webhook processes
			 * and therefore will display all current executions as error
			 * as it is unable to determine if it is still running or crashed
			 * - You cannot stop currently executing jobs from webhook processes
			 * when running without queues as the main process cannot talk to
			 * the webhook processes to communicate workflow execution interruption.
			 */
			this.error(`${this.instanceType} processes can only run with execution mode as queue.`);
		}

		if (this.instanceType === 'main') {
			this.logger.info('Initializing n8n process');
		} else {
			this.logger.debug(`${this.instanceType} ID: ${this.queueModeId}`);
		}

		await this.initCrashJournal();
		await super.init();

		await this.initLicense();
		await this.initBinaryManager();
		await this.initExternalHooks();
		await this.initExternalSecrets();
	}

	protected async postInit() {
		await this.server?.init();
		await super.postInit();
	}

	async initLicense(): Promise<void> {
		const license = Container.get(License);
		await license.init(this.instanceId, this.instanceType);

		const activationKey = config.getEnv('license.activationKey');

		if (activationKey) {
			const hasCert = (await license.loadCertStr()).length > 0;

			if (hasCert) {
				return this.logger.debug('Skipping license activation');
			}

			try {
				this.logger.debug('Attempting license activation');
				await license.activate(activationKey);
			} catch (e) {
				this.logger.error('Could not activate license', e as Error);
			}
		}
	}

	async initExternalSecrets() {
		const secretsManager = Container.get(ExternalSecretsManager);
		await secretsManager.init();
	}
}
