import type { Logger } from '@n8n/backend-common';
import type { InstanceSettingsLoaderConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import type { OidcInstanceSettingsLoader } from '../../loaders/sso/oidc.instance-settings-loader';
import type { ProvisioningInstanceSettingsLoader } from '../../loaders/sso/provisioning.instance-settings-loader';
import type { SamlInstanceSettingsLoader } from '../../loaders/sso/saml.instance-settings-loader';
import { SsoInstanceSettingsLoader } from '../../loaders/sso/sso.instance-settings-loader';

const mockSetCurrentAuthenticationMethod = jest.fn();
const mockGetCurrentAuthenticationMethod = jest.fn().mockReturnValue('email');
jest.mock('@/sso.ee/sso-helpers', () => ({
	setCurrentAuthenticationMethod: (...args: unknown[]) =>
		mockSetCurrentAuthenticationMethod(...args),
	getCurrentAuthenticationMethod: () => mockGetCurrentAuthenticationMethod(),
}));

describe('SsoInstanceSettingsLoader', () => {
	const logger = mock<Logger>({ scoped: jest.fn().mockReturnThis() });
	const samlLoader = mock<SamlInstanceSettingsLoader>();
	const oidcLoader = mock<OidcInstanceSettingsLoader>();
	const provisioningLoader = mock<ProvisioningInstanceSettingsLoader>();

	const baseConfig: Partial<InstanceSettingsLoaderConfig> = {
		ssoManagedByEnv: false,
		samlLoginEnabled: false,
		oidcLoginEnabled: false,
	};

	const createLoader = (configOverrides: Partial<InstanceSettingsLoaderConfig> = {}) => {
		const config = { ...baseConfig, ...configOverrides } as InstanceSettingsLoaderConfig;
		return new SsoInstanceSettingsLoader(
			config,
			samlLoader,
			oidcLoader,
			provisioningLoader,
			logger,
		);
	};

	beforeEach(() => {
		jest.resetAllMocks();
		logger.scoped.mockReturnThis();
		mockGetCurrentAuthenticationMethod.mockReturnValue('email');
	});

	describe('ssoManagedByEnv gate', () => {
		it('should skip when ssoManagedByEnv is false', async () => {
			const loader = createLoader({ ssoManagedByEnv: false });

			const result = await loader.run();

			expect(result).toBe('skipped');
			expect(samlLoader.apply).not.toHaveBeenCalled();
			expect(oidcLoader.apply).not.toHaveBeenCalled();
			expect(provisioningLoader.apply).not.toHaveBeenCalled();
			expect(mockSetCurrentAuthenticationMethod).not.toHaveBeenCalled();
		});
	});

	describe('mutual exclusion', () => {
		it('should throw when both SAML and OIDC login are enabled', async () => {
			const loader = createLoader({
				ssoManagedByEnv: true,
				samlLoginEnabled: true,
				oidcLoginEnabled: true,
			});

			await expect(loader.run()).rejects.toThrow(
				'N8N_SSO_SAML_LOGIN_ENABLED and N8N_SSO_OIDC_LOGIN_ENABLED cannot both be true',
			);
			expect(samlLoader.apply).not.toHaveBeenCalled();
			expect(oidcLoader.apply).not.toHaveBeenCalled();
			expect(provisioningLoader.apply).not.toHaveBeenCalled();
		});
	});

	describe('ordering', () => {
		it('should call saml, oidc, provisioning, then sync when SAML is enabled', async () => {
			const callOrder: string[] = [];
			samlLoader.apply.mockImplementation(async () => {
				callOrder.push('saml');
			});
			oidcLoader.apply.mockImplementation(async () => {
				callOrder.push('oidc');
			});
			provisioningLoader.apply.mockImplementation(async () => {
				callOrder.push('provisioning');
			});
			mockSetCurrentAuthenticationMethod.mockImplementation(() => {
				callOrder.push('sync');
			});

			const loader = createLoader({ ssoManagedByEnv: true, samlLoginEnabled: true });

			await loader.run();

			expect(callOrder).toEqual(['saml', 'oidc', 'provisioning', 'sync']);
		});

		it('should call saml, oidc, provisioning, then sync when OIDC is enabled', async () => {
			const callOrder: string[] = [];
			samlLoader.apply.mockImplementation(async () => {
				callOrder.push('saml');
			});
			oidcLoader.apply.mockImplementation(async () => {
				callOrder.push('oidc');
			});
			provisioningLoader.apply.mockImplementation(async () => {
				callOrder.push('provisioning');
			});
			mockSetCurrentAuthenticationMethod.mockImplementation(() => {
				callOrder.push('sync');
			});

			const loader = createLoader({ ssoManagedByEnv: true, oidcLoginEnabled: true });

			await loader.run();

			expect(callOrder).toEqual(['saml', 'oidc', 'provisioning', 'sync']);
		});

		it('should not call provisioning when neither SAML nor OIDC is enabled', async () => {
			const loader = createLoader({ ssoManagedByEnv: true });

			const result = await loader.run();

			expect(result).toBe('created');
			expect(provisioningLoader.apply).not.toHaveBeenCalled();
			expect(samlLoader.apply).toHaveBeenCalled();
			expect(oidcLoader.apply).toHaveBeenCalled();
		});
	});

	describe('auth method sync', () => {
		it('should set authentication method to saml when SAML login is enabled', async () => {
			const loader = createLoader({ ssoManagedByEnv: true, samlLoginEnabled: true });

			await loader.run();

			expect(mockSetCurrentAuthenticationMethod).toHaveBeenCalledWith('saml');
		});

		it('should set authentication method to oidc when OIDC login is enabled', async () => {
			const loader = createLoader({ ssoManagedByEnv: true, oidcLoginEnabled: true });

			await loader.run();

			expect(mockSetCurrentAuthenticationMethod).toHaveBeenCalledWith('oidc');
		});

		it('should reset auth method to email when current is saml and neither protocol is enabled', async () => {
			mockGetCurrentAuthenticationMethod.mockReturnValue('saml');
			const loader = createLoader({ ssoManagedByEnv: true });

			await loader.run();

			expect(mockSetCurrentAuthenticationMethod).toHaveBeenCalledWith('email');
		});

		it('should reset auth method to email when current is oidc and neither protocol is enabled', async () => {
			mockGetCurrentAuthenticationMethod.mockReturnValue('oidc');
			const loader = createLoader({ ssoManagedByEnv: true });

			await loader.run();

			expect(mockSetCurrentAuthenticationMethod).toHaveBeenCalledWith('email');
		});

		it('should not change auth method when current is email and neither protocol is enabled', async () => {
			mockGetCurrentAuthenticationMethod.mockReturnValue('email');
			const loader = createLoader({ ssoManagedByEnv: true });

			await loader.run();

			expect(mockSetCurrentAuthenticationMethod).not.toHaveBeenCalled();
		});

		it('should set auth method to saml (not email) when switching from oidc to saml', async () => {
			mockGetCurrentAuthenticationMethod.mockReturnValue('oidc');
			const loader = createLoader({ ssoManagedByEnv: true, samlLoginEnabled: true });

			await loader.run();

			expect(mockSetCurrentAuthenticationMethod).toHaveBeenCalledWith('saml');
			expect(mockSetCurrentAuthenticationMethod).not.toHaveBeenCalledWith('email');
		});

		it('should set auth method to oidc (not email) when switching from saml to oidc', async () => {
			mockGetCurrentAuthenticationMethod.mockReturnValue('saml');
			const loader = createLoader({ ssoManagedByEnv: true, oidcLoginEnabled: true });

			await loader.run();

			expect(mockSetCurrentAuthenticationMethod).toHaveBeenCalledWith('oidc');
			expect(mockSetCurrentAuthenticationMethod).not.toHaveBeenCalledWith('email');
		});
	});
});
