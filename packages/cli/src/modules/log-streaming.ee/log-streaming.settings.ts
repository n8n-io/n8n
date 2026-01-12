import { Service } from '@n8n/di';

import { LicenseState } from '@n8n/backend-common';

@Service()
export class LogStreamingSettings {
	constructor(private readonly licenseState: LicenseState) {}

	settings() {
		return {
			enabled: this.licenseState.isLogStreamingLicensed(),
			destinationTypes: ['webhook', 'syslog', 'sentry'],
		};
	}
}
