import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { ClearLicenseCommand } from '@/commands/license/clear';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { setupTestCommand } from '@test-integration/utils/test-command';

mockInstance(LoadNodesAndCredentials);
const command = setupTestCommand(ClearLicenseCommand);

test('license:clear invokes clear() to release any floating entitlements and deletes the license cert from the DB', async () => {
	const license = Container.get(License);

	const manager = {
		clear: jest.fn().mockImplementation(async () => {
			await license.saveCertStr('');
		}),
	};

	const initSpy = jest.spyOn(license, 'init').mockImplementation(async () => {
		Object.defineProperty(license, 'manager', {
			value: manager,
			writable: true,
		});
	});

	const clearSpy = jest.spyOn(license, 'clear');
	const saveCertStrSpy = jest.spyOn(license, 'saveCertStr');

	await command.run();

	expect(initSpy).toHaveBeenCalledTimes(1);
	expect(clearSpy).toHaveBeenCalledTimes(1);
	expect(saveCertStrSpy).toHaveBeenCalledWith('');
});
