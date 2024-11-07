import { mock } from 'jest-mock-extended';

import { Client } from 'ldapts';
import config from '@/config';
import { SettingsRepository } from '@/databases/repositories/settings.repository';
import { LDAP_LOGIN_ENABLED, LDAP_LOGIN_LABEL } from '@/ldap/constants';
import { LdapService } from '@/ldap/ldap.service.ee';
import type { LdapConfig } from '@/ldap/types';
import { mockInstance, mockLogger } from '@test/mocking';

// Mock ldapts client
jest.mock('ldapts', () => {
	const ClientMock = jest.fn();

	ClientMock.prototype.bind = jest.fn();
	ClientMock.prototype.unbind = jest.fn();
	ClientMock.prototype.startTLS = jest.fn();

	return { Client: ClientMock };
});

describe('LdapService', () => {
	const ldapConfig: LdapConfig = {
		loginEnabled: true,
		loginLabel: 'fakeLoginLabel',
		connectionUrl: 'connection.url',
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
			expect(setIntervalSpy).not.toHaveBeenCalled();
		});
	});

	describe.skip('loadConfig()', () => {});
	describe.skip('updateConfig()', () => {});
	describe('setConfig()', () => {
		it('should stop synchronization if the timer is running and the config is disabled', async () => {
			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockResolvedValue({
					value: JSON.stringify(ldapConfig),
				}),
			});

			const updatedLdapConfig = { ...ldapConfig, synchronizationEnabled: false };

			const ldapService = new LdapService(mockLogger(), settingsRepository, mock(), mock());
			const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

			await ldapService.init();
			ldapService.setConfig(updatedLdapConfig);

			expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
		});

		it('should schedule synchronization if the timer is not running and the config is enabled', () => {
			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockResolvedValue({
					value: JSON.stringify(ldapConfig),
				}),
			});

			const updatedLdapConfig = {
				...ldapConfig,
				synchronizationEnabled: true,
				synchronizationInterval: 999,
			};

			const ldapService = new LdapService(mockLogger(), settingsRepository, mock(), mock());
			const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
			const setIntervalSpy = jest.spyOn(global, 'setInterval');

			ldapService.setConfig(updatedLdapConfig);

			expect(clearIntervalSpy).not.toHaveBeenCalled();
			expect(setIntervalSpy).toHaveBeenCalledTimes(1);
			expect(setIntervalSpy).toHaveBeenCalledWith(
				expect.any(Function),
				updatedLdapConfig.synchronizationInterval * 60_000,
			);
		});

		it('should throw an error if the timer is not running and the config is enabled but the synchronizationInterval is not set', async () => {
			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockResolvedValue({
					value: JSON.stringify(ldapConfig),
				}),
			});

			const updatedLdapConfig = {
				...ldapConfig,
				synchronizationEnabled: true,
				synchronizationInterval: 0,
			};

			const ldapService = new LdapService(mockLogger(), settingsRepository, mock(), mock());
			const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
			const setIntervalSpy = jest.spyOn(global, 'setInterval');

			const thrownSetConfig = () => ldapService.setConfig(updatedLdapConfig);

			expect(thrownSetConfig).toThrowError('Interval variable has to be defined');
			expect(setIntervalSpy).not.toHaveBeenCalled();
			expect(clearIntervalSpy).not.toHaveBeenCalled();
		});

		it('should restart synchronization if the timer is running and the config is enabled', async () => {
			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockResolvedValue({
					value: JSON.stringify(ldapConfig),
				}),
			});

			const updatedLdapConfig = {
				...ldapConfig,
				synchronizationEnabled: true,
				synchronizationInterval: 1234,
			};

			const ldapService = new LdapService(mockLogger(), settingsRepository, mock(), mock());
			const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
			const setIntervalSpy = jest.spyOn(global, 'setInterval');

			await ldapService.init();
			ldapService.setConfig(updatedLdapConfig);

			expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
			expect(setIntervalSpy).toHaveBeenCalledTimes(2);
			expect(setIntervalSpy).toHaveBeenNthCalledWith(
				1,
				expect.any(Function),
				ldapConfig.synchronizationInterval * 60_000,
			);
			expect(setIntervalSpy).toHaveBeenNthCalledWith(
				2,
				expect.any(Function),
				updatedLdapConfig.synchronizationInterval * 60_000,
			);
		});
	});
	describe.skip('searchWithAdminBinding()', () => {});
	describe.skip('validUser()', () => {});
	describe.skip('findAndAuthenticateLdapUser()', () => {});
	describe('testConnection()', () => {
		it('should throw expected error if init() is not called first', async () => {
			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockResolvedValue({
					value: JSON.stringify(ldapConfig),
				}),
			});

			const ldapService = new LdapService(mockLogger(), settingsRepository, mock(), mock());

			await expect(ldapService.testConnection()).rejects.toThrowError(
				'Service cannot be used without setting the property config',
			);
		});

		it('should create a new client without TLS if connectionSecurity is set to "none"', async () => {
			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockResolvedValue({
					value: JSON.stringify({ ...ldapConfig, connectionSecurity: 'none' }),
				}),
			});

			const ldapService = new LdapService(mockLogger(), settingsRepository, mock(), mock());

			await ldapService.init();
			await ldapService.testConnection();

			expect(Client).toHaveBeenCalledTimes(1);
			expect(Client).toHaveBeenCalledWith({
				url: `ldap://${ldapConfig.connectionUrl}:${ldapConfig.connectionPort}`,
			});
		});

		it('should create a new client with TLS enabled if connectionSecurity is set to "tls" and allowing unauthorized certificates', async () => {
			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockResolvedValue({
					value: JSON.stringify({
						...ldapConfig,
						connectionSecurity: 'tls',
						allowUnauthorizedCerts: true,
					}),
				}),
			});

			const ldapService = new LdapService(mockLogger(), settingsRepository, mock(), mock());

			await ldapService.init();
			await ldapService.testConnection();

			expect(Client).toHaveBeenCalledTimes(1);
			expect(Client).toHaveBeenCalledWith({
				url: `ldaps://${ldapConfig.connectionUrl}:${ldapConfig.connectionPort}`,
				tlsOptions: {
					rejectUnauthorized: false,
				},
			});
		});

		it('should create a new client with TLS enabled if connectionSecurity is set to "tls" and not allowing unauthorized certificates', async () => {
			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockResolvedValue({
					value: JSON.stringify({
						...ldapConfig,
						connectionSecurity: 'tls',
						allowUnauthorizedCerts: false,
					}),
				}),
			});

			const ldapService = new LdapService(mockLogger(), settingsRepository, mock(), mock());

			await ldapService.init();
			await ldapService.testConnection();

			expect(Client).toHaveBeenCalledTimes(1);
			expect(Client).toHaveBeenCalledWith({
				url: `ldaps://${ldapConfig.connectionUrl}:${ldapConfig.connectionPort}`,
				tlsOptions: {
					rejectUnauthorized: true,
				},
			});
		});

		it('should create a new client and start TLS if connectionSecurity is set to "startTls"', async () => {
			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockResolvedValue({
					value: JSON.stringify({
						...ldapConfig,
						connectionSecurity: 'startTls',
						allowUnauthorizedCerts: true,
					}),
				}),
			});

			const ldapService = new LdapService(mockLogger(), settingsRepository, mock(), mock());

			await ldapService.init();
			await ldapService.testConnection();

			expect(Client).toHaveBeenCalledTimes(1);
			expect(Client.prototype.startTLS).toHaveBeenCalledTimes(1);
			expect(Client.prototype.startTLS).toHaveBeenCalledWith({
				rejectUnauthorized: false,
			});
		});

		it('should not create a new client if one has already been created', async () => {
			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockResolvedValue({
					value: JSON.stringify(ldapConfig),
				}),
			});

			const ldapService = new LdapService(mockLogger(), settingsRepository, mock(), mock());

			await ldapService.init();
			await ldapService.testConnection();

			expect(Client).toHaveBeenCalledTimes(1);

			await ldapService.testConnection();
			expect(Client).toHaveBeenCalledTimes(1);
		});
	});

	describe.skip('runSync()', () => {});
	describe('stopSync()', () => {
		it('should clear the scheduled timer', async () => {
			const givenConfig = {
				...ldapConfig,
				synchronizationEnabled: true,
				synchronizationInterval: 10,
			};

			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockResolvedValue({ value: JSON.stringify(givenConfig) }),
			});

			const ldapService = new LdapService(mockLogger(), settingsRepository, mock(), mock());

			const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

			await ldapService.init();
			await ldapService.stopSync();

			expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
		});
	});
});
