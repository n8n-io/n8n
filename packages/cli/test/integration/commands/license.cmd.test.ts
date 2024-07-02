import { InternalHooks } from '@/InternalHooks';
import { License } from '@/License';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { ClearLicenseCommand } from '@/commands/license/clear';

import { setupTestCommand } from '@test-integration/utils/testCommand';
import { mockInstance } from '../../shared/mocking';

mockInstance(InternalHooks);
mockInstance(LoadNodesAndCredentials);
const license = mockInstance(License);
const command = setupTestCommand(ClearLicenseCommand);

test('license:clear invokes shutdown() to release any floating entitlements', async () => {
	await command.run();

	expect(license.init).toHaveBeenCalledTimes(1);
	expect(license.shutdown).toHaveBeenCalledTimes(1);
});
