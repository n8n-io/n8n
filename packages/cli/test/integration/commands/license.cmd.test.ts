import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { ClearLicenseCommand } from '@/commands/license/clear.js';
import { License } from '@/license.js';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials.js';
import { setupTestCommand } from '@test-integration/utils/test-command.js';

mockInstance(LoadNodesAndCredentials);
const command = setupTestCommand(ClearLicenseCommand);

test('license:clear invokes clear() to release any floating entitlements and deletes the license cert from the DB', async () => {
	const license = Container.get(License);

	const manager = {
		clear: vi.fn().mockImplementation(async () => {
			await license.saveCertStr('');
		}),
	};

	const initSpy = vi.spyOn(license, 'init').mockImplementation(async () => {
		Object.defineProperty(license, 'manager', {
			value: manager,
			writable: true,
		});
	});

	const clearSpy = vi.spyOn(license, 'clear');
	const saveCertStrSpy = vi.spyOn(license, 'saveCertStr');

	await command.run();

	expect(initSpy).toHaveBeenCalledTimes(1);
	expect(clearSpy).toHaveBeenCalledTimes(1);
	expect(saveCertStrSpy).toHaveBeenCalledWith('');
});
