import { mockLogger, mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { LDAP_FEATURE_NAME, type LdapConfig } from '@n8n/constants';
import type { Settings } from '@n8n/db';
import { AuthIdentityRepository, SettingsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { QueryFailedError } from '@n8n/typeorm';
import { mock } from 'jest-mock-extended';
import { Client } from 'ldapts';
import type { Cipher } from 'n8n-core';
import { randomString } from 'n8n-workflow';

import config from '@/config';
import type { EventService } from '@/events/event.service';

import { BINARY_AD_ATTRIBUTES } from '../constants';
import {
	getLdapIds,
	createFilter,
	escapeFilter,
	resolveBinaryAttributes,
	processUsers,
	mapLdapUserToDbUser,
	saveLdapSynchronization,
	resolveEntryBinaryAttributes,
} from '../helpers.ee';
import { LdapService } from '../ldap.service.ee';

// Mock ldapts client
jest.mock('ldapts', () => {
	const ClientMock = jest.fn();

	ClientMock.prototype.bind = jest.fn();
	ClientMock.prototype.unbind = jest.fn();
	ClientMock.prototype.startTLS = jest.fn();
	ClientMock.prototype.search = jest.fn();

	return { Client: ClientMock };
});

jest.mock('../helpers.ee', () => ({
	...jest.requireActual('../helpers.ee'),
	getLdapIds: jest.fn(),
	saveLdapSynchronization: jest.fn(),
	resolveBinaryAttributes: jest.fn(),
	processUsers: jest.fn(),
	resolveEntryBinaryAttributes: jest.fn(),
}));

jest.mock('n8n-workflow', () => ({
	...jest.requireActual('n8n-workflow'),
	randomString: jest.fn(),
}));

mockInstance(GlobalConfig, {
	sso: {
		ldap: {
			loginEnabled: true,
			loginLabel: 'fakeLoginLabel',
		},
	},
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
		userFilter: '(uid=jdoe)',
		synchronizationEnabled: true,
		synchronizationInterval: 60,
		searchPageSize: 1,
		searchTimeout: 6,
	};

	const settingsRepository = mockInstance(SettingsRepository);

	beforeAll(() => {
		// Need fake timers to avoid setInterval
		// problems with the scheduled sync
		jest.useFakeTimers();
	});

	beforeEach(() => {
		jest.restoreAllMocks();
	});

	const mockSettingsRespositoryFindOneByOrFail = (config: LdapConfig) => {
		settingsRepository.findOneByOrFail.mockResolvedValueOnce({
			value: JSON.stringify(config),
		} as Settings);
	};

	const createDefaultLdapService = (config: LdapConfig) => {
		mockSettingsRespositoryFindOneByOrFail(config);

		return new LdapService(mockLogger(), settingsRepository, mock(), mock());
	};

	describe('init()', () => {
		it('should load the LDAP configuration', async () => {
			const ldapService = createDefaultLdapService(ldapConfig);

			const loadConfigSpy = jest.spyOn(ldapService, 'loadConfig');

			await ldapService.init();

			expect(loadConfigSpy).toHaveBeenCalledTimes(1);
		});

		it('should set expected configuration variables from LDAP config if LDAP is enabled', async () => {
			const ldapService = createDefaultLdapService(ldapConfig);

			const configSetSpy = jest.spyOn(config, 'set');

			await ldapService.init();

			expect(configSetSpy).toHaveBeenNthCalledWith(
				1,
				'userManagement.authenticationMethod',
				'ldap',
			);
			expect(Container.get(GlobalConfig).sso.ldap.loginLabel).toBe(ldapConfig.loginLabel);
		});

		it('should set expected configuration variables from LDAP config if LDAP is disabled', async () => {
			const givenConfig = { ...ldapConfig, loginEnabled: false };

			const ldapService = createDefaultLdapService(givenConfig);

			const configSetSpy = jest.spyOn(config, 'set');

			await ldapService.init();

			expect(configSetSpy).toHaveBeenNthCalledWith(
				1,
				'userManagement.authenticationMethod',
				'email',
			);
			expect(Container.get(GlobalConfig).sso.ldap.loginLabel).toBe(ldapConfig.loginLabel);
		});

		it('should show logger warning if authentication method is not ldap or email', async () => {
			mockSettingsRespositoryFindOneByOrFail(ldapConfig);

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

			const ldapService = createDefaultLdapService(givenConfig);

			const setIntervalSpy = jest.spyOn(global, 'setInterval');

			await ldapService.init();

			expect(setIntervalSpy).toHaveBeenCalledTimes(1);
			expect(setIntervalSpy).toHaveBeenCalledWith(
				expect.any(Function),
				givenConfig.synchronizationInterval * 60_000,
			);
		});

		it('should throw an error if config has enabled synchronization but no synchronizationInterval is set', async () => {
			const ldapService = createDefaultLdapService({
				...ldapConfig,
				synchronizationEnabled: true,
				synchronizationInterval: 0,
			});

			const setIntervalSpy = jest.spyOn(global, 'setInterval');

			await expect(ldapService.init()).rejects.toThrowError('Interval variable has to be defined');
			expect(setIntervalSpy).not.toHaveBeenCalled();
		});
	});

	describe('loadConfig()', () => {
		it('should retrieve the LDAP configuration from the settings repository', async () => {
			const ldapService = createDefaultLdapService(ldapConfig);

			await ldapService.loadConfig();

			expect(settingsRepository.findOneByOrFail).toHaveBeenCalledTimes(1);
		});

		it('should throw an expected error if the LDAP configuration is not found', async () => {
			settingsRepository.findOneByOrFail.mockRejectedValue(
				new Error('LDAP configuration not found'),
			);

			const ldapService = new LdapService(mockLogger(), settingsRepository, mock(), mock());

			await expect(ldapService.loadConfig()).rejects.toThrowError('LDAP configuration not found');
		});

		it('should decipher the LDAP configuration admin password', async () => {
			mockSettingsRespositoryFindOneByOrFail(ldapConfig);

			const cipherMock = mock<Cipher>({
				decrypt: jest.fn(),
			});

			const ldapService = new LdapService(mockLogger(), settingsRepository, cipherMock, mock());

			await ldapService.loadConfig();

			expect(cipherMock.decrypt).toHaveBeenCalledTimes(1);
			expect(cipherMock.decrypt).toHaveBeenCalledWith(ldapConfig.bindingAdminPassword);
		});

		it('should return the expected LDAP configuration', async () => {
			mockSettingsRespositoryFindOneByOrFail(ldapConfig);

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
			const ldapService = createDefaultLdapService(ldapConfig);

			const invalidLdapConfig = { ...ldapConfig, loginEnabled: 'notABoolean' };

			await expect(
				ldapService.updateConfig(invalidLdapConfig as unknown as LdapConfig),
			).rejects.toThrowError('request.body.loginEnabled is not of a type(s) boolean');
		});

		it('should throw expected error if login is enabled and the current authentication method is "saml"', async () => {
			config.set('userManagement.authenticationMethod', 'saml');

			const ldapService = createDefaultLdapService(ldapConfig);

			await expect(ldapService.updateConfig(ldapConfig)).rejects.toThrowError(
				'LDAP cannot be enabled if SSO in enabled',
			);
		});

		it('should encrypt the binding admin password', async () => {
			mockSettingsRespositoryFindOneByOrFail(ldapConfig);

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
			mockSettingsRespositoryFindOneByOrFail(ldapConfig);

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
			mockSettingsRespositoryFindOneByOrFail(ldapConfig);

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
			mockSettingsRespositoryFindOneByOrFail(ldapConfig);

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
			mockSettingsRespositoryFindOneByOrFail(ldapConfig);
			mockInstance(AuthIdentityRepository, {
				find: jest.fn().mockResolvedValue([{ user: { id: 'userId' } }]),
				delete: jest.fn(),
			});
			const cipherMock = mock<Cipher>({
				encrypt: jest.fn().mockReturnValue('encryptedPassword'),
			});
			const globalConfig = Container.get(GlobalConfig);
			config.set('userManagement.authenticationMethod', 'email');
			const ldapService = new LdapService(mockLogger(), settingsRepository, cipherMock, mock());

			const newConfig = {
				...ldapConfig,
				loginEnabled: false,
				synchronizationEnabled: true,
				loginLabel: 'newLoginLabel',
			};
			await ldapService.updateConfig(newConfig);
			expect(globalConfig.sso.ldap.loginLabel).toBe(newConfig.loginLabel);
		});
	});

	describe('setConfig()', () => {
		it('should stop synchronization if the timer is running and the config is disabled', async () => {
			const ldapService = createDefaultLdapService(ldapConfig);

			const updatedLdapConfig = { ...ldapConfig, synchronizationEnabled: false };

			const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

			await ldapService.init();
			ldapService.setConfig(updatedLdapConfig);

			expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
		});

		it('should schedule synchronization if the timer is not running and the config is enabled', () => {
			const ldapService = createDefaultLdapService(ldapConfig);

			const updatedLdapConfig = {
				...ldapConfig,
				synchronizationEnabled: true,
				synchronizationInterval: 999,
			};

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
			const ldapService = createDefaultLdapService(ldapConfig);

			const updatedLdapConfig = {
				...ldapConfig,
				synchronizationEnabled: true,
				synchronizationInterval: 0,
			};

			const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
			const setIntervalSpy = jest.spyOn(global, 'setInterval');

			const thrownSetConfig = () => ldapService.setConfig(updatedLdapConfig);

			expect(thrownSetConfig).toThrowError('Interval variable has to be defined');
			expect(setIntervalSpy).not.toHaveBeenCalled();
			expect(clearIntervalSpy).not.toHaveBeenCalled();
		});

		it('should restart synchronization if the timer is running and the config is enabled', async () => {
			const ldapService = createDefaultLdapService(ldapConfig);

			const updatedLdapConfig = {
				...ldapConfig,
				synchronizationEnabled: true,
				synchronizationInterval: 1234,
			};

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
			mockSettingsRespositoryFindOneByOrFail(ldapConfig);

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
			mockSettingsRespositoryFindOneByOrFail(ldapConfig);

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
			mockSettingsRespositoryFindOneByOrFail({ ...ldapConfig, searchPageSize: 0 });

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
			mockSettingsRespositoryFindOneByOrFail(ldapConfig);

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
			mockSettingsRespositoryFindOneByOrFail(ldapConfig);

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
			const ldapService = createDefaultLdapService(ldapConfig);

			await expect(ldapService.validUser('dn', 'password')).rejects.toThrowError(
				'Service cannot be used without setting the property config',
			);
		});

		it('should bind the ldap client with the expected distinguished name and password', async () => {
			const ldapService = createDefaultLdapService(ldapConfig);

			const distinguishedName = 'uid=jdoe,ou=users,dc=example,dc=com';
			const password = 'password';

			await ldapService.init();
			await ldapService.validUser(distinguishedName, password);

			expect(Client.prototype.bind).toHaveBeenCalledTimes(1);
			expect(Client.prototype.bind).toHaveBeenCalledWith(distinguishedName, password);
		});

		it('should throw expected error if binding fails', async () => {
			const ldapService = createDefaultLdapService(ldapConfig);

			const distinguishedName = 'uid=jdoe,ou=users,dc=example,dc=com';
			const password = 'password';

			Client.prototype.bind = jest
				.fn()
				.mockRejectedValue(new Error('Error validating user against LDAP server'));

			await ldapService.init();

			await expect(ldapService.validUser(distinguishedName, password)).rejects.toThrowError(
				'Error validating user against LDAP server',
			);
		});

		it('should unbind the client binding', async () => {
			const ldapService = createDefaultLdapService(ldapConfig);

			const distinguishedName = 'uid=jdoe,ou=users,dc=example,dc=com';
			const password = 'password';

			await ldapService.init();
			await ldapService.validUser(distinguishedName, password);

			expect(Client.prototype.unbind).toHaveBeenCalledTimes(1);
		});
	});

	describe('findAndAuthenticateLdapUser()', () => {
		it('should search for expected admin login ID', async () => {
			const ldapService = createDefaultLdapService(ldapConfig);

			const searchWithAdminBindingSpy = jest.spyOn(ldapService, 'searchWithAdminBinding');
			Client.prototype.search = jest.fn().mockResolvedValue({ searchEntries: [] });

			const mockedGetLdapIds = getLdapIds as jest.Mock;
			mockedGetLdapIds.mockResolvedValue([]);

			const expectedFilter = createFilter(
				`(${ldapConfig.loginIdAttribute}=${escapeFilter('jdoe')})`,
				ldapConfig.userFilter,
			);

			await ldapService.init();
			await ldapService.findAndAuthenticateLdapUser(
				'jdoe',
				'fakePassword',
				ldapConfig.loginIdAttribute,
				ldapConfig.userFilter,
			);

			expect(searchWithAdminBindingSpy).toHaveBeenCalledTimes(1);
			expect(searchWithAdminBindingSpy).toHaveBeenCalledWith(expectedFilter);
		});

		it('should emit expected error if admin search fails', async () => {
			mockSettingsRespositoryFindOneByOrFail(ldapConfig);

			const eventServiceMock = mock<EventService>({
				emit: jest.fn(),
			});

			const ldapService = new LdapService(
				mockLogger(),
				settingsRepository,
				mock(),
				eventServiceMock,
			);
			Client.prototype.search = jest.fn().mockRejectedValue(new Error('Failed to find admin user'));

			const mockedGetLdapIds = getLdapIds as jest.Mock;
			mockedGetLdapIds.mockResolvedValue([]);

			await ldapService.init();
			const result = await ldapService.findAndAuthenticateLdapUser(
				'jdoe',
				'fakePassword',
				ldapConfig.loginIdAttribute,
				ldapConfig.userFilter,
			);

			expect(eventServiceMock.emit).toBeCalledTimes(1);
			expect(eventServiceMock.emit).toHaveBeenCalledWith('ldap-login-sync-failed', {
				error: 'Failed to find admin user',
			});
			expect(result).toBeUndefined();
		});

		it('should return undefined if no user is found', async () => {
			const ldapService = createDefaultLdapService(ldapConfig);

			Client.prototype.search = jest.fn().mockResolvedValue({ searchEntries: [] });

			const mockedGetLdapIds = getLdapIds as jest.Mock;
			mockedGetLdapIds.mockResolvedValue([]);

			await ldapService.init();
			const result = await ldapService.findAndAuthenticateLdapUser(
				'jdoe',
				'fakePassword',
				ldapConfig.loginIdAttribute,
				ldapConfig.userFilter,
			);

			expect(result).toBeUndefined();
		});

		it('should validate found user', async () => {
			const ldapService = createDefaultLdapService(ldapConfig);

			const foundUsers = [
				{
					dn: 'uid=jdoe,ou=users,dc=example,dc=com',
					cn: ['John Doe'],
					mail: ['jdoe@example.com'],
					uid: ['jdoe'],
				},
			];

			Client.prototype.search = jest.fn().mockResolvedValue({ searchEntries: [...foundUsers] });

			const validUserSpy = jest.spyOn(ldapService, 'validUser');

			const mockedGetLdapIds = getLdapIds as jest.Mock;
			mockedGetLdapIds.mockResolvedValue([]);

			await ldapService.init();
			await ldapService.findAndAuthenticateLdapUser(
				'jdoe',
				'fakePassword',
				ldapConfig.loginIdAttribute,
				ldapConfig.userFilter,
			);

			expect(validUserSpy).toBeCalledTimes(1);
			expect(validUserSpy).toHaveBeenCalledWith(foundUsers[0].dn, 'fakePassword');
		});

		it('should validate last user if more than one is found', async () => {
			const ldapService = createDefaultLdapService(ldapConfig);

			const foundUsers = [
				{
					dn: 'uid=jdoe,ou=users,dc=example,dc=com',
					cn: ['John Doe'],
					mail: ['jdoe@example.com'],
					uid: ['jdoe'],
				},
				{
					dn: 'uid=janedoe,ou=users,dc=example,dc=com',
					cn: ['Jane Doe'],
					mail: ['jane.doe@example.com'],
					uid: ['janedoe'],
				},
			];

			Client.prototype.search = jest.fn().mockResolvedValue({ searchEntries: [...foundUsers] });

			const validUserSpy = jest.spyOn(ldapService, 'validUser');

			const mockedGetLdapIds = getLdapIds as jest.Mock;
			mockedGetLdapIds.mockResolvedValue([]);

			await ldapService.init();
			await ldapService.findAndAuthenticateLdapUser(
				'jdoe',
				'fakePassword',
				ldapConfig.loginIdAttribute,
				ldapConfig.userFilter,
			);

			expect(validUserSpy).toBeCalledTimes(1);
			expect(validUserSpy).toHaveBeenCalledWith(foundUsers[1].dn, 'fakePassword');
		});

		it('should return undefined if invalid user is found', async () => {
			const ldapService = createDefaultLdapService(ldapConfig);

			const foundUsers = [
				{
					dn: 'uid=jdoe,ou=users,dc=example,dc=com',
					cn: ['John Doe'],
					mail: ['jdoe@example.com'],
					uid: ['jdoe'],
				},
			];

			Client.prototype.search = jest.fn().mockResolvedValue({ searchEntries: [...foundUsers] });

			const validUserSpy = jest
				.spyOn(ldapService, 'validUser')
				.mockRejectedValue(new Error('Failed to validate user'));

			const mockedGetLdapIds = getLdapIds as jest.Mock;
			mockedGetLdapIds.mockResolvedValue([]);

			await ldapService.init();
			const result = await ldapService.findAndAuthenticateLdapUser(
				'jdoe',
				'fakePassword',
				ldapConfig.loginIdAttribute,
				ldapConfig.userFilter,
			);

			expect(validUserSpy).toHaveBeenCalledTimes(1);
			expect(result).toBeUndefined();
		});

		it('should resolve binary attributes for found user', async () => {
			const ldapService = createDefaultLdapService(ldapConfig);

			const foundUsers = [
				{
					dn: 'uid=jdoe,ou=users,dc=example,dc=com',
					cn: ['John Doe'],
					mail: ['jdoe@example.com'],
					uid: ['jdoe'],
				},
			];

			Client.prototype.search = jest.fn().mockResolvedValue({ searchEntries: [...foundUsers] });

			const mockedGetLdapIds = getLdapIds as jest.Mock;
			mockedGetLdapIds.mockResolvedValue([]);

			await ldapService.init();
			await ldapService.findAndAuthenticateLdapUser(
				'jdoe',
				'fakePassword',
				ldapConfig.loginIdAttribute,
				ldapConfig.userFilter,
			);

			expect(resolveEntryBinaryAttributes).toHaveBeenCalledTimes(1);
			expect(resolveEntryBinaryAttributes).toHaveBeenCalledWith(foundUsers[0]);
		});

		it('should return found user', async () => {
			const ldapService = createDefaultLdapService(ldapConfig);

			const foundUsers = [
				{
					dn: 'uid=jdoe,ou=users,dc=example,dc=com',
					cn: ['John Doe'],
					mail: ['jdoe@example.com'],
					uid: ['jdoe'],
				},
			];

			Client.prototype.search = jest.fn().mockResolvedValue({ searchEntries: [...foundUsers] });

			const mockedGetLdapIds = getLdapIds as jest.Mock;
			mockedGetLdapIds.mockResolvedValue([]);

			await ldapService.init();
			const result = await ldapService.findAndAuthenticateLdapUser(
				'jdoe',
				'fakePassword',
				ldapConfig.loginIdAttribute,
				ldapConfig.userFilter,
			);

			expect(result).toEqual(foundUsers[0]);
		});
	});

	describe('testConnection()', () => {
		it('should throw expected error if init() is not called first', async () => {
			const ldapService = createDefaultLdapService(ldapConfig);

			await expect(ldapService.testConnection()).rejects.toThrowError(
				'Service cannot be used without setting the property config',
			);
		});

		it('should create a new client without TLS if connectionSecurity is set to "none"', async () => {
			const ldapService = createDefaultLdapService({ ...ldapConfig, connectionSecurity: 'none' });

			await ldapService.init();
			await ldapService.testConnection();

			expect(Client).toHaveBeenCalledTimes(1);
			expect(Client).toHaveBeenCalledWith({
				url: `ldap://${ldapConfig.connectionUrl}:${ldapConfig.connectionPort}`,
			});
		});

		it('should create a new client with TLS enabled if connectionSecurity is set to "tls" and allowing unauthorized certificates', async () => {
			const ldapService = createDefaultLdapService({
				...ldapConfig,
				connectionSecurity: 'tls',
				allowUnauthorizedCerts: true,
			});

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
			const ldapService = createDefaultLdapService({
				...ldapConfig,
				connectionSecurity: 'tls',
				allowUnauthorizedCerts: false,
			});

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
			const ldapService = createDefaultLdapService({
				...ldapConfig,
				connectionSecurity: 'startTls',
				allowUnauthorizedCerts: true,
			});

			await ldapService.init();
			await ldapService.testConnection();

			expect(Client).toHaveBeenCalledTimes(1);
			expect(Client.prototype.startTLS).toHaveBeenCalledTimes(1);
			expect(Client.prototype.startTLS).toHaveBeenCalledWith({
				rejectUnauthorized: false,
			});
		});

		it('should not create a new client if one has already been created', async () => {
			const ldapService = createDefaultLdapService(ldapConfig);

			await ldapService.init();
			await ldapService.testConnection();

			expect(Client).toHaveBeenCalledTimes(1);

			await ldapService.testConnection();
			expect(Client).toHaveBeenCalledTimes(1);
		});
	});

	describe('runSync()', () => {
		beforeEach(() => {
			const mockedRandomString = randomString as jest.Mock;
			mockedRandomString.mockReturnValue('nonRandomPassword');
		});

		it('should search for users with expected parameters', async () => {
			const ldapService = createDefaultLdapService(ldapConfig);

			const searchWithAdminBindingSpy = jest.spyOn(ldapService, 'searchWithAdminBinding');
			Client.prototype.search = jest.fn().mockResolvedValue({ searchEntries: [] });

			const mockedGetLdapIds = getLdapIds as jest.Mock;
			mockedGetLdapIds.mockResolvedValue([]);

			const expectedFilter = createFilter(
				`(${ldapConfig.loginIdAttribute}=*)`,
				ldapConfig.userFilter,
			);

			await ldapService.init();
			await ldapService.runSync('dry');

			expect(searchWithAdminBindingSpy).toHaveBeenCalledTimes(1);
			expect(searchWithAdminBindingSpy).toHaveBeenCalledWith(expectedFilter);
		});

		it('should resolve binary attributes for users', async () => {
			const ldapService = createDefaultLdapService(ldapConfig);

			const foundUsers = [
				{
					dn: 'uid=jdoe,ou=users,dc=example,dc=com',
					cn: ['John Doe'],
					mail: ['jdoe@example.com'],
					uid: ['jdoe'],
					jpegPhoto: [Buffer.from('89504E470D0A1A0A', 'hex')],
				},
			];
			Client.prototype.search = jest.fn().mockResolvedValue({ searchEntries: foundUsers });

			const mockedGetLdapIds = getLdapIds as jest.Mock;
			mockedGetLdapIds.mockResolvedValue([]);

			await ldapService.init();
			await ldapService.runSync('dry');

			expect(resolveBinaryAttributes).toHaveBeenCalledTimes(1);
			expect(resolveBinaryAttributes).toHaveBeenCalledWith(foundUsers);
		});

		it('should throw expected error if search fails', async () => {
			const ldapService = createDefaultLdapService(ldapConfig);

			Client.prototype.search = jest.fn().mockRejectedValue(new Error('Error finding users'));

			const mockedGetLdapIds = getLdapIds as jest.Mock;
			mockedGetLdapIds.mockResolvedValue([]);

			await ldapService.init();
			await expect(ldapService.runSync('dry')).rejects.toThrowError('Error finding users');
		});

		it('should process expected users if mode is "live"', async () => {
			const ldapService = createDefaultLdapService(ldapConfig);

			// Users that don't exist in memory
			const newUsers = [
				{
					dn: 'uid=johndoe,ou=users,dc=example,dc=com',
					cn: 'John Doe',
					givenName: 'John',
					sn: 'Doe',
					mail: 'john.doe@example.com',
					uid: 'johndoe',
				},
				{
					dn: 'uid=janedoe,ou=users,dc=example,dc=com',
					cn: 'Jane Doe',
					givenName: 'Jane',
					sn: 'Doe',
					mail: 'jane.doe@example.com',
					uid: 'janedoe',
				},
			];

			// Users that exist in memory and in LDAP response
			const updateUsers = [
				{
					dn: 'uid=emilyclark,ou=users,dc=example,dc=com',
					cn: 'Emily Clark',
					givenName: 'Emily',
					sn: 'Clark',
					mail: 'emily.clark@example.com',
					uid: 'emilyclark',
				},
			];

			// Users that only exist in memory
			const deleteUsers = ['santaclaus', 'jackfrost'];

			const foundUsers = [...newUsers, ...updateUsers];
			Client.prototype.search = jest.fn().mockResolvedValue({ searchEntries: foundUsers });

			const mockedGetLdapIds = getLdapIds as jest.Mock;

			// Delete users that exist in memory but not in the LDAP response
			mockedGetLdapIds.mockResolvedValue(['emilyclark', ...deleteUsers]);

			const newDbUsers = newUsers.map((user) => mapLdapUserToDbUser(user, ldapConfig, true));
			const updateDbUsers = updateUsers.map((user) => mapLdapUserToDbUser(user, ldapConfig));

			await ldapService.init();
			await ldapService.runSync('live');

			expect(processUsers).toHaveBeenCalledTimes(1);
			expect(processUsers).toHaveBeenCalledWith(newDbUsers, updateDbUsers, deleteUsers);
		});

		it('should sync expected LDAP data when no errors', async () => {
			const ldapService = createDefaultLdapService(ldapConfig);

			// Users that don't exist in memory
			const newUsers = [
				{
					dn: 'uid=johndoe,ou=users,dc=example,dc=com',
					cn: 'John Doe',
					givenName: 'John',
					sn: 'Doe',
					mail: 'john.doe@example.com',
					uid: 'johndoe',
				},
				{
					dn: 'uid=janedoe,ou=users,dc=example,dc=com',
					cn: 'Jane Doe',
					givenName: 'Jane',
					sn: 'Doe',
					mail: 'jane.doe@example.com',
					uid: 'janedoe',
				},
			];

			// Users that exist in memory and in LDAP response
			const updateUsers = [
				{
					dn: 'uid=emilyclark,ou=users,dc=example,dc=com',
					cn: 'Emily Clark',
					givenName: 'Emily',
					sn: 'Clark',
					mail: 'emily.clark@example.com',
					uid: 'emilyclark',
				},
			];

			// Users that only exist in memory
			const deleteUsers = ['santaclaus', 'jackfrost'];

			const foundUsers = [...newUsers, ...updateUsers];
			Client.prototype.search = jest.fn().mockResolvedValue({ searchEntries: foundUsers });

			const mockedGetLdapIds = getLdapIds as jest.Mock;

			// Delete users that exist in memory but not in the LDAP response
			mockedGetLdapIds.mockResolvedValue(['emilyclark', ...deleteUsers]);

			const newDbUsers = newUsers.map((user) => mapLdapUserToDbUser(user, ldapConfig, true));
			const updateDbUsers = updateUsers.map((user) => mapLdapUserToDbUser(user, ldapConfig));

			jest.setSystemTime(new Date('2024-12-25'));
			const expectedDate = new Date();

			await ldapService.init();
			await ldapService.runSync('live');

			expect(saveLdapSynchronization).toHaveBeenCalledTimes(1);
			expect(saveLdapSynchronization).toHaveBeenCalledWith({
				startedAt: expectedDate,
				endedAt: expectedDate,
				created: newDbUsers.length,
				updated: updateDbUsers.length,
				disabled: deleteUsers.length,
				scanned: foundUsers.length,
				runMode: 'live',
				status: 'success',
				error: '',
			});
		});

		it('should sync expected LDAP data when users fail to process', async () => {
			const ldapService = createDefaultLdapService(ldapConfig);

			// Users that don't exist in memory
			const newUsers = [
				{
					dn: 'uid=johndoe,ou=users,dc=example,dc=com',
					cn: 'John Doe',
					givenName: 'John',
					sn: 'Doe',
					mail: 'john.doe@example.com',
					uid: 'johndoe',
				},
				{
					dn: 'uid=janedoe,ou=users,dc=example,dc=com',
					cn: 'Jane Doe',
					givenName: 'Jane',
					sn: 'Doe',
					mail: 'jane.doe@example.com',
					uid: 'janedoe',
				},
			];

			// Users that exist in memory and in LDAP response
			const updateUsers = [
				{
					dn: 'uid=emilyclark,ou=users,dc=example,dc=com',
					cn: 'Emily Clark',
					givenName: 'Emily',
					sn: 'Clark',
					mail: 'emily.clark@example.com',
					uid: 'emilyclark',
				},
			];

			// Users that only exist in memory
			const deleteUsers = ['santaclaus', 'jackfrost'];

			const foundUsers = [...newUsers, ...updateUsers];
			Client.prototype.search = jest.fn().mockResolvedValue({ searchEntries: foundUsers });

			const mockedProcessUsers = processUsers as jest.Mock;
			mockedProcessUsers.mockRejectedValue(
				new QueryFailedError('Query', [], new Error('Error processing users')),
			);

			const mockedGetLdapIds = getLdapIds as jest.Mock;

			// Delete users that exist in memory but not in the LDAP response
			mockedGetLdapIds.mockResolvedValue(['emilyclark', ...deleteUsers]);

			const newDbUsers = newUsers.map((user) => mapLdapUserToDbUser(user, ldapConfig, true));
			const updateDbUsers = updateUsers.map((user) => mapLdapUserToDbUser(user, ldapConfig));

			jest.setSystemTime(new Date('2024-12-25'));
			const expectedDate = new Date();

			await ldapService.init();
			await ldapService.runSync('live');

			expect(saveLdapSynchronization).toHaveBeenCalledTimes(1);
			expect(saveLdapSynchronization).toHaveBeenCalledWith({
				startedAt: expectedDate,
				endedAt: expectedDate,
				created: newDbUsers.length,
				updated: updateDbUsers.length,
				disabled: deleteUsers.length,
				scanned: foundUsers.length,
				runMode: 'live',
				status: 'error',
				error: 'Error processing users',
			});
		});

		it('should emit expected event if synchronization is enabled', async () => {
			mockSettingsRespositoryFindOneByOrFail(ldapConfig);

			const eventServiceMock = mock<EventService>({
				emit: jest.fn(),
			});

			const ldapService = new LdapService(
				mockLogger(),
				settingsRepository,
				mock(),
				eventServiceMock,
			);
			Client.prototype.search = jest.fn().mockResolvedValue({ searchEntries: [] });

			const mockedGetLdapIds = getLdapIds as jest.Mock;
			mockedGetLdapIds.mockResolvedValue([]);

			await ldapService.init();
			await ldapService.runSync('dry');

			expect(eventServiceMock.emit).toHaveBeenCalledTimes(1);
			expect(eventServiceMock.emit).toHaveBeenCalledWith('ldap-general-sync-finished', {
				error: '',
				succeeded: true,
				type: 'manual_dry',
				usersSynced: 0,
			});
		});

		it('should emit expected event if synchronization is disabled', async () => {
			mockSettingsRespositoryFindOneByOrFail(ldapConfig);

			const eventServiceMock = mock<EventService>({
				emit: jest.fn(),
			});

			const ldapService = new LdapService(
				mockLogger(),
				settingsRepository,
				mock(),
				eventServiceMock,
			);
			Client.prototype.search = jest.fn().mockResolvedValue({ searchEntries: [] });

			const mockedGetLdapIds = getLdapIds as jest.Mock;
			mockedGetLdapIds.mockResolvedValue([]);

			await ldapService.init();
			ldapService.stopSync();
			await ldapService.runSync('dry');

			expect(eventServiceMock.emit).toHaveBeenCalledTimes(1);
			expect(eventServiceMock.emit).toHaveBeenCalledWith('ldap-general-sync-finished', {
				error: '',
				succeeded: true,
				type: 'scheduled',
				usersSynced: 0,
			});
		});

		it('should emit expected event with error message if processUsers fails', async () => {
			mockSettingsRespositoryFindOneByOrFail(ldapConfig);

			const eventServiceMock = mock<EventService>({
				emit: jest.fn(),
			});

			const ldapService = new LdapService(
				mockLogger(),
				settingsRepository,
				mock(),
				eventServiceMock,
			);
			Client.prototype.search = jest.fn().mockResolvedValue({ searchEntries: [] });

			const mockedGetLdapIds = getLdapIds as jest.Mock;
			mockedGetLdapIds.mockResolvedValue([]);

			const mockedProcessUsers = processUsers as jest.Mock;
			mockedProcessUsers.mockRejectedValue(
				new QueryFailedError('Query', [], new Error('Error processing users')),
			);

			await ldapService.init();
			ldapService.stopSync();
			await ldapService.runSync('live');

			expect(mockedProcessUsers).toHaveBeenCalledTimes(1);
			expect(eventServiceMock.emit).toHaveBeenCalledTimes(1);
			expect(eventServiceMock.emit).toHaveBeenCalledWith('ldap-general-sync-finished', {
				error: 'Error processing users',
				succeeded: true,
				type: 'scheduled',
				usersSynced: 0,
			});
		});
	});

	describe('stopSync()', () => {
		it('should clear the scheduled timer', async () => {
			const ldapService = createDefaultLdapService({
				...ldapConfig,
				synchronizationEnabled: true,
				synchronizationInterval: 10,
			});

			const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

			await ldapService.init();
			ldapService.stopSync();

			expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
		});
	});
});
