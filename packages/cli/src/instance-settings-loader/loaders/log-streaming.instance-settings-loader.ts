import { Logger } from '@n8n/backend-common';
import { InstanceSettingsLoaderConfig } from '@n8n/config';
import { Service } from '@n8n/di';

@Service()
export class LogStreamingInstanceSettingsLoader {
	constructor(
		private readonly config: InstanceSettingsLoaderConfig,
		private logger: Logger,
	) {
		this.logger = this.logger.scoped('instance-settings-loader');
	}

	async run(): Promise<'created' | 'skipped'> {
		if (!this.config.logStreamingManagedByEnv) {
			this.logger.debug(
				'logStreamingManagedByEnv is disabled — skipping log streaming destinations env config',
			);
			return 'skipped';
		}

		this.logger.info(
			'logStreamingManagedByEnv is enabled — reconciling log streaming destinations from env vars',
		);

		return 'created';
	}
}
