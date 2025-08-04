'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.isWorkflowHistoryLicensed = isWorkflowHistoryLicensed;
exports.isWorkflowHistoryEnabled = isWorkflowHistoryEnabled;
exports.getWorkflowHistoryLicensePruneTime = getWorkflowHistoryLicensePruneTime;
exports.getWorkflowHistoryPruneTime = getWorkflowHistoryPruneTime;
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
const license_1 = require('@/license');
function isWorkflowHistoryLicensed() {
	const license = di_1.Container.get(license_1.License);
	return license.isWorkflowHistoryLicensed();
}
function isWorkflowHistoryEnabled() {
	return (
		isWorkflowHistoryLicensed() && di_1.Container.get(config_1.GlobalConfig).workflowHistory.enabled
	);
}
function getWorkflowHistoryLicensePruneTime() {
	return di_1.Container.get(license_1.License).getWorkflowHistoryPruneLimit();
}
function getWorkflowHistoryPruneTime() {
	const licenseTime = di_1.Container.get(license_1.License).getWorkflowHistoryPruneLimit();
	const configTime = di_1.Container.get(config_1.GlobalConfig).workflowHistory.pruneTime;
	if (licenseTime === -1) {
		return configTime;
	}
	if (configTime === -1) {
		return licenseTime;
	}
	return Math.min(configTime, licenseTime);
}
//# sourceMappingURL=workflow-history-helper.ee.js.map
