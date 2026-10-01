import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { hostname } from 'node:os';

/**
 * Pushes heap and wall-time profiles to a Pyroscope server, so that developers
 * can see which code allocates and holds memory over time.
 */
@Service()
export class PyroscopeProfiler {
	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
	) {}

	async start() {
		const { pyroscopeUrl } = this.globalConfig.profiling;
		if (!pyroscopeUrl) return;

		try {
			const { default: Pyroscope } = await import('@pyroscope/nodejs');
			Pyroscope.init({
				serverAddress: pyroscopeUrl,
				appName: 'n8n',
				tags: { instanceType: this.instanceSettings.instanceType, hostname: hostname() },
			});
			Pyroscope.start();
			this.logger.info(`Pyroscope profiling started, pushing to ${pyroscopeUrl}`);
		} catch (error) {
			this.logger.warn('Failed to start Pyroscope profiling', { error });
		}
	}
}
