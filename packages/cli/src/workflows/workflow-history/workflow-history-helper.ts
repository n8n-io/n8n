import { LicenseState } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { DEFAULT_WORKFLOW_HISTORY_PRUNE_LIMIT, LICENSE_QUOTAS } from '@n8n/constants';
import { Container } from '@n8n/di';

function getLicensePruneTime() {
	return (
		Container.get(LicenseState).getValue(LICENSE_QUOTAS.WORKFLOW_HISTORY_PRUNE_LIMIT) ??
		DEFAULT_WORKFLOW_HISTORY_PRUNE_LIMIT
	);
}

export function getWorkflowHistoryLicensePruneTime() {
	return getLicensePruneTime();
}

// Time in hours
export function getWorkflowHistoryPruneTime(): number {
	const licenseTime = getLicensePruneTime();
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
