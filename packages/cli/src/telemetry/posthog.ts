import type { PostHog } from 'posthog-node';
import type { FeatureFlags, ITelemetryTrackProperties } from 'n8n-workflow';
import { LoggerProxy } from 'n8n-workflow';
import config from '@/config';
import { getLogger, Logger } from '@/Logger';

export default class PostHogClient {
	private postHog?: PostHog;
	
	private logger?: Logger;

	constructor(private instanceId: string) {}

	async init() {
		const enabled = config.getEnv('diagnostics.enabled');
		if (!enabled) {
			return;
		}

		this.logger = getLogger();
		LoggerProxy.init(this.logger);

		// eslint-disable-next-line @typescript-eslint/naming-convention
		const { PostHog } = await import('posthog-node');
		this.postHog = new PostHog(config.getEnv('diagnostics.config.posthog.apiKey'), {
			host: config.getEnv('diagnostics.config.posthog.apiHost'),
		});

		const logLevel = config.getEnv('logs.level');
		if (logLevel === 'debug') {
			this.postHog.debug(true);
		}
	}

	async stop(): Promise<void> {
		if (this.postHog) {
			return await this.postHog.shutdown();
		}
	}

	track(
		payload: {
			userId: string;
			event: string;
			properties: ITelemetryTrackProperties;	
		}
	): void {
		this.postHog?.capture({
			distinctId: payload.userId,
			sendFeatureFlags: true,
			...payload,
		});
	}

	async getFeatureFlags(userId: string): Promise<FeatureFlags> {
		if (!this.postHog) return Promise.resolve({});

		const fullId = [this.instanceId, userId].join('#');

		return this.postHog.getAllFlags(fullId);
	}

	async isFeatureFlagEnabled(
		featureFlagName: string,
		{ user_id: userId }: ITelemetryTrackProperties = {},
	): Promise<boolean | undefined> {
		if (!this.postHog) return Promise.resolve(false);

		const fullId = [this.instanceId, userId].join('#');

		return this.postHog.isFeatureEnabled(featureFlagName, fullId);
	}
}
