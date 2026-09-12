import { LicenseState } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';

export function getWorkflowHistoryLicensePruneTime() {
	return Container.get(LicenseState).getWorkflowHistoryPruneQuota();
}

// Time in hours
export function getWorkflowHistoryPruneTime(): number {
	const licenseTime = Container.get(LicenseState).getWorkflowHistoryPruneQuota();
	const configTime = Container.get(GlobalConfig).workflowHistory.pruneTime;

	// License is infinite and config time is infinite
	if (licenseTime === -1) {
		return configTime;
	}

	// License is not infinite but config is, use license time
	if (configTime === -1) {
		return licenseTime;
	}

	// Return the smallest of the license or config if not infinite
	return Math.min(configTime, licenseTime);
}
