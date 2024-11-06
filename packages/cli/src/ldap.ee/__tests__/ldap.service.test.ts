import { mock } from 'jest-mock-extended';
import { LdapService } from '@/ldap/ldap.service.ee';
import { SettingsRepository } from '@/databases/repositories/settings.repository';
import { Settings } from '@/databases/entities/settings';
import { Logger } from '@/logging/logger.service';
import type { LdapConfig } from '@/ldap/types';
import { mockInstance } from '@test/mocking';
import config from '@/config';
import { LDAP_LOGIN_ENABLED, LDAP_LOGIN_LABEL } from '@/ldap/constants';
import { sync } from 'fast-glob';

// Need fake timers to avoid setInterval
// problems with the scheduled sync
jest.useFakeTimers();

describe('LdapService', () => {
	const OLD_ENV = process.env;

	const fakeConfig: LdapConfig = {
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

	beforeEach(() => {
		process.env = { ...OLD_ENV };
	});

	afterEach(() => {
		jest.restoreAllMocks();

		process.env = OLD_ENV;
	});

	describe('init()', () => {
		it('should load the ldap configuration', async () => {
			const settingsRepo = mockInstance(SettingsRepository);

			const ldapService = new LdapService(mock(), settingsRepo, mock(), mock());

			settingsRepo.findOneByOrFail.mockResolvedValue({
				value: JSON.stringify(fakeConfig),
			} as Settings);
			const loadConfigSpy = jest.spyOn(ldapService, 'loadConfig');

			await ldapService.init();

			expect(loadConfigSpy).toHaveBeenCalledTimes(1);
		});

		it('should set expected configuration variables from LDAP config if ldap is enabled', async () => {
			const settingsRepo = mockInstance(SettingsRepository);
			const mockLogger = mock<Logger>();

			const ldapService = new LdapService(mockLogger, settingsRepo, mock(), mock());

			const configSetSpy = jest.spyOn(config, 'set');

			settingsRepo.findOneByOrFail.mockResolvedValue({
				value: JSON.stringify(fakeConfig),
			} as Settings);

			await ldapService.init();

			expect(configSetSpy).toHaveBeenNthCalledWith(1, LDAP_LOGIN_ENABLED, fakeConfig.loginEnabled);
			expect(configSetSpy).toHaveBeenNthCalledWith(
				2,
				'userManagement.authenticationMethod',
				'ldap',
			);
			expect(configSetSpy).toHaveBeenNthCalledWith(3, LDAP_LOGIN_LABEL, fakeConfig.loginLabel);
		});

		it('should set expected configuration variables from LDAP config if ldap is not enabled', async () => {
			const givenConfig = { ...fakeConfig, loginEnabled: false };

			const settingsRepo = mockInstance(SettingsRepository);
			const mockLogger = mock<Logger>();

			const ldapService = new LdapService(mockLogger, settingsRepo, mock(), mock());

			const configSetSpy = jest.spyOn(config, 'set');

			settingsRepo.findOneByOrFail.mockResolvedValue({
				value: JSON.stringify(givenConfig),
			} as Settings);

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
			const settingsRepo = mockInstance(SettingsRepository);
			const mockLogger = mock<Logger>();

			const ldapService = new LdapService(mockLogger, settingsRepo, mock(), mock());

			settingsRepo.findOneByOrFail.mockResolvedValue({
				value: JSON.stringify(fakeConfig),
			} as Settings);
			config.set('userManagement.authenticationMethod', 'invalid');

			await ldapService.init();

			expect(mockLogger.warn).toHaveBeenCalledTimes(1);
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'Cannot set LDAP login enabled state when an authentication method other than email or ldap is active (current: invalid)',
				expect.any(Error),
			);
		});

		it('should schedule syncing if config has enabled synchronization', async () => {
			const givenConfig = {
				...fakeConfig,
				synchronizationEnabled: true,
				synchronizationInterval: 10,
			};
			const settingsRepo = mockInstance(SettingsRepository);
			const mockLogger = mock<Logger>();

			const ldapService = new LdapService(mockLogger, settingsRepo, mock(), mock());

			settingsRepo.findOneByOrFail.mockResolvedValue({
				value: JSON.stringify(givenConfig),
			} as Settings);
			const setIntervalSpy = jest.spyOn(global, 'setInterval');

			await ldapService.init();

			expect(setIntervalSpy).toHaveBeenCalledTimes(1);
			expect(setIntervalSpy).toHaveBeenCalledWith(
				expect.any(Function),
				givenConfig.synchronizationInterval * 60000,
			);
		});

		it('should throw an error if config has enabled synchronization but no synchronizationInterval is set', async () => {
			const givenConfig = {
				...fakeConfig,
				synchronizationEnabled: true,
				synchronizationInterval: 0,
			};
			const settingsRepo = mockInstance(SettingsRepository);
			const mockLogger = mock<Logger>();

			const ldapService = new LdapService(mockLogger, settingsRepo, mock(), mock());

			settingsRepo.findOneByOrFail.mockResolvedValue({
				value: JSON.stringify(givenConfig),
			} as Settings);
			const setIntervalSpy = jest.spyOn(global, 'setInterval');

			await expect(ldapService.init()).rejects.toThrowError('Interval variable has to be defined');
			expect(setIntervalSpy).toHaveBeenCalledTimes(0);
		});
	});
});
