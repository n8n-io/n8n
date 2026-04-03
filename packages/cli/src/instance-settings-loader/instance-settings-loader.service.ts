import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { OwnerInstanceSettingsLoader } from './loaders/owner.instance-settings-loader';

type LoaderResult = 'created' | 'skipped';

@Service()
export class InstanceSettingsLoaderService {
	constructor(
		private logger: Logger,
		private readonly ownerLoader: OwnerInstanceSettingsLoader,
	) {
		this.logger = this.logger.scoped('instance-settings-loader');
	}

	async init(): Promise<void> {
		await this.run('owner', async () => await this.ownerLoader.run());
	}

	private async run(name: string, fn: () => Promise<LoaderResult>): Promise<void> {
		const result = await fn();
		this.logger.debug(`Instance settings loader "${name}": ${result}`);
	}
}
