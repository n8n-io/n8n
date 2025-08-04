'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const di_1 = require('@n8n/di');
const clear_1 = require('@/commands/license/clear');
const license_1 = require('@/license');
const load_nodes_and_credentials_1 = require('@/load-nodes-and-credentials');
const test_command_1 = require('@test-integration/utils/test-command');
(0, backend_test_utils_1.mockInstance)(load_nodes_and_credentials_1.LoadNodesAndCredentials);
const command = (0, test_command_1.setupTestCommand)(clear_1.ClearLicenseCommand);
test('license:clear invokes clear() to release any floating entitlements and deletes the license cert from the DB', async () => {
	const license = di_1.Container.get(license_1.License);
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
//# sourceMappingURL=license.cmd.test.js.map
