import { License } from '@/License';
import config from '@/config';
import { getWorkflowHistoryPruneTime } from '@/workflows/workflowHistory/workflowHistoryHelper.ee';
import { mockInstance } from '../shared/mocking';

let licensePruneTime = -1;

beforeAll(async () => {
	mockInstance(License, {
		getWorkflowHistoryPruneLimit() {
			return licensePruneTime;
		},
	});
});

beforeEach(() => {
	licensePruneTime = -1;
	config.set('workflowHistory.pruneTime', -1);
});

describe('getWorkflowHistoryPruneTime', () => {
	test('should return -1 (infinite) if config and license are -1', () => {
		licensePruneTime = -1;
		config.set('workflowHistory.pruneTime', -1);

		expect(getWorkflowHistoryPruneTime()).toBe(-1);
	});

	test('should return config time if license is infinite and config is not', () => {
		licensePruneTime = -1;
		config.set('workflowHistory.pruneTime', 24);

		expect(getWorkflowHistoryPruneTime()).toBe(24);
	});

	test('should return license time if config is infinite and license is not', () => {
		licensePruneTime = 25;
		config.set('workflowHistory.pruneTime', -1);

		expect(getWorkflowHistoryPruneTime()).toBe(25);
	});

	test('should return lowest of config and license time if both are not -1', () => {
		licensePruneTime = 26;
		config.set('workflowHistory.pruneTime', 100);

		expect(getWorkflowHistoryPruneTime()).toBe(26);

		licensePruneTime = 100;
		config.set('workflowHistory.pruneTime', 27);

		expect(getWorkflowHistoryPruneTime()).toBe(27);
	});
});
