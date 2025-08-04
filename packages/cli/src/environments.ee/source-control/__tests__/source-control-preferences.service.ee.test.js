'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const source_control_preferences_service_ee_1 = require('../source-control-preferences.service.ee');
describe('SourceControlPreferencesService', () => {
	const instanceSettings = (0, jest_mock_extended_1.mock)({ n8nFolder: '' });
	const service = new source_control_preferences_service_ee_1.SourceControlPreferencesService(
		instanceSettings,
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
	);
	it('should class validate correct preferences', async () => {
		const validPreferences = {
			branchName: 'main',
			repositoryUrl: 'git@example.com:n8ntest/n8n_testrepo.git',
			branchReadOnly: false,
			branchColor: '#5296D6',
		};
		const validationResult = await service.validateSourceControlPreferences(validPreferences);
		expect(validationResult).toBeTruthy();
	});
});
//# sourceMappingURL=source-control-preferences.service.ee.test.js.map
