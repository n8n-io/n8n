'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
const license_1 = require('@/license');
const workflow_history_helper_ee_1 = require('@/workflows/workflow-history.ee/workflow-history-helper.ee');
let licensePruneTime = -1;
const globalConfig = di_1.Container.get(config_1.GlobalConfig);
beforeAll(async () => {
	(0, backend_test_utils_1.mockInstance)(license_1.License, {
		getWorkflowHistoryPruneLimit() {
			return licensePruneTime;
		},
	});
});
beforeEach(() => {
	licensePruneTime = -1;
	globalConfig.workflowHistory.pruneTime = -1;
});
describe('getWorkflowHistoryPruneTime', () => {
	test('should return -1 (infinite) if config and license are -1', () => {
		licensePruneTime = -1;
		globalConfig.workflowHistory.pruneTime = -1;
		expect((0, workflow_history_helper_ee_1.getWorkflowHistoryPruneTime)()).toBe(-1);
	});
	test('should return config time if license is infinite and config is not', () => {
		licensePruneTime = -1;
		globalConfig.workflowHistory.pruneTime = 24;
		expect((0, workflow_history_helper_ee_1.getWorkflowHistoryPruneTime)()).toBe(24);
	});
	test('should return license time if config is infinite and license is not', () => {
		licensePruneTime = 25;
		globalConfig.workflowHistory.pruneTime = -1;
		expect((0, workflow_history_helper_ee_1.getWorkflowHistoryPruneTime)()).toBe(25);
	});
	test('should return lowest of config and license time if both are not -1', () => {
		licensePruneTime = 26;
		globalConfig.workflowHistory.pruneTime = 100;
		expect((0, workflow_history_helper_ee_1.getWorkflowHistoryPruneTime)()).toBe(26);
		licensePruneTime = 100;
		globalConfig.workflowHistory.pruneTime = 27;
		expect((0, workflow_history_helper_ee_1.getWorkflowHistoryPruneTime)()).toBe(27);
	});
});
//# sourceMappingURL=workflow-history-helper.ee.test.js.map
