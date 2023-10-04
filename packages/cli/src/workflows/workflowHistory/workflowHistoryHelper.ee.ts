import { License } from '@/License';
import config from '@/config';
import Container from 'typedi';

export function isWorkflowHistoryLicensed() {
	const license = Container.get(License);
	return license.isWorkflowHistoryLicensed();
}

export function isWorkflowHistoryEnabled() {
	return isWorkflowHistoryLicensed() && config.getEnv('workflowHistory.enabled');
}

export function getWorkflowHistoryLicensePruneTime() {
	return Container.get(License).getWorkflowHistoryPruneLimit();
}

// Time in hours
export function getWorkflowHistoryPruneTime(): number {
	const licenseTime = Container.get(License).getWorkflowHistoryPruneLimit();
	const configTime = config.getEnv('workflowHistory.pruneTime');

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
