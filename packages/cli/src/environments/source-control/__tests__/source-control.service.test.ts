import { mock } from 'jest-mock-extended';
import { InstanceSettings } from 'n8n-core';

import { SourceControlPreferencesService } from '@/environments/source-control/source-control-preferences.service.ee';
import { SourceControlService } from '@/environments/source-control/source-control.service.ee';

describe('SourceControlService', () => {
	const preferencesService = new SourceControlPreferencesService(
		new InstanceSettings(mock()),
		mock(),
		mock(),
	);
	const sourceControlService = new SourceControlService(
		mock(),
		mock(),
		preferencesService,
		mock(),
		mock(),
		mock(),
		mock(),
	);

	describe('pushWorkfolder', () => {
		it('should throw an error if a file is given that is not in the workfolder', async () => {
			jest.spyOn(sourceControlService, 'sanityCheck').mockResolvedValue(undefined);

			await expect(
				sourceControlService.pushWorkfolder({
					fileNames: [
						{
							file: '/etc/passwd',
							id: 'test',
							name: 'secret-file',
							type: 'file',
							status: 'modified',
							location: 'local',
							conflict: false,
							updatedAt: new Date().toISOString(),
							pushed: false,
						},
					],
				}),
			).rejects.toThrow('File path /etc/passwd is invalid');
		});
	});
});
