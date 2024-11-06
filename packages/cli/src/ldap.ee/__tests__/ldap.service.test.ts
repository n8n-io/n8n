import { mock } from 'jest-mock-extended';

import config from '@/config';
import { SettingsRepository } from '@/databases/repositories/settings.repository';
import { LDAP_LOGIN_ENABLED, LDAP_LOGIN_LABEL } from '@/ldap/constants';
import { LdapService } from '@/ldap/ldap.service.ee';
import type { LdapConfig } from '@/ldap/types';
import { mockInstance, mockLogger } from '@test/mocking';

describe('LdapService', () => {
	const ldapConfig: LdapConfig = {
		loginEnabled: true,
		loginLabel: 'fakeLoginLabel',
		connectionUrl: 'https://connection.url',
		allowUnauthorizedCerts: true,
		connectionSecurity: 'none',
		connectionPort: 1234,
		baseDn: 'dc=example,dc=com',
		bindingAdminDn: 'uid=jdoe,ou=users,dc=example,dc=com',
		bindingAdminPassword: 'fakePassword',
		firstNameAttribute: 'givenName',
		lastNameAttribute: 'sn',
		emailAttribute: 'mail',
		loginIdAttribute: 'uid',
		ldapIdAttribute: 'uid',
		userFilter: '',
		synchronizationEnabled: true,
		synchronizationInterval: 60,
		searchPageSize: 1,
		searchTimeout: 6,
	};

	beforeAll(() => {
		// Need fake timers to avoid setInterval
		// problems with the scheduled sync
		jest.useFakeTimers();
	});

	beforeEach(() => {
		jest.restoreAllMocks();
	});

	describe('init()', () => {
		it('should load the LDAP configuration', async () => {
			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockResolvedValue({ value: JSON.stringify(ldapConfig) }),
			});

			const ldapService = new LdapService(mockLogger(), settingsRepository, mock(), mock());

			const loadConfigSpy = jest.spyOn(ldapService, 'loadConfig');

			await ldapService.init();

			expect(loadConfigSpy).toHaveBeenCalledTimes(1);
		});

		it('should set expected configuration variables from LDAP config if LDAP is enabled', async () => {
			const settingsRepository = mockInstance(SettingsRepository, {
				findOneByOrFail: jest.fn().mockResolvedValue({ value: JSON.stringify(ldapConfig) }),
			}); // set in container so `setCurrentAuthenticationMethod` does not fail - legacy LDAP code not using DI

			const ldapService = new LdapService(mockLogger(), settingsRepository, mock(), mock());

			const configSetSpy = jest.spyOn(config, 'set');

			await ldapService.init();

			expect(configSetSpy).toHaveBeenNthCalledWith(1, LDAP_LOGIN_ENABLED, ldapConfig.loginEnabled);
			expect(configSetSpy).toHaveBeenNthCalledWith(
				2,
				'userManagement.authenticationMethod',
				'ldap',
			);
			expect(configSetSpy).toHaveBeenNthCalledWith(3, LDAP_LOGIN_LABEL, ldapConfig.loginLabel);
		});

		it('should set expected configuration variables from LDAP config if LDAP is disabled', async () => {
			const givenConfig = { ...ldapConfig, loginEnabled: false };

			const settingsRepository = mockInstance(SettingsRepository, {
				findOneByOrFail: jest.fn().mockResolvedValue({ value: JSON.stringify(givenConfig) }),
			}); // set in container so `setCurrentAuthenticationMethod` does not fail - legacy LDAP code not using DI

			const ldapService = new LdapService(mockLogger(), settingsRepository, mock(), mock());

			const configSetSpy = jest.spyOn(config, 'set');

			await ldapService.init();

			expect(configSetSpy).toHaveBeenNthCalledWith(1, LDAP_LOGIN_ENABLED, givenConfig.loginEnabled);
			expect(configSetSpy).toHaveBeenNthCalledWith(
				2,
				'userManagement.authenticationMethod',
				'email',
			);
			expect(configSetSpy).toHaveBeenNthCalledWith(3, LDAP_LOGIN_LABEL, givenConfig.loginLabel);
		});

		it('should show logger warning if authentication method is not ldap or email', async () => {
			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockResolvedValue({ value: JSON.stringify(ldapConfig) }),
			});

			const logger = mockLogger();

			const ldapService = new LdapService(logger, settingsRepository, mock(), mock());

			config.set('userManagement.authenticationMethod', 'invalid');

			await ldapService.init();

			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				'Cannot set LDAP login enabled state when an authentication method other than email or ldap is active (current: invalid)',
				expect.any(Error),
			);
		});

		it('should schedule syncing if config has enabled synchronization', async () => {
			const givenConfig = {
				...ldapConfig,
				synchronizationEnabled: true,
				synchronizationInterval: 10,
			};

			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockResolvedValue({ value: JSON.stringify(givenConfig) }),
			});

			const ldapService = new LdapService(mockLogger(), settingsRepository, mock(), mock());

			const setIntervalSpy = jest.spyOn(global, 'setInterval');

			await ldapService.init();

			expect(setIntervalSpy).toHaveBeenCalledTimes(1);
			expect(setIntervalSpy).toHaveBeenCalledWith(
				expect.any(Function),
				givenConfig.synchronizationInterval * 60_000,
			);
		});

		it('should throw an error if config has enabled synchronization but no synchronizationInterval is set', async () => {
			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockResolvedValue({
					value: JSON.stringify({
						...ldapConfig,
						synchronizationEnabled: true,
						synchronizationInterval: 0,
					}),
				}),
			});

			const ldapService = new LdapService(mockLogger(), settingsRepository, mock(), mock());

			const setIntervalSpy = jest.spyOn(global, 'setInterval');

			await expect(ldapService.init()).rejects.toThrowError('Interval variable has to be defined');
			expect(setIntervalSpy).toHaveBeenCalledTimes(0);
		});
	});
});
