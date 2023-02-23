import { Service } from 'typedi';
import type { PostHog } from 'posthog-node';
import type { FeatureFlags, ITelemetryTrackProperties } from 'n8n-workflow';
import config from '@/config';
import type { PublicUser } from '@/Interfaces';

@Service()
export class PostHogClient {
	private postHog?: PostHog;

	private instanceId?: string;

	async init(instanceId: string) {
		this.instanceId = instanceId;
		const enabled = config.getEnv('diagnostics.enabled');
		if (!enabled) {
			return;
		}

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
			return this.postHog.shutdown();
		}
	}

	track(payload: { userId: string; event: string; properties: ITelemetryTrackProperties }): void {
		this.postHog?.capture({
			distinctId: payload.userId,
			sendFeatureFlags: true,
			...payload,
		});
	}

	async getFeatureFlags(user: Pick<PublicUser, 'id' | 'createdAt'>): Promise<FeatureFlags> {
		if (!this.postHog) return Promise.resolve({});

		const fullId = [this.instanceId, user.id].join('#');

		// cannot use local evaluation because that requires PostHog personal api key with org-wide
		// https://github.com/PostHog/posthog/issues/4849
		return this.postHog.getAllFlags(fullId, {
			personProperties: {
				created_at_timestamp: user.createdAt.getTime().toString(),
			},
		});
	}
}
