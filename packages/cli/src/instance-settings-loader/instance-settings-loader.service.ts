import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { LogStreamingInstanceSettingsLoader } from './loaders/log-streaming.instance-settings-loader';
import { McpSettingsLoader } from './loaders/mcp-settings.loader';
import { OwnerInstanceSettingsLoader } from './loaders/owner.instance-settings-loader';
import { SecurityPolicyInstanceSettingsLoader } from './loaders/security-policy.instance-settings-loader';
import { SsoInstanceSettingsLoader } from './loaders/sso.instance-settings-loader';

type LoaderResult = 'created' | 'skipped';

@Service()
export class InstanceSettingsLoaderService {
	constructor(
		private logger: Logger,
		private readonly ownerLoader: OwnerInstanceSettingsLoader,
		private readonly ssoLoader: SsoInstanceSettingsLoader,
		private readonly securityPolicyLoader: SecurityPolicyInstanceSettingsLoader,
		private readonly logStreamingLoader: LogStreamingInstanceSettingsLoader,
		private readonly mcpLoader: McpSettingsLoader,
	) {
		this.logger = this.logger.scoped('instance-settings-loader');
	}

	async init(): Promise<void> {
		await this.run('owner', async () => await this.ownerLoader.run());
		await this.run('sso', async () => await this.ssoLoader.run());
		await this.run('security-policy', async () => await this.securityPolicyLoader.run());
		await this.run('log-streaming', async () => await this.logStreamingLoader.run());
		await this.run('mcp', async () => await this.mcpLoader.run());
	}

	private async run(name: string, fn: () => Promise<LoaderResult>): Promise<void> {
		const result = await fn();
		this.logger.debug(`Instance settings loader "${name}": ${result}`);
	}
}
