import { InternalHooks } from '@/InternalHooks';
import { License } from '@/License';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { ClearLicenseCommand } from '@/commands/license/clear';
import { Config } from '@oclif/core';
import { mockInstance } from '../../shared/mocking';

const oclifConfig = new Config({ root: __dirname });

beforeAll(async () => {
	mockInstance(InternalHooks);
	mockInstance(LoadNodesAndCredentials);
	await oclifConfig.load();
});

test('license:clear invokes shutdown() to release any floating entitlements', async () => {
	const cmd = new ClearLicenseCommand([], oclifConfig);
	await cmd.init();

	const license = mockInstance(License);

	await cmd.run();

	expect(license.init).toHaveBeenCalledTimes(1);
	expect(license.shutdown).toHaveBeenCalledTimes(1);

	jest.restoreAllMocks();
});
