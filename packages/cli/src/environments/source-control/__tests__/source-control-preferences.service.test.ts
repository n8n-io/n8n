import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import fsp from 'node:fs/promises';

import { SourceControlPreferencesService } from '../source-control-preferences.service.ee';

describe('SourceControlPreferencesService', () => {
	const service = new SourceControlPreferencesService(
		mock<InstanceSettings>({ n8nFolder: 'test' }),
		mock(),
		mock(),
	);

	describe('getPrivateKeyPath', () => {
		it('should return the path to the private key file', async () => {
			fsp.writeFile = jest.fn();

			// @ts-expect-error Private method
			jest.spyOn(service, 'getPrivateKeyFromDatabase').mockResolvedValue('private-key');

			await service.getPrivateKeyPath();

			expect(fsp.writeFile).toHaveBeenCalledWith(
				expect.stringContaining('ssh_private_key_temp'),
				'private-key',
				{ mode: 0o600, encoding: 'utf8' },
			);
		});
	});
});
