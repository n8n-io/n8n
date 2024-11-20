import { mock } from 'jest-mock-extended';
import { Client } from 'ldapts';
import type { Cipher } from 'n8n-core';

import config from '@/config';
import { AuthIdentityRepository } from '@/databases/repositories/auth-identity.repository';
import { SettingsRepository } from '@/databases/repositories/settings.repository';
import {
	BINARY_AD_ATTRIBUTES,
	LDAP_LOGIN_ENABLED,
	LDAP_LOGIN_LABEL,
	LDAP_FEATURE_NAME,
} from '@/ldap/constants';
import { LdapService } from '@/ldap/ldap.service.ee';
import type { LdapConfig } from '@/ldap/types';
import { mockInstance, mockLogger } from '@test/mocking';

// Mock ldapts client
jest.mock('ldapts', () => {
	const ClientMock = jest.fn();

	ClientMock.prototype.bind = jest.fn();
	ClientMock.prototype.unbind = jest.fn();
	ClientMock.prototype.startTLS = jest.fn();
	ClientMock.prototype.search = jest.fn();

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

	describe('loadConfig()', () => {
		it('should retrieve the LDAP configuration from the settings repository', async () => {
			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockResolvedValue({
					value: JSON.stringify(ldapConfig),
				}),
			});

			const ldapService = new LdapService(mockLogger(), settingsRepository, mock(), mock());

			await ldapService.loadConfig();

			expect(settingsRepository.findOneByOrFail).toHaveBeenCalledTimes(1);
		});

		it('should throw an expected error if the LDAP configuration is not found', async () => {
			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockRejectedValue(new Error('LDAP configuration not found')),
			});

			const ldapService = new LdapService(mockLogger(), settingsRepository, mock(), mock());

			await expect(ldapService.loadConfig()).rejects.toThrowError('LDAP configuration not found');
		});

		it('should decipher the LDAP configuration admin password', async () => {
			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockResolvedValue({
					value: JSON.stringify(ldapConfig),
				}),
			});

			const cipherMock = mock<Cipher>({
				decrypt: jest.fn(),
			});

			const ldapService = new LdapService(mockLogger(), settingsRepository, cipherMock, mock());

			await ldapService.loadConfig();

			expect(cipherMock.decrypt).toHaveBeenCalledTimes(1);
			expect(cipherMock.decrypt).toHaveBeenCalledWith(ldapConfig.bindingAdminPassword);
		});

		it('should return the expected LDAP configuration', async () => {
			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockResolvedValue({
					value: JSON.stringify(ldapConfig),
				}),
			});

			const cipherMock = mock<Cipher>({
				decrypt: jest.fn().mockReturnValue('decryptedPassword'),
			});

			const ldapService = new LdapService(mockLogger(), settingsRepository, cipherMock, mock());

			const config = await ldapService.loadConfig();

			expect(config).toEqual({ ...ldapConfig, bindingAdminPassword: 'decryptedPassword' });
		});
	});

	describe('updateConfig()', () => {
		it('should throw expected error if the LDAP configuration is invalid', async () => {
			const settingsRepository = mockInstance(SettingsRepository, {
				findOneByOrFail: jest.fn().mockResolvedValue({ value: JSON.stringify(ldapConfig) }),
			}); // set in container so `setCurrentAuthenticationMethod` does not fail - legacy LDAP code not using DI

			const invalidLdapConfig = { ...ldapConfig, loginEnabled: 'notABoolean' };

			const ldapService = new LdapService(mockLogger(), settingsRepository, mock(), mock());

			await expect(
				ldapService.updateConfig(invalidLdapConfig as unknown as LdapConfig),
			).rejects.toThrowError('request.body.loginEnabled is not of a type(s) boolean');
		});

		it('should throw expected error if login is enabled and the current authentication method is "saml"', async () => {
			const settingsRepository = mockInstance(SettingsRepository, {
				findOneByOrFail: jest.fn().mockResolvedValue({ value: JSON.stringify(ldapConfig) }),
			}); // set in container so `setCurrentAuthenticationMethod` does not fail - legacy LDAP code not using DI

			config.set('userManagement.authenticationMethod', 'saml');
			const ldapService = new LdapService(mockLogger(), settingsRepository, mock(), mock());

			await expect(ldapService.updateConfig(ldapConfig)).rejects.toThrowError(
				'LDAP cannot be enabled if SSO in enabled',
			);
		});

		it('should encrypt the binding admin password', async () => {
			const settingsRepository = mockInstance(SettingsRepository, {
				findOneByOrFail: jest.fn().mockResolvedValue({ value: JSON.stringify(ldapConfig) }),
			}); // set in container so `setCurrentAuthenticationMethod` does not fail - legacy LDAP code not using DI

			const cipherMock = mock<Cipher>({
				encrypt: jest.fn().mockReturnValue('encryptedPassword'),
			});

			config.set('userManagement.authenticationMethod', 'email');
			const ldapService = new LdapService(mockLogger(), settingsRepository, cipherMock, mock());

			const newConfig = { ...ldapConfig };
			await ldapService.updateConfig(newConfig);

			expect(cipherMock.encrypt).toHaveBeenCalledTimes(1);
			expect(cipherMock.encrypt).toHaveBeenCalledWith(ldapConfig.bindingAdminPassword);
			expect(newConfig.bindingAdminPassword).toEqual('encryptedPassword');
		});

		it('should delete all ldap identities if login is disabled and ldap users exist', async () => {
			const settingsRepository = mockInstance(SettingsRepository, {
				findOneByOrFail: jest.fn().mockResolvedValue({ value: JSON.stringify(ldapConfig) }),
			}); // set in container so `setCurrentAuthenticationMethod` does not fail - legacy LDAP code not using DI

			const authIdentityRepository = mockInstance(AuthIdentityRepository, {
				find: jest.fn().mockResolvedValue([{ user: { id: 'userId' } }]),
				delete: jest.fn(),
			});

			const cipherMock = mock<Cipher>({
				encrypt: jest.fn().mockReturnValue('encryptedPassword'),
			});

			config.set('userManagement.authenticationMethod', 'email');
			const ldapService = new LdapService(mockLogger(), settingsRepository, cipherMock, mock());

			const newConfig = { ...ldapConfig, loginEnabled: false, synchronizationEnabled: true };
			await ldapService.updateConfig(newConfig);

			expect(newConfig.synchronizationEnabled).toBeFalsy();
			expect(authIdentityRepository.delete).toHaveBeenCalledTimes(1);
			expect(authIdentityRepository.delete).toHaveBeenCalledWith({ providerType: 'ldap' });
		});

		it('should not delete ldap identities if login is disabled and there are no ldap identities', async () => {
			const settingsRepository = mockInstance(SettingsRepository, {
				findOneByOrFail: jest.fn().mockResolvedValue({ value: JSON.stringify(ldapConfig) }),
			}); // set in container so `setCurrentAuthenticationMethod` does not fail - legacy LDAP code not using DI

			const authIdentityRepository = mockInstance(AuthIdentityRepository, {
				find: jest.fn().mockResolvedValue([]),
				delete: jest.fn(),
			});

			const cipherMock = mock<Cipher>({
				encrypt: jest.fn().mockReturnValue('encryptedPassword'),
			});

			config.set('userManagement.authenticationMethod', 'email');
			const ldapService = new LdapService(mockLogger(), settingsRepository, cipherMock, mock());

			const newConfig = { ...ldapConfig, loginEnabled: false, synchronizationEnabled: true };
			await ldapService.updateConfig(newConfig);

			expect(newConfig.synchronizationEnabled).toBeFalsy();
			expect(authIdentityRepository.delete).not.toHaveBeenCalled();
			expect(authIdentityRepository.delete).not.toHaveBeenCalled();
		});

		it('should update the LDAP configuration in the settings repository', async () => {
			const settingsRepository = mockInstance(SettingsRepository, {
				findOneByOrFail: jest.fn().mockResolvedValue({ value: JSON.stringify(ldapConfig) }),
				update: jest.fn(),
			}); // set in container so `setCurrentAuthenticationMethod` does not fail - legacy LDAP code not using DI

			mockInstance(AuthIdentityRepository, {
				find: jest.fn().mockResolvedValue([{ user: { id: 'userId' } }]),
				delete: jest.fn(),
			});

			const cipherMock = mock<Cipher>({
				encrypt: jest.fn().mockReturnValue('encryptedPassword'),
			});

			config.set('userManagement.authenticationMethod', 'email');
			const ldapService = new LdapService(mockLogger(), settingsRepository, cipherMock, mock());

			const newConfig = { ...ldapConfig, loginEnabled: false, synchronizationEnabled: true };
			await ldapService.updateConfig(newConfig);

			expect(settingsRepository.update).toHaveBeenCalledTimes(1);
			expect(settingsRepository.update).toHaveBeenCalledWith(
				{ key: LDAP_FEATURE_NAME },
				{ value: JSON.stringify(newConfig), loadOnStartup: true },
			);
		});

		it('should update the LDAP login label in the config', async () => {
			const settingsRepository = mockInstance(SettingsRepository, {
				findOneByOrFail: jest.fn().mockResolvedValue({ value: JSON.stringify(ldapConfig) }),
				update: jest.fn(),
			}); // set in container so `setCurrentAuthenticationMethod` does not fail - legacy LDAP code not using DI

			mockInstance(AuthIdentityRepository, {
				find: jest.fn().mockResolvedValue([{ user: { id: 'userId' } }]),
				delete: jest.fn(),
			});

			const cipherMock = mock<Cipher>({
				encrypt: jest.fn().mockReturnValue('encryptedPassword'),
			});
			const configSetSpy = jest.spyOn(config, 'set');

			config.set('userManagement.authenticationMethod', 'email');
			const ldapService = new LdapService(mockLogger(), settingsRepository, cipherMock, mock());

			const newConfig = {
				...ldapConfig,
				loginEnabled: false,
				synchronizationEnabled: true,
				loginLabel: 'newLoginLabel',
			};
			await ldapService.updateConfig(newConfig);

			expect(configSetSpy).toHaveBeenNthCalledWith(4, LDAP_LOGIN_LABEL, newConfig.loginLabel);
		});
	});

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

	describe('searchWithAdminBinding()', () => {
		it('should bind admin client', async () => {
			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockResolvedValue({
					value: JSON.stringify(ldapConfig),
				}),
			});

			const cipherMock = mock<Cipher>({
				decrypt: jest.fn().mockReturnValue('decryptedPassword'),
			});

			Client.prototype.search = jest.fn().mockResolvedValue({ searchEntries: [] });

			const filter = '';

			const ldapService = new LdapService(mockLogger(), settingsRepository, cipherMock, mock());

			await ldapService.init();
			await ldapService.searchWithAdminBinding(filter);

			expect(Client.prototype.bind).toHaveBeenCalledTimes(1);
			expect(Client.prototype.bind).toHaveBeenCalledWith(
				ldapConfig.bindingAdminDn,
				'decryptedPassword',
			);
		});

		it('should call client search with expected parameters', async () => {
			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockResolvedValue({
					value: JSON.stringify(ldapConfig),
				}),
			});

			const cipherMock = mock<Cipher>({
				decrypt: jest.fn().mockReturnValue('decryptedPassword'),
			});

			const filter = '';

			Client.prototype.search = jest.fn().mockResolvedValue({ searchEntries: [] });

			const ldapService = new LdapService(mockLogger(), settingsRepository, cipherMock, mock());

			await ldapService.init();
			await ldapService.searchWithAdminBinding(filter);

			expect(Client.prototype.search).toHaveBeenCalledTimes(1);
			expect(Client.prototype.search).toHaveBeenLastCalledWith(ldapConfig.baseDn, {
				attributes: [
					ldapConfig.emailAttribute,
					ldapConfig.ldapIdAttribute,
					ldapConfig.firstNameAttribute,
					ldapConfig.lastNameAttribute,
					ldapConfig.emailAttribute,
				],
				explicitBufferAttributes: BINARY_AD_ATTRIBUTES,
				filter,
				timeLimit: ldapConfig.searchTimeout,
				paged: { pageSize: ldapConfig.searchPageSize },
			});
		});

		it('should call client search with expected parameters when searchPageSize is 0', async () => {
			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockResolvedValue({
					value: JSON.stringify({ ...ldapConfig, searchPageSize: 0 }),
				}),
			});

			const cipherMock = mock<Cipher>({
				decrypt: jest.fn().mockReturnValue('decryptedPassword'),
			});

			const filter = '';

			Client.prototype.search = jest.fn().mockResolvedValue({ searchEntries: [] });

			const ldapService = new LdapService(mockLogger(), settingsRepository, cipherMock, mock());

			await ldapService.init();
			await ldapService.searchWithAdminBinding(filter);

			expect(Client.prototype.search).toHaveBeenCalledTimes(1);
			expect(Client.prototype.search).toHaveBeenLastCalledWith(ldapConfig.baseDn, {
				attributes: [
					ldapConfig.emailAttribute,
					ldapConfig.ldapIdAttribute,
					ldapConfig.firstNameAttribute,
					ldapConfig.lastNameAttribute,
					ldapConfig.emailAttribute,
				],
				explicitBufferAttributes: BINARY_AD_ATTRIBUTES,
				filter,
				timeLimit: ldapConfig.searchTimeout,
				paged: true,
			});
		});

		it('should unbind client after search', async () => {
			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockResolvedValue({
					value: JSON.stringify(ldapConfig),
				}),
			});

			const cipherMock = mock<Cipher>({
				decrypt: jest.fn().mockReturnValue('decryptedPassword'),
			});

			Client.prototype.search = jest.fn().mockResolvedValue({ searchEntries: [] });

			const filter = '';

			const ldapService = new LdapService(mockLogger(), settingsRepository, cipherMock, mock());

			await ldapService.init();
			await ldapService.searchWithAdminBinding(filter);

			expect(Client.prototype.unbind).toHaveBeenCalledTimes(1);
		});

		it('should return expected search entries', async () => {
			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockResolvedValue({
					value: JSON.stringify(ldapConfig),
				}),
			});

			const cipherMock = mock<Cipher>({
				decrypt: jest.fn().mockReturnValue('decryptedPassword'),
			});

			const userList = [
				{
					dn: 'uid=jdoe,ou=users,dc=example,dc=com',
					cn: 'Jo Doe',
					sn: 'Doe',
					mail: 'jdoe@example.com',
					memberOf: 'cn=admins,ou=groups,dc=example,dc=com',
				},
				{
					dn: 'uid=ghopper,ou=users,dc=example,dc=com',
					cn: 'Grace Hopper',
					sn: 'Hopper',
					mail: 'ghopper@nasa.com',
					memberOf: 'cn=admins,ou=groups,dc=example,dc=com',
				},
			];
			Client.prototype.search = jest.fn().mockResolvedValue({
				searchEntries: userList,
			});

			const filter = '';

			const ldapService = new LdapService(mockLogger(), settingsRepository, cipherMock, mock());

			await ldapService.init();
			const results = await ldapService.searchWithAdminBinding(filter);

			expect(results).toEqual(userList);
		});
	});

	describe('validUser()', () => {
		it('should throw expected error if no configuration has been set', async () => {
			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockResolvedValue({
					value: JSON.stringify(ldapConfig),
				}),
			});

			const ldapService = new LdapService(mockLogger(), settingsRepository, mock(), mock());

			await expect(ldapService.validUser('dn', 'password')).rejects.toThrowError(
				'Service cannot be used without setting the property config',
			);
		});

		it('should bind the ldap client with the expected distinguished name and password', async () => {
			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockResolvedValue({
					value: JSON.stringify(ldapConfig),
				}),
			});

			const distinguishedName = 'uid=jdoe,ou=users,dc=example,dc=com';
			const password = 'password';

			const ldapService = new LdapService(mockLogger(), settingsRepository, mock(), mock());

			await ldapService.init();
			await ldapService.validUser(distinguishedName, password);

			expect(Client.prototype.bind).toHaveBeenCalledTimes(1);
			expect(Client.prototype.bind).toHaveBeenCalledWith(distinguishedName, password);
		});

		it('should throw expected error if binding fails', async () => {
			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockResolvedValue({
					value: JSON.stringify(ldapConfig),
				}),
			});

			const distinguishedName = 'uid=jdoe,ou=users,dc=example,dc=com';
			const password = 'password';

			const ldapService = new LdapService(mockLogger(), settingsRepository, mock(), mock());

			Client.prototype.bind = jest
				.fn()
				.mockRejectedValue(new Error('Error validating user against LDAP server'));

			await ldapService.init();

			await expect(ldapService.validUser(distinguishedName, password)).rejects.toThrowError(
				'Error validating user against LDAP server',
			);
		});

		it('should unbind the client binding', async () => {
			const settingsRepository = mock<SettingsRepository>({
				findOneByOrFail: jest.fn().mockResolvedValue({
					value: JSON.stringify(ldapConfig),
				}),
			});

			const distinguishedName = 'uid=jdoe,ou=users,dc=example,dc=com';
			const password = 'password';

			const ldapService = new LdapService(mockLogger(), settingsRepository, mock(), mock());

			await ldapService.init();
			await ldapService.validUser(distinguishedName, password);

			expect(Client.prototype.unbind).toHaveBeenCalledTimes(1);
		});
	});

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

	describe('runSync()', () => {
		it.todo('should search for users with expected parameters');
		it.todo('should resolve binary attributes');
		it.todo('should throw expected error if search fails');
		it.todo('should process users if mode is "live"');
		it.todo('should write expected data to the database');
		it.todo(
			'should write expected data to the database with an error message if processing users fails',
		);
		it.todo('should emit expected event if synchronization is enabled');
		it.todo('should emit expected event if synchronization is disabled');
	});

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
