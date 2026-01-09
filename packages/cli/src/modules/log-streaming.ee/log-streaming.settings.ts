import { Service } from '@n8n/di';

import { License } from '@/license';

@Service()
export class LogStreamingSettings {
	constructor(private readonly license: License) {}

	settings() {
		return {
			enabled: this.license.isLogStreamingEnabled(),
			destinationTypes: ['webhook', 'syslog', 'sentry'],
		};
	}
}
