import { LicenseState, Logger } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import { CacheService, EventService } from '@n8n/backend-services';
import { GlobalConfig } from '@n8n/config';
import { SettingsRepository, type Settings } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import config from '@/config';

import { ScimSwitchReader } from '../scim-switch-reader';
import {
	emitSsoLoginDisabled,
	isSamlOrOidcLoginEnabled,
	isSsoCurrentAuthenticationMethod,
	reloadAuthenticationMethod,
} from '../sso-helpers';

vi.mock('@/config');

describe('sso-helpers', () => {
	let settingsRepository: SettingsRepository;
	let mockConfig: any;

	beforeEach(() => {
		vi.resetAllMocks();
		Container.reset();

		settingsRepository = mock<SettingsRepository>();
		Container.set(SettingsRepository, settingsRepository);

		mockConfig = {
			set: vi.fn(),
		};
		(config as any).set = mockConfig.set;
	});

	describe('reloadAuthenticationMethod', () => {
		it('should reload authentication method from database', async () => {
			const mockSetting = {
				key: 'userManagement.authenticationMethod',
				value: 'oidc',
			};

			settingsRepository.findByKey = vi.fn().mockResolvedValue(mockSetting);

			await reloadAuthenticationMethod();

			expect(settingsRepository.findByKey).toHaveBeenCalledWith(
				'userManagement.authenticationMethod',
			);
			expect(mockConfig.set).toHaveBeenCalledWith('userManagement.authenticationMethod', 'oidc');
		});

		it('should handle valid authentication methods', async () => {
			const validMethods = ['ldap', 'email', 'saml', 'oidc'];

			for (const method of validMethods) {
				const mockSetting = {
					key: 'userManagement.authenticationMethod',
					value: method,
				};

				settingsRepository.findByKey = vi.fn().mockResolvedValue(mockSetting);

				await reloadAuthenticationMethod();

				expect(mockConfig.set).toHaveBeenCalledWith('userManagement.authenticationMethod', method);
			}
		});

		it('should handle invalid authentication method', async () => {
			const mockSetting = {
				key: 'userManagement.authenticationMethod',
				value: 'invalid-method',
			};

			settingsRepository.findByKey = vi.fn().mockResolvedValue(mockSetting);

			await reloadAuthenticationMethod();

			expect(mockConfig.set).not.toHaveBeenCalled();
		});

		it('should handle missing authentication method setting', async () => {
			settingsRepository.findByKey = vi.fn().mockResolvedValue(null);

			await reloadAuthenticationMethod();

			expect(settingsRepository.findByKey).toHaveBeenCalledWith(
				'userManagement.authenticationMethod',
			);
			expect(mockConfig.set).not.toHaveBeenCalled();
		});

		it('should handle database errors gracefully', async () => {
			const error = new Error('Database connection failed');
			settingsRepository.findByKey = vi.fn().mockRejectedValue(error);

			await expect(reloadAuthenticationMethod()).rejects.toThrow('Database connection failed');

			expect(mockConfig.set).not.toHaveBeenCalled();
		});
	});

	describe('isSamlOrOidcLoginEnabled', () => {
		const setState = ({
			method,
			samlLoginEnabled = false,
			oidcLoginEnabled = false,
			licensed = true,
		}: {
			method: string;
			samlLoginEnabled?: boolean;
			oidcLoginEnabled?: boolean;
			licensed?: boolean;
		}) => {
			vi.spyOn(config, 'getEnv').mockReturnValue(method);
			Container.set(
				GlobalConfig,
				mock<GlobalConfig>({
					sso: {
						saml: { loginEnabled: samlLoginEnabled },
						oidc: { loginEnabled: oidcLoginEnabled },
					},
				}),
			);
			const licenseState = mock<LicenseState>();
			licenseState.isSamlLicensed.mockReturnValue(licensed);
			licenseState.isOidcLicensed.mockReturnValue(licensed);
			Container.set(LicenseState, licenseState);
		};

		it.each([
			['SAML', { method: 'saml', samlLoginEnabled: true }],
			['OIDC', { method: 'oidc', oidcLoginEnabled: true }],
		])('is true when %s is the licensed and enabled method', (_, state) => {
			setState(state);

			expect(isSamlOrOidcLoginEnabled()).toBe(true);
		});

		it.each([
			['the method is email', { method: 'email', samlLoginEnabled: true, oidcLoginEnabled: true }],
			['the method is LDAP', { method: 'ldap', samlLoginEnabled: true }],
			['SAML login is off', { method: 'saml' }],
			['OIDC login is off', { method: 'oidc' }],
			['SAML is not licensed', { method: 'saml', samlLoginEnabled: true, licensed: false }],
			['OIDC is not licensed', { method: 'oidc', oidcLoginEnabled: true, licensed: false }],
		])('is false when %s', (_, state) => {
			setState(state);

			expect(isSamlOrOidcLoginEnabled()).toBe(false);
		});
	});

	describe('emitSsoLoginDisabled', () => {
		const eventService = mock<EventService>();
		const logger = mockLogger();
		const licenseState = mock<LicenseState>();
		const cacheService = mock<CacheService>();
		let scimSwitchReader: ScimSwitchReader;
		const turnOffScim = vi.fn<(protocol: 'saml' | 'oidc') => Promise<void>>();

		/** The switch that is saved in the settings table. */
		const savedScimSwitch = (value: string) =>
			vi
				.mocked(settingsRepository.findByKey)
				.mockResolvedValue(mock<Settings>({ key: 'scim.provisioning.enabled', value }));

		beforeEach(() => {
			licenseState.isLicensed.mockReturnValue(true);
			scimSwitchReader = new ScimSwitchReader(
				licenseState,
				settingsRepository,
				cacheService,
				logger,
			);
			Container.set(EventService, eventService);
			Container.set(ScimSwitchReader, scimSwitchReader);
			Container.set(Logger, logger);
		});

		it.each([
			['saml', true],
			['oidc', false],
		] as const)('emits the protocol %s and the SCIM state %s', async (protocol, scimWasEnabled) => {
			scimSwitchReader.register(async () => scimWasEnabled, turnOffScim);

			await emitSsoLoginDisabled(protocol);

			expect(eventService.emit).toHaveBeenCalledExactlyOnceWith('sso-login-disabled', {
				protocol,
				scimWasEnabled,
			});
		});

		// Without `feat:scim` the module does not start, so a stored switch
		// from before must not count.
		it('reports SCIM as off without feat:scim, also when the saved switch is on', async () => {
			licenseState.isLicensed.mockReturnValue(false);
			savedScimSwitch('true');

			await emitSsoLoginDisabled('saml');

			expect(licenseState.isLicensed).toHaveBeenCalledWith('feat:scim');
			expect(eventService.emit).toHaveBeenCalledExactlyOnceWith('sso-login-disabled', {
				protocol: 'saml',
				scimWasEnabled: false,
			});
		});

		// The SSO env loader runs at startup, before the SCIM module starts.
		it.each([
			['true', true],
			['false', false],
		])(
			'reports the saved switch %s while the SCIM module has not started',
			async (saved, scimWasEnabled) => {
				savedScimSwitch(saved);

				await emitSsoLoginDisabled('oidc');

				expect(settingsRepository.findByKey).toHaveBeenCalledWith('scim.provisioning.enabled');
				expect(eventService.emit).toHaveBeenCalledExactlyOnceWith('sso-login-disabled', {
					protocol: 'oidc',
					scimWasEnabled,
				});
			},
		);

		it('reports SCIM as off when no switch is saved', async () => {
			vi.mocked(settingsRepository.findByKey).mockResolvedValue(null);

			await emitSsoLoginDisabled('saml');

			expect(eventService.emit).toHaveBeenCalledExactlyOnceWith('sso-login-disabled', {
				protocol: 'saml',
				scimWasEnabled: false,
			});
		});

		it('reads the switch through the SCIM module once it has started', async () => {
			savedScimSwitch('false');
			scimSwitchReader.register(async () => true, turnOffScim);

			await emitSsoLoginDisabled('saml');

			expect(settingsRepository.findByKey).not.toHaveBeenCalled();
			expect(eventService.emit).toHaveBeenCalledExactlyOnceWith('sso-login-disabled', {
				protocol: 'saml',
				scimWasEnabled: true,
			});
		});

		it('still emits the event when the SCIM state cannot be read', async () => {
			scimSwitchReader.register(async () => {
				throw new Error('db down');
			}, turnOffScim);

			await emitSsoLoginDisabled('saml');

			expect(eventService.emit).toHaveBeenCalledExactlyOnceWith('sso-login-disabled', {
				protocol: 'saml',
				scimWasEnabled: false,
			});
			expect(logger.warn).toHaveBeenCalled();
		});

		// The event reads the switch before SCIM turns off.
		it('turns SCIM off after the event', async () => {
			scimSwitchReader.register(async () => true, turnOffScim);
			turnOffScim.mockImplementation(async () => {
				expect(eventService.emit).toHaveBeenCalledOnce();
			});

			await emitSsoLoginDisabled('oidc');

			expect(turnOffScim).toHaveBeenCalledExactlyOnceWith('oidc');
		});

		// A silent failure leaves SCIM on, and SCIM serves again when single
		// sign-on turns on again.
		it('emits the event and then throws when SCIM does not turn off', async () => {
			const error = new Error('SCIM did not turn off');
			scimSwitchReader.register(async () => true, turnOffScim);
			turnOffScim.mockRejectedValue(error);

			await expect(emitSsoLoginDisabled('saml')).rejects.toBe(error);

			expect(eventService.emit).toHaveBeenCalledExactlyOnceWith('sso-login-disabled', {
				protocol: 'saml',
				scimWasEnabled: true,
			});
		});

		// Without `feat:scim` the module does not start. A switch that stays on
		// would turn SCIM on again with single sign-on when the license comes back.
		it('saves the switch as off while the SCIM module has not started', async () => {
			licenseState.isLicensed.mockReturnValue(false);
			savedScimSwitch('true');

			await expect(emitSsoLoginDisabled('saml')).resolves.toBeUndefined();

			expect(turnOffScim).not.toHaveBeenCalled();
			expect(settingsRepository.upsertByKey).toHaveBeenCalledExactlyOnceWith(
				'scim.provisioning.enabled',
				'false',
				true,
				{},
			);
			expect(cacheService.set).toHaveBeenCalledWith('scim.provisioning.enabled', 'false');
		});

		it.each([['false'], [null]])(
			'writes nothing while the SCIM module has not started and the saved switch is %s',
			async (saved) => {
				if (saved === null) vi.mocked(settingsRepository.findByKey).mockResolvedValue(null);
				else savedScimSwitch(saved);

				await emitSsoLoginDisabled('oidc');

				expect(settingsRepository.upsertByKey).not.toHaveBeenCalled();
				expect(cacheService.set).not.toHaveBeenCalled();
			},
		);
	});

	describe('isSsoCurrentAuthenticationMethod', () => {
		it('should return true if the current authentication method is SAML, LDAP, or OIDC', () => {
			vi.spyOn(config, 'getEnv').mockReturnValue('saml');
			expect(isSsoCurrentAuthenticationMethod()).toBe(true);

			vi.spyOn(config, 'getEnv').mockReturnValue('ldap');
			expect(isSsoCurrentAuthenticationMethod()).toBe(true);

			vi.spyOn(config, 'getEnv').mockReturnValue('oidc');
			expect(isSsoCurrentAuthenticationMethod()).toBe(true);
		});

		it('should return false if the current authentication method is email', () => {
			vi.spyOn(config, 'getEnv').mockReturnValue('email');
			expect(isSsoCurrentAuthenticationMethod()).toBe(false);
		});
	});
});
