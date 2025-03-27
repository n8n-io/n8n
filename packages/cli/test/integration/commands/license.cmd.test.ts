import { Container } from '@n8n/di';

import { ClearLicenseCommand } from '@/commands/license/clear';
import { SETTINGS_LICENSE_CERT_KEY } from '@/constants';
import { SettingsRepository } from '@/databases/repositories/settings.repository';
import { License } from '@/license';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { setupTestCommand } from '@test-integration/utils/test-command';

import { mockInstance } from '../../shared/mocking';

mockInstance(LoadNodesAndCredentials);
const license = mockInstance(License);
const command = setupTestCommand(ClearLicenseCommand);

test('license:clear invokes shutdown() to release any floating entitlements', async () => {
	await command.run();

	expect(license.init).toHaveBeenCalledTimes(1);
	expect(license.shutdown).toHaveBeenCalledTimes(1);
});

test('license:clear deletes the license from the DB even if shutdown() fails', async () => {
	license.shutdown.mockRejectedValueOnce(new Error('shutdown failed'));

	const settingsRepository = Container.get(SettingsRepository);

	settingsRepository.delete = jest.fn();

	await command.run();

	expect(settingsRepository.delete).toHaveBeenCalledWith({
		key: SETTINGS_LICENSE_CERT_KEY,
	});
});
