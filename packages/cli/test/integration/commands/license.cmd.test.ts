import { ClearLicenseCommand } from '@/commands/license/clear';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { setupTestCommand } from '@test-integration/utils/test-command';

import { mockInstance } from '../../shared/mocking';
import { Container } from '@n8n/di';

mockInstance(LoadNodesAndCredentials);
const command = setupTestCommand(ClearLicenseCommand);

test('license:clear invokes clear() to release any floating entitlements and deletes the license cert from the DB', async () => {
	const license = Container.get(License);

	// create spies
	const initSpy = jest.spyOn(license, 'init');
	const clearSpy = jest.spyOn(license, 'clear');
	const saveCertStrSpy = jest.spyOn(license, 'saveCertStr');

	await command.run();

	expect(initSpy).toHaveBeenCalledTimes(1);
	expect(clearSpy).toHaveBeenCalledTimes(1);
	expect(saveCertStrSpy).toHaveBeenCalledWith(''); // <<-- WHY does saveCertStr not get called?
});
