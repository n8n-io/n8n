'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const di_1 = require('@n8n/di');
const luxon_1 = require('luxon');
const db_utils_1 = require('./db-utils');
const insights_raw_repository_1 = require('../../repositories/insights-raw.repository');
const insights_raw_1 = require('../insights-raw');
let insightsRawRepository;
beforeAll(async () => {
	await backend_test_utils_1.testModules.loadModules(['insights']);
	await backend_test_utils_1.testDb.init();
	insightsRawRepository = di_1.Container.get(insights_raw_repository_1.InsightsRawRepository);
});
beforeEach(async () => {
	await insightsRawRepository.delete({});
});
afterAll(async () => {
	await backend_test_utils_1.testDb.terminate();
});
describe('Insights Raw Entity', () => {
	test.each(['success', 'failure', 'runtime_ms', 'time_saved_min'])(
		'`%s` can be serialized and deserialized correctly',
		(typeUnit) => {
			const rawInsight = new insights_raw_1.InsightsRaw();
			rawInsight.type = typeUnit;
			expect(rawInsight.type).toBe(typeUnit);
		},
	);
	test('`timestamp` can be serialized and deserialized correctly', () => {
		const rawInsight = new insights_raw_1.InsightsRaw();
		const now = new Date();
		rawInsight.timestamp = now;
		now.setMilliseconds(0);
		expect(rawInsight.timestamp).toEqual(now);
	});
	test('timestamp uses the correct default value', async () => {
		const project = await (0, backend_test_utils_1.createTeamProject)();
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, project);
		await (0, db_utils_1.createMetadata)(workflow);
		const rawInsight = await (0, db_utils_1.createRawInsightsEvent)(workflow, {
			type: 'success',
			value: 1,
		});
		const now = luxon_1.DateTime.utc().startOf('second');
		await insightsRawRepository.save(rawInsight);
		const timestampValue = await insightsRawRepository.find();
		expect(timestampValue).toHaveLength(1);
		const timestamp = timestampValue[0].timestamp;
		expect(
			Math.abs(now.toSeconds() - luxon_1.DateTime.fromJSDate(timestamp).toUTC().toSeconds()),
		).toBeLessThan(2);
	});
});
//# sourceMappingURL=insights-raw.test.js.map
