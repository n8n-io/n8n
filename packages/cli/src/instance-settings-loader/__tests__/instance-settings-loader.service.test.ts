import { mock } from 'jest-mock-extended';
import type { Logger } from '@n8n/backend-common';

import { InstanceSettingsLoaderService } from '../instance-settings-loader.service';
import type { OidcInstanceSettingsLoader } from '../loaders/oidc.instance-settings-loader';
import type { OwnerInstanceSettingsLoader } from '../loaders/owner.instance-settings-loader';
import type { SamlInstanceSettingsLoader } from '../loaders/saml.instance-settings-loader';
import type { SecurityPolicyInstanceSettingsLoader } from '../loaders/security-policy.instance-settings-loader';

describe('InstanceSettingsLoaderService', () => {
	const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });
	const ownerLoader = mock<OwnerInstanceSettingsLoader>();
	const oidcLoader = mock<OidcInstanceSettingsLoader>();
	const securityPolicyLoader = mock<SecurityPolicyInstanceSettingsLoader>();
	const samlLoader = mock<SamlInstanceSettingsLoader>();

	beforeEach(() => {
		jest.resetAllMocks();
		logger.scoped.mockReturnThis();
		ownerLoader.run.mockResolvedValue('skipped');
		oidcLoader.run.mockResolvedValue('skipped');
		securityPolicyLoader.run.mockResolvedValue('skipped');
		samlLoader.run.mockResolvedValue('skipped');
	});

	const createService = () =>
		new InstanceSettingsLoaderService(
			logger,
			ownerLoader,
			oidcLoader,
			securityPolicyLoader,
			samlLoader,
		);

	it('should run all loaders', async () => {
		await createService().init();

		expect(ownerLoader.run).toHaveBeenCalled();
		expect(oidcLoader.run).toHaveBeenCalled();
		expect(securityPolicyLoader.run).toHaveBeenCalled();
		expect(samlLoader.run).toHaveBeenCalled();
	});

	it('should log each loader result', async () => {
		ownerLoader.run.mockResolvedValue('created');
		samlLoader.run.mockResolvedValue('created');

		await createService().init();

		expect(logger.debug).toHaveBeenCalledWith('Instance settings loader "owner": created');
		expect(logger.debug).toHaveBeenCalledWith('Instance settings loader "oidc": skipped');
		expect(logger.debug).toHaveBeenCalledWith(
			'Instance settings loader "security-policy": skipped',
		);
		expect(logger.debug).toHaveBeenCalledWith('Instance settings loader "saml": created');
	});

	it('should stop execution if a loader throws', async () => {
		oidcLoader.run.mockRejectedValue(new Error('oidc failure'));

		await expect(createService().init()).rejects.toThrow('oidc failure');

		expect(ownerLoader.run).toHaveBeenCalled();
		expect(securityPolicyLoader.run).not.toHaveBeenCalled();
		expect(samlLoader.run).not.toHaveBeenCalled();
	});
});
