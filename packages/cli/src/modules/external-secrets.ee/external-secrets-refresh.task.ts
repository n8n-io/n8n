import { intervalFromSeconds, SystemTask } from '@n8n/decorators';
import type { SystemTaskEffects, SystemTaskPlacement, SystemTaskSchedule } from '@n8n/decorators';

import { ExternalSecretsManager } from './external-secrets-manager.ee';
import { ExternalSecretsConfig } from './external-secrets.config';

/**
 * Pulls the secrets of every connected provider again, so workflows see rotated values.
 */
@SystemTask()
export class ExternalSecretsRefreshTask implements SystemTask {
	readonly name = 'external-secrets-refresh';

	readonly schedule: SystemTaskSchedule;

	readonly effects: SystemTaskEffects = 'idempotent';

	/** The secrets cache belongs to this process, so every instance refreshes its own. */
	readonly placement: SystemTaskPlacement = {
		scope: 'instance',
		instanceTypes: ['main', 'worker', 'webhook'],
	};

	constructor(
		config: ExternalSecretsConfig,
		private readonly manager: ExternalSecretsManager,
	) {
		this.schedule = intervalFromSeconds(config.updateInterval);
	}

	async run(signal: AbortSignal): Promise<void> {
		await this.manager.updateSecrets(signal);
	}
}
