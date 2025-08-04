'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const insights_by_period_1 = require('../insights-by-period');
beforeAll(async () => {
	await backend_test_utils_1.testDb.init();
});
afterAll(async () => {
	await backend_test_utils_1.testDb.terminate();
});
describe('Insights By Period', () => {
	test.each(['time_saved_min', 'runtime_ms', 'failure', 'success'])(
		'`%s` can be serialized and deserialized correctly',
		(typeUnit) => {
			const insightByPeriod = new insights_by_period_1.InsightsByPeriod();
			insightByPeriod.type = typeUnit;
			expect(insightByPeriod.type).toBe(typeUnit);
		},
	);
	test.each(['hour', 'day', 'week'])(
		'`%s` can be serialized and deserialized correctly',
		(periodUnit) => {
			const insightByPeriod = new insights_by_period_1.InsightsByPeriod();
			insightByPeriod.periodUnit = periodUnit;
			expect(insightByPeriod.periodUnit).toBe(periodUnit);
		},
	);
});
//# sourceMappingURL=insights-by-period.test.js.map
