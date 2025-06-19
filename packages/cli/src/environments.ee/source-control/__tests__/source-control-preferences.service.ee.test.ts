import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { SourceControlPreferencesService } from '../source-control-preferences.service.ee';
import type { SourceControlPreferences } from '../types/source-control-preferences';

describe('SourceControlPreferencesService', () => {
	const instanceSettings = mock<InstanceSettings>({ n8nFolder: '' });
	const service = new SourceControlPreferencesService(
		instanceSettings,
		mock(),
		mock(),
		mock(),
		mock(),
	);

	it('should class validate correct preferences', async () => {
		const validPreferences: Partial<SourceControlPreferences> = {
			branchName: 'main',
			repositoryUrl: 'git@example.com:n8ntest/n8n_testrepo.git',
			branchReadOnly: false,
			branchColor: '#5296D6',
		};
		const validationResult = await service.validateSourceControlPreferences(validPreferences);
		expect(validationResult).toBeTruthy();
	});
});
