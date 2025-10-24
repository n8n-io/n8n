// Empty PostHog client - all telemetry has been removed
import { Service } from '@n8n/di';

@Service()
export class PostHogClient {
	async init() {
		// No PostHog initialization
	}

	async stop() {
		// No PostHog cleanup
	}

	track() {
		// No PostHog tracking
	}

	async getFeatureFlags() {
		return {};
	}
}
