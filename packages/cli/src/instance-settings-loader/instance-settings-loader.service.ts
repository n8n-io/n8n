import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { OidcInstanceSettingsLoader } from './loaders/oidc.instance-settings-loader';
import { OwnerInstanceSettingsLoader } from './loaders/owner.instance-settings-loader';
import { SecurityPolicyInstanceSettingsLoader } from './loaders/security-policy.instance-settings-loader';

type LoaderResult = 'created' | 'skipped';

@Service()
export class InstanceSettingsLoaderService {
	constructor(
		private logger: Logger,
		private readonly ownerLoader: OwnerInstanceSettingsLoader,
		private readonly oidcLoader: OidcInstanceSettingsLoader,
		private readonly securityPolicyLoader: SecurityPolicyInstanceSettingsLoader,
	) {
		this.logger = this.logger.scoped('instance-settings-loader');
	}

	async init(): Promise<void> {
		await this.run('owner', async () => await this.ownerLoader.run());
		await this.run('oidc', async () => await this.oidcLoader.run());
		await this.run('security-policy', async () => await this.securityPolicyLoader.run());
	}

	private async run(name: string, fn: () => Promise<LoaderResult>): Promise<void> {
		const result = await fn();
		this.logger.debug(`Instance settings loader "${name}": ${result}`);
	}
}
