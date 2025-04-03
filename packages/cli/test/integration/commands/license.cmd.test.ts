import { ClearLicenseCommand } from '@/commands/license/clear';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { setupTestCommand } from '@test-integration/utils/test-command';

import { mockInstance } from '../../shared/mocking';

mockInstance(LoadNodesAndCredentials);
const license = mockInstance(License);
const command = setupTestCommand(ClearLicenseCommand);

test('license:clear invokes clear() to release any floating entitlements and deletes the license cert from the DB', async () => {
	//
	await command.run();

	expect(license.init).toHaveBeenCalledTimes(1);
	expect(license.clear).toHaveBeenCalledTimes(1);

	// this assertion fails because the LicenseManager is not mocked
	expect(license.saveCertStr).toHaveBeenCalledWith('');
});
