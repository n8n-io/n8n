import type { Logger } from '@n8n/backend-common';
import type {
	CredentialsEntity,
	CredentialsRepository,
	SharedCredentialsRepository,
	ProjectRepository,
	UserRepository,
	User,
} from '@n8n/db';
import { GLOBAL_OWNER_ROLE, GLOBAL_MEMBER_ROLE } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import { CREDENTIAL_ERRORS, CredentialDataError, Credentials, type ErrorReporter } from 'n8n-core';
import {
	CREDENTIAL_BLANKING_VALUE,
	CREDENTIAL_EMPTY_VALUE,
	jsonParse,
	type ICredentialDataDecryptedObject,
	type ICredentialType,
	type INodeProperties,
} from 'n8n-workflow';

import { mockExistingCredential } from './credentials.test-data';

import type { CredentialTypes } from '@/credential-types';
import type { CredentialDependencyService } from '@/credentials/credential-dependency.service';
import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import { CredentialsService } from '@/credentials/credentials.service';
import * as validation from '@/credentials/validation';
import type { CredentialsHelper } from '@/credentials-helper';
import type { ExternalHooks } from '@/external-hooks';
import { CredentialNotFoundError } from '@/errors/credential-not-found.error';
import type { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';
import type { SecretsProviderAccessCheckService } from '@/modules/external-secrets.ee/secret-provider-access-check.service.ee';
import * as checkAccess from '@/permissions.ee/check-access';
import type { CredentialsTester } from '@/services/credentials-tester.service';
import type { OwnershipService } from '@/services/ownership.service';
import type { ProjectService } from '@/services/project.service.ee';
import type { RoleService } from '@/services/role.service';

const ownerUser = mock<User>({ id: 'owner-id', role: GLOBAL_OWNER_ROLE });
const memberUser = mock<User>({ id: 'member-id', role: GLOBAL_MEMBER_ROLE });

describe('CredentialsService', () => {
	const credType = mock<ICredentialType>({
		extends: [],
		properties: [
			{
				name: 'clientSecret',
				type: 'string',
				typeOptions: { password: true },
				doNotInherit: false,
			},
			{
				name: 'accessToken',
				type: 'string',
				typeOptions: { password: true },
				doNotInherit: false,
			},
		],
	});

	const errorReporter = mock<ErrorReporter>();
	const credentialTypes = mock<CredentialTypes>();
	const credentialsRepository = mock<CredentialsRepository>();
	const credentialDependencyService = mock<CredentialDependencyService>();
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const ownershipService = mock<OwnershipService>();
	const logger = mock<Logger>();
	const credentialsTester = mock<CredentialsTester>();
	const externalHooks = mock<ExternalHooks>();
	const projectRepository = mock<ProjectRepository>();
	const projectService = mock<ProjectService>();
	const roleService = mock<RoleService>();
	const userRepository = mock<UserRepository>();
	const credentialsFinderService = mock<CredentialsFinderService>();
	const credentialsHelper = mock<CredentialsHelper>();
	const externalSecretsConfig = mock<ExternalSecretsConfig>();
	const externalSecretsProviderAccessCheckService = mock<SecretsProviderAccessCheckService>();

	const service = new CredentialsService(
		credentialsRepository,
		credentialDependencyService,
		sharedCredentialsRepository,
		ownershipService,
		logger,
		errorReporter,
		credentialsTester,
		externalHooks,
		credentialTypes,
		projectRepository,
		projectService,
		roleService,
		userRepository,
		credentialsFinderService,
		credentialsHelper,
		externalSecretsConfig,
		externalSecretsProviderAccessCheckService,
	);

	beforeEach(() => {
		jest.resetAllMocks();
		credentialDependencyService.resolveExternalSecretsStoreDependencyFilter.mockResolvedValue(
			undefined,
		);
		credentialDependencyService.syncExternalSecretProviderDependenciesForCredential.mockResolvedValue(
			undefined,
		);
		ownershipService.addOwnedByAndSharedWith.mockImplementation((credential: any) => credential);
		// Mock the subquery method used by member users and admin users with onlySharedWithMe
		credentialsRepository.getManyAndCountWithSharingSubquery.mockResolvedValue({
			credentials: [],
			count: 0,
		});
		// Mock roleService for the new subquery implementation
		roleService.rolesWithScope.mockResolvedValue(['project:viewer', 'project:editor']);
	});

	/**
	 * Helper function to mock the credentials repository transaction manager
	 * @param options - Configuration options
	 * @param options.credentialId - The ID to assign to saved credentials (default: 'new-cred-id')
	 * @param options.onSave - Optional callback to capture saved entities
	 */
	const mockTransactionManager = (options?: {
		credentialId?: string;
		onSave?: (entity: any) => void;
	}) => {
		const credentialId = options?.credentialId ?? 'new-cred-id';
		const onSave = options?.onSave;

		// @ts-expect-error - Mocking manager for testing
		credentialsRepository.manager = {
			transaction: jest.fn().mockImplementation(async (callback) => {
				const mockManager = {
					save: jest.fn().mockImplementation(async (entity) => {
						if (onSave) {
							onSave(entity);
						}
						return { ...entity, id: credentialId };
					}),
				};
				return await callback(mockManager);
			}),
		};
	};

	describe('redact', () => {
		it('should redact sensitive values', () => {
			const credential = mock<CredentialsEntity>({
				id: '123',
				name: 'Test Credential',
				type: 'oauth2',
			});

			const decryptedData = {
				clientId: 'abc123',
				clientSecret: 'sensitiveSecret',
				accessToken: '',
				oauthTokenData: 'super-secret',
				csrfSecret: 'super-secret',
			};

			credentialTypes.getByName.calledWith(credential.type).mockReturnValueOnce(credType);

			const redactedData = service.redact(decryptedData, credential);

			expect(redactedData).toEqual({
				clientId: 'abc123',
				clientSecret: CREDENTIAL_BLANKING_VALUE,
				accessToken: CREDENTIAL_EMPTY_VALUE,
				oauthTokenData: CREDENTIAL_BLANKING_VALUE,
				csrfSecret: CREDENTIAL_BLANKING_VALUE,
			});
		});

		it('should redact non-string password field values without throwing', () => {
			const credential = mock<CredentialsEntity>({
				id: '123',
				name: 'Test Credential',
				type: 'oauth2',
			});

			const decryptedData = {
				clientId: 'abc123',
				clientSecret: 12345, // number, not a string
				accessToken: '',
			};

			credentialTypes.getByName.calledWith(credential.type).mockReturnValueOnce(credType);

			const redactedData = service.redact(
				decryptedData as unknown as ICredentialDataDecryptedObject,
				credential,
			);

			expect(redactedData).toEqual({
				clientId: 'abc123',
				clientSecret: CREDENTIAL_BLANKING_VALUE,
				accessToken: CREDENTIAL_EMPTY_VALUE,
			});
		});

		it('should redact sensitive values in a fixed collection with multiple values', () => {
			const fixedCollectionCredType = {
				properties: [
					{
						name: 'headers',
						type: 'fixedCollection',
						typeOptions: { multipleValues: true },
						options: [
							{
								displayName: 'Header',
								name: 'values',
								values: [
									{
										name: 'name',
										type: 'string',
									},
									{
										name: 'value',
										type: 'string',
										typeOptions: { password: true },
									},
								],
							},
						],
					},
				],
			} as unknown as ICredentialType;
			const credential = mock<CredentialsEntity>({
				id: '123',
				name: 'Test Credential',
				type: 'oauth2',
			});
			const decryptedData = {
				headers: {
					values: [
						{
							name: 'Authorization',
							value: 'Bearer sensitiveSecret',
						},
						{
							name: 'Test',
							value: '123',
						},
					],
				},
			};
			credentialTypes.getByName
				.calledWith(credential.type)
				.mockReturnValueOnce(fixedCollectionCredType);

			const redactedData = service.redact(decryptedData, credential);

			expect(redactedData).toEqual({
				headers: {
					values: [
						{ name: 'Authorization', value: CREDENTIAL_BLANKING_VALUE },
						{ name: 'Test', value: CREDENTIAL_BLANKING_VALUE },
					],
				},
			});
		});

		it('should redact sensitive values in a fixed collection with single value', () => {
			const fixedCollectionCredType = {
				properties: [
					{
						name: 'headers',
						type: 'fixedCollection',
						typeOptions: { multipleValues: false },
						options: [
							{
								displayName: 'Header',
								name: 'values',
								values: [
									{
										name: 'name',
										type: 'string',
									},
									{
										name: 'value',
										type: 'string',
										typeOptions: { password: true },
									},
								],
							},
						],
					},
				],
			} as unknown as ICredentialType;
			const credential = mock<CredentialsEntity>({
				id: '123',
				name: 'Test Credential',
				type: 'oauth2',
			});
			const decryptedData = {
				headers: {
					values: {
						name: 'Authorization',
						value: 'Bearer sensitiveSecret',
					},
				},
			};
			credentialTypes.getByName
				.calledWith(credential.type)
				.mockReturnValueOnce(fixedCollectionCredType);

			const redactedData = service.redact(decryptedData, credential);

			expect(redactedData).toEqual({
				headers: {
					values: { name: 'Authorization', value: CREDENTIAL_BLANKING_VALUE },
				},
			});
		});

		it('should redact sensitive values in a fixed collection with multiple options', () => {
			const fixedCollectionCredType = {
				properties: [
					{
						name: 'headers',
						type: 'fixedCollection',
						typeOptions: { multipleValues: true },
						options: [
							{
								displayName: 'Header',
								name: 'values1',
								values: [
									{
										name: 'name',
										type: 'string',
									},
									{
										name: 'value',
										type: 'string',
										typeOptions: { password: true },
									},
								],
							},
							{
								displayName: 'Header',
								name: 'values2',
								values: [
									{
										name: 'name',
										type: 'string',
									},
									{
										name: 'value',
										type: 'string',
										typeOptions: { password: true },
									},
								],
							},
						],
					},
				],
			} as unknown as ICredentialType;
			const credential = mock<CredentialsEntity>({
				id: '123',
				name: 'Test Credential',
				type: 'oauth2',
			});
			const decryptedData = {
				headers: {
					values1: [
						{
							name: 'Authorization',
							value: 'Bearer sensitiveSecret',
						},
						{
							name: 'Test',
							value: '123',
						},
					],
					values2: [
						{
							name: 'Foo',
							value: 'Bar',
						},
						{
							name: 'Baz',
							value: 'Qux',
						},
					],
				},
			};
			credentialTypes.getByName
				.calledWith(credential.type)
				.mockReturnValueOnce(fixedCollectionCredType);

			const redactedData = service.redact(decryptedData, credential);

			expect(redactedData).toEqual({
				headers: {
					values1: [
						{ name: 'Authorization', value: CREDENTIAL_BLANKING_VALUE },
						{ name: 'Test', value: CREDENTIAL_BLANKING_VALUE },
					],
					values2: [
						{ name: 'Foo', value: CREDENTIAL_BLANKING_VALUE },
						{ name: 'Baz', value: CREDENTIAL_BLANKING_VALUE },
					],
				},
			});
		});

		it('should redact sensitive values in a fixed collection with multiple options and a single value', () => {
			const fixedCollectionCredType = {
				properties: [
					{
						name: 'headers',
						type: 'fixedCollection',
						typeOptions: { multipleValues: false },
						options: [
							{
								displayName: 'Header',
								name: 'values1',
								values: [
									{
										name: 'name',
										type: 'string',
									},
									{
										name: 'value',
										type: 'string',
										typeOptions: { password: true },
									},
								],
							},
							{
								displayName: 'Header',
								name: 'values2',
								values: [
									{
										name: 'name',
										type: 'string',
									},
									{
										name: 'value',
										type: 'string',
										typeOptions: { password: true },
									},
								],
							},
						],
					},
				],
			} as unknown as ICredentialType;
			const credential = mock<CredentialsEntity>({
				id: '123',
				name: 'Test Credential',
				type: 'oauth2',
			});
			const decryptedData = {
				headers: {
					values2: {
						name: 'Authorization',
						value: 'Bearer sensitiveSecret',
					},
				},
			};
			credentialTypes.getByName
				.calledWith(credential.type)
				.mockReturnValueOnce(fixedCollectionCredType);

			const redactedData = service.redact(decryptedData, credential);

			expect(redactedData).toEqual({
				headers: {
					values2: { name: 'Authorization', value: CREDENTIAL_BLANKING_VALUE },
				},
			});
		});

		it('should redact json field for httpCustomAuth credential type', () => {
			const credential = mock<CredentialsEntity>({
				id: '123',
				name: 'Test Credential',
				type: 'httpCustomAuth',
			});

			const decryptedData = {
				json: '{"key": "value"}',
				otherField: 'not-redacted',
			};

			const httpCustomAuthCredType = {
				properties: [
					{
						name: 'json',
						type: 'json',
						typeOptions: { redactJsonLeaves: true },
					},
					{
						name: 'otherField',
						type: 'string',
					},
				],
			} as unknown as ICredentialType;

			credentialTypes.getByName
				.calledWith(credential.type)
				.mockReturnValueOnce(httpCustomAuthCredType);

			const redactedData = service.redact(decryptedData, credential);

			expect(redactedData).toEqual({
				json: JSON.stringify({ key: '***' }, null, 2),
				otherField: 'not-redacted',
			});
		});

		it('should redact empty json field for httpCustomAuth credential type', () => {
			const credential = mock<CredentialsEntity>({
				id: '123',
				name: 'Test Credential',
				type: 'httpCustomAuth',
			});

			const decryptedData = {
				json: '',
				otherField: 'not-redacted',
			};

			const httpCustomAuthCredType = {
				properties: [
					{
						name: 'json',
						type: 'json',
						typeOptions: { redactJsonLeaves: true },
					},
					{
						name: 'otherField',
						type: 'string',
					},
				],
			} as unknown as ICredentialType;

			credentialTypes.getByName
				.calledWith(credential.type)
				.mockReturnValueOnce(httpCustomAuthCredType);

			const redactedData = service.redact(decryptedData, credential);

			expect(redactedData).toEqual({
				json: CREDENTIAL_EMPTY_VALUE,
				otherField: 'not-redacted',
			});
		});

		describe('httpCustomAuth redactJsonLeaves (via service.redact)', () => {
			const makeHttpCustomAuthCredential = () =>
				mock<CredentialsEntity>({ id: '123', name: 'Test', type: 'httpCustomAuth' });

			const makeCredType = () =>
				({
					properties: [{ name: 'json', type: 'json', typeOptions: { redactJsonLeaves: true } }],
				}) as unknown as ICredentialType;

			it('should redact string leaf values', () => {
				credentialTypes.getByName.calledWith('httpCustomAuth').mockReturnValueOnce(makeCredType());

				const result = service.redact(
					{ json: '{"token": "secret", "key": "abc"}' },
					makeHttpCustomAuthCredential(),
				);

				expect(result.json).toEqual(JSON.stringify({ token: '***', key: '***' }, null, 2));
			});

			it('should redact numeric leaf values', () => {
				credentialTypes.getByName.calledWith('httpCustomAuth').mockReturnValueOnce(makeCredType());

				const result = service.redact(
					{ json: '{"port": 8080, "timeout": 30}' },
					makeHttpCustomAuthCredential(),
				);

				expect(result.json).toEqual(JSON.stringify({ port: '***', timeout: '***' }, null, 2));
			});

			it('should redact boolean leaf values', () => {
				credentialTypes.getByName.calledWith('httpCustomAuth').mockReturnValueOnce(makeCredType());

				const result = service.redact(
					{ json: '{"enabled": true, "debug": false}' },
					makeHttpCustomAuthCredential(),
				);

				expect(result.json).toEqual(JSON.stringify({ enabled: '***', debug: '***' }, null, 2));
			});

			it('should redact leaves of nested objects recursively', () => {
				credentialTypes.getByName.calledWith('httpCustomAuth').mockReturnValueOnce(makeCredType());

				const result = service.redact(
					{
						json: '{"headers": {"Authorization": "Bearer token", "X-Api-Key": "key"}, "url": "https://example.com"}',
					},
					makeHttpCustomAuthCredential(),
				);

				expect(result.json).toEqual(
					JSON.stringify(
						{ headers: { Authorization: '***', 'X-Api-Key': '***' }, url: '***' },
						null,
						2,
					),
				);
			});

			it('should redact leaves inside arrays', () => {
				credentialTypes.getByName.calledWith('httpCustomAuth').mockReturnValueOnce(makeCredType());

				const result = service.redact(
					{ json: '{"scopes": ["read", "write"], "tags": ["prod"]}' },
					makeHttpCustomAuthCredential(),
				);

				expect(result.json).toEqual(
					JSON.stringify({ scopes: ['***', '***'], tags: ['***'] }, null, 2),
				);
			});

			it('should redact leaves in deeply mixed nesting (array of objects)', () => {
				credentialTypes.getByName.calledWith('httpCustomAuth').mockReturnValueOnce(makeCredType());

				const result = service.redact(
					{ json: '{"rules": [{"key": "a", "val": 1}, {"key": "b", "val": 2}]}' },
					makeHttpCustomAuthCredential(),
				);

				expect(result.json).toEqual(
					JSON.stringify(
						{
							rules: [
								{ key: '***', val: '***' },
								{ key: '***', val: '***' },
							],
						},
						null,
						2,
					),
				);
			});

			it('should return json unchanged when it is not parseable', () => {
				credentialTypes.getByName.calledWith('httpCustomAuth').mockReturnValueOnce(makeCredType());

				const result = service.redact({ json: 'not-valid-json' }, makeHttpCustomAuthCredential());

				expect(result.json).toEqual('not-valid-json');
			});

			it('should redact leaves in a deeply nested object', () => {
				credentialTypes.getByName.calledWith('httpCustomAuth').mockReturnValueOnce(makeCredType());

				const result = service.redact(
					{ json: '{"a":{"b":{"c":{"d":"deep-secret"}}}}' },
					makeHttpCustomAuthCredential(),
				);

				expect(result.json).toEqual(JSON.stringify({ a: { b: { c: { d: '***' } } } }, null, 2));
			});

			it('should redact leaves inside an array nested inside a deep object', () => {
				credentialTypes.getByName.calledWith('httpCustomAuth').mockReturnValueOnce(makeCredType());

				const result = service.redact(
					{
						json: '{"auth":{"headers":[{"name":"Authorization","value":"Bearer s"},{"name":"X-Key","value":"abc"}]}}',
					},
					makeHttpCustomAuthCredential(),
				);

				expect(result.json).toEqual(
					JSON.stringify(
						{
							auth: {
								headers: [
									{ name: '***', value: '***' },
									{ name: '***', value: '***' },
								],
							},
						},
						null,
						2,
					),
				);
			});

			it('should redact null leaf values', () => {
				credentialTypes.getByName.calledWith('httpCustomAuth').mockReturnValueOnce(makeCredType());

				const result = service.redact({ json: '{"token":null}' }, makeHttpCustomAuthCredential());

				expect(result.json).toEqual(JSON.stringify({ token: '***' }, null, 2));
			});
		});

		it('should not redact json field for non-httpCustomAuth credential types', () => {
			const credential = mock<CredentialsEntity>({
				id: '123',
				name: 'Test Credential',
				type: 'oauth2',
			});

			const decryptedData = {
				json: '{"key": "value"}',
				clientSecret: 'sensitiveSecret',
			};

			credentialTypes.getByName.calledWith(credential.type).mockReturnValueOnce(credType);

			const redactedData = service.redact(decryptedData, credential);

			expect(redactedData).toEqual({
				json: '{"key": "value"}',
				clientSecret: CREDENTIAL_BLANKING_VALUE,
			});
		});
	});

	describe('decrypt', () => {
		const data = {
			clientId: 'abc123',
			clientSecret: 'sensitiveSecret',
			accessToken: '',
			oauthTokenData: 'super-secret',
			csrfSecret: 'super-secret',
		};
		const credentialEntity = mock<CredentialsEntity>({
			id: '123',
			name: 'Test Credential',
			type: 'oauth2',
		});
		const credentials = mock<Credentials>({ id: credentialEntity.id });

		beforeEach(() => {
			credentialTypes.getByName.calledWith(credentialEntity.type).mockReturnValueOnce(credType);
		});

		it('should redact sensitive values by default', async () => {
			// ARRANGE
			jest.spyOn(Credentials.prototype, 'getData').mockResolvedValueOnce(data);

			// ACT
			const redactedData = await service.decrypt(credentialEntity);

			// ASSERT
			expect(redactedData).toEqual({
				...data,
				clientSecret: CREDENTIAL_BLANKING_VALUE,
				accessToken: CREDENTIAL_EMPTY_VALUE,
				oauthTokenData: CREDENTIAL_BLANKING_VALUE,
				csrfSecret: CREDENTIAL_BLANKING_VALUE,
			});
		});

		it('should return sensitive values if `includeRawData` is true', async () => {
			// ARRANGE
			jest.spyOn(Credentials.prototype, 'getData').mockResolvedValueOnce(data);

			// ACT
			const redactedData = await service.decrypt(credentialEntity, true);

			// ASSERT
			expect(redactedData).toEqual(data);
		});

		it('should return return an empty object if decryption fails', async () => {
			// ARRANGE
			const decryptionError = new CredentialDataError(
				credentials,
				CREDENTIAL_ERRORS.DECRYPTION_FAILED,
			);
			jest.spyOn(Credentials.prototype, 'getData').mockRejectedValueOnce(decryptionError);

			// ACT
			const redactedData = await service.decrypt(credentialEntity, true);

			// ASSERT
			expect(redactedData).toEqual({});
			expect(credentialTypes.getByName).not.toHaveBeenCalled();
			expect(errorReporter.error).toHaveBeenCalledWith(decryptionError, {
				extra: { credentialId: credentialEntity.id },
				level: 'error',
				tags: { credentialType: credentialEntity.type },
			});
		});
	});

	describe('testById', () => {
		it('throws CredentialNotFoundError when credential does not exist', async () => {
			credentialsFinderService.findCredentialById.mockResolvedValue(null);

			await expect(service.testById(ownerUser.id, 'missing-credential')).rejects.toThrow(
				CredentialNotFoundError,
			);
			expect(credentialsTester.testCredentials).not.toHaveBeenCalled();
		});

		it('decrypts stored credential and calls credentials tester', async () => {
			const storedCredential = mock<CredentialsEntity>({
				id: 'credential-id',
				name: 'Test Credential',
				type: 'githubApi',
			});
			const decryptedData = { accessToken: 'secret-token' } as ICredentialDataDecryptedObject;
			const testResult = { status: 'OK', message: 'Credential tested successfully' } as const;

			credentialsFinderService.findCredentialById.mockResolvedValue(storedCredential);
			credentialsTester.testCredentials.mockResolvedValue(testResult);
			jest.spyOn(service, 'decrypt').mockResolvedValue(decryptedData);

			const result = await service.testById(ownerUser.id, storedCredential.id);

			expect(credentialsFinderService.findCredentialById).toHaveBeenCalledWith(storedCredential.id);
			expect(service.decrypt).toHaveBeenCalledWith(storedCredential, true);
			expect(credentialsTester.testCredentials).toHaveBeenCalledWith(
				ownerUser.id,
				storedCredential.type,
				{
					id: storedCredential.id,
					name: storedCredential.name,
					type: storedCredential.type,
					data: decryptedData,
				},
			);
			expect(result).toEqual(testResult);
		});
	});

	describe('testWithCredentials', () => {
		it('throws CredentialNotFoundError when user cannot access credential', async () => {
			credentialsFinderService.findCredentialForUser.mockResolvedValue(null);

			await expect(
				service.testWithCredentials(ownerUser, {
					id: 'missing-credential',
					name: 'Missing Credential',
					type: 'githubApi',
					data: {},
				}),
			).rejects.toThrow(CredentialNotFoundError);
			expect(credentialsTester.testCredentials).not.toHaveBeenCalled();
		});

		it('prepares merged credentials and runs test', async () => {
			const storedCredential = mock<CredentialsEntity>({
				id: 'credential-id',
				name: 'Stored Credential',
				type: 'githubApi',
			});
			const decryptedData = { accessToken: 'stored-token' } as ICredentialDataDecryptedObject;
			const unredactedData = { accessToken: 'live-token' } as ICredentialDataDecryptedObject;
			const testResult = { status: 'OK', message: 'Credential tested successfully' } as const;

			credentialsFinderService.findCredentialForUser.mockResolvedValue(storedCredential);
			jest.spyOn(service, 'decrypt').mockResolvedValue(decryptedData);
			jest.spyOn(service, 'replaceCredentialContentsForSharee').mockResolvedValue(undefined);
			jest.spyOn(service, 'getCredentialTypeProperties').mockReturnValue([]);
			jest.spyOn(service, 'unredact').mockReturnValue(unredactedData);
			credentialsTester.testCredentials.mockResolvedValue(testResult);

			const payload = {
				id: 'credential-id',
				name: 'Stored Credential',
				type: 'githubApi',
				data: { accessToken: '***' },
			};

			const result = await service.testWithCredentials(ownerUser, payload);

			expect(credentialsFinderService.findCredentialForUser).toHaveBeenCalledWith(
				payload.id,
				ownerUser,
				['credential:read'],
			);
			expect(service.decrypt).toHaveBeenCalledWith(storedCredential, true);
			expect(service.unredact).toHaveBeenCalledWith(payload.data, decryptedData, []);
			expect(credentialsTester.testCredentials).toHaveBeenCalledWith(ownerUser.id, payload.type, {
				...payload,
				data: unredactedData,
			});
			expect(result).toEqual(testResult);
		});
	});

	describe('getMany', () => {
		const regularCredential = {
			id: 'cred-1',
			name: 'Regular Credential',
			type: 'apiKey',
			isGlobal: false,
			shared: [],
		} as Partial<CredentialsEntity> as CredentialsEntity;

		const globalCredential = {
			id: 'cred-2',
			name: 'Global Credential',
			type: 'apiKey',
			isGlobal: true,
			shared: [],
		} as Partial<CredentialsEntity> as CredentialsEntity;

		beforeEach(() => {
			// Mock ownershipService to return credentials as-is
			ownershipService.addOwnedByAndSharedWith.mockImplementation((c: any) => c);
		});

		describe('returnAll = true (owner user)', () => {
			describe('with personal project filter', () => {
				it('should filter by credential:owner role when projectId is for a personal project', async () => {
					// ARRANGE
					const personalProject = { id: 'personal-proj', type: 'personal' } as any;
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);
					projectService.getProject.mockResolvedValue(personalProject);

					// ACT
					const result = await service.getMany(ownerUser, {
						listQueryOptions: {
							filter: { projectId: 'personal-proj' },
						},
					});

					// ASSERT
					expect(projectService.getProject).toHaveBeenCalledWith('personal-proj');
					expect(credentialsRepository.findMany).toHaveBeenCalledWith(
						expect.objectContaining({
							filter: expect.objectContaining({
								withRole: 'credential:owner',
								projectId: 'personal-proj',
							}),
						}),
					);
					expect(result).toHaveLength(1);
				});

				it('should not filter by role when projectId is for a team project', async () => {
					// ARRANGE
					const teamProject = { id: 'team-proj', type: 'team' } as any;
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);
					projectService.getProject.mockResolvedValue(teamProject);

					// ACT
					await service.getMany(ownerUser, {
						listQueryOptions: {
							filter: { projectId: 'team-proj' },
						},
					});

					// ASSERT
					expect(projectService.getProject).toHaveBeenCalledWith('team-proj');
					expect(credentialsRepository.findMany).toHaveBeenCalledWith(
						expect.objectContaining({
							filter: expect.not.objectContaining({
								withRole: 'credential:owner',
							}),
						}),
					);
				});

				it('should handle getProject throwing an error', async () => {
					// ARRANGE
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);
					projectService.getProject.mockRejectedValue(new Error('Project not found'));

					// ACT
					await service.getMany(ownerUser, {
						listQueryOptions: {
							filter: { projectId: 'nonexistent-proj' },
						},
					});

					// ASSERT - Should continue without filtering by role
					expect(credentialsRepository.findMany).toHaveBeenCalledWith(
						expect.objectContaining({
							filter: expect.not.objectContaining({
								withRole: 'credential:owner',
							}),
						}),
					);
				});
			});

			describe('with includeScopes', () => {
				it('should add scopes to credentials when includeScopes is true', async () => {
					// ARRANGE
					const projectRelations = [{ projectId: 'proj-1', role: 'project:owner' }] as any;
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);
					projectService.getProjectRelationsForUser.mockResolvedValue(projectRelations);
					roleService.addScopes.mockImplementation(
						(c) => ({ ...c, scopes: ['credential:read', 'credential:update'] }) as any,
					);

					// ACT
					const result = await service.getMany(ownerUser, {
						includeScopes: true,
					});

					// ASSERT
					expect(projectService.getProjectRelationsForUser).toHaveBeenCalledWith(ownerUser);
					expect(roleService.addScopes).toHaveBeenCalledWith(
						regularCredential,
						ownerUser,
						projectRelations,
					);
					expect(result[0]).toHaveProperty('scopes');
				});

				it('should not add scopes when includeScopes is false', async () => {
					// ARRANGE
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);

					// ACT
					const result = await service.getMany(ownerUser, {
						includeScopes: false,
					});

					// ASSERT
					expect(projectService.getProjectRelationsForUser).not.toHaveBeenCalled();
					expect(roleService.addScopes).not.toHaveBeenCalled();
					expect(result[0]).not.toHaveProperty('scopes');
				});
			});

			describe('with includeData', () => {
				beforeEach(() => {
					projectService.getProjectRelationsForUser.mockResolvedValue([]);
					jest.spyOn(Credentials.prototype, 'getData').mockResolvedValue({
						apiKey: 'secret-key',
						oauthTokenData: { token: 'secret-token' },
					});
					credentialTypes.getByName.mockReturnValue(credType);
				});

				it('should automatically set includeScopes to true when includeData is true', async () => {
					// ARRANGE
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);
					roleService.addScopes.mockImplementation(
						(c) => ({ ...c, scopes: ['credential:update'] }) as any,
					);

					// ACT
					await service.getMany(ownerUser, {
						includeData: true,
					});

					// ASSERT
					expect(projectService.getProjectRelationsForUser).toHaveBeenCalled();
				});

				it('should include decrypted data when user has credential:update scope', async () => {
					// ARRANGE
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);
					roleService.addScopes.mockImplementation(
						(c) => ({ ...c, scopes: ['credential:update'] }) as any,
					);

					// ACT
					const result = await service.getMany(ownerUser, {
						includeData: true,
					});

					// ASSERT
					expect(result[0]).toHaveProperty('data');
					expect(result[0].data).toBeDefined();
				});

				it('should not include decrypted data when user lacks credential:update scope', async () => {
					// ARRANGE
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);
					roleService.addScopes.mockImplementation(
						(c) => ({ ...c, scopes: ['credential:read'] }) as any,
					);

					// ACT
					const result = await service.getMany(ownerUser, {
						includeData: true,
					});

					// ASSERT
					expect(result[0]).toHaveProperty('data');
					expect(result[0].data).toBeUndefined();
				});

				it('should replace oauthTokenData with true when present', async () => {
					// ARRANGE
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);
					roleService.addScopes.mockImplementation(
						(c) => ({ ...c, scopes: ['credential:update'] }) as any,
					);
					jest.spyOn(Credentials.prototype, 'getData').mockResolvedValue({
						apiKey: 'secret-key',
						oauthTokenData: { token: 'secret-token' },
					});

					// ACT
					const result = await service.getMany(ownerUser, {
						includeData: true,
					});

					// ASSERT
					expect(result[0].data).toBeDefined();
					expect((result[0].data as any)?.oauthTokenData).toBe(true);
				});

				it('should set includeData in listQueryOptions', async () => {
					// ARRANGE
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);
					roleService.addScopes.mockImplementation(
						(c) => ({ ...c, scopes: ['credential:update'] }) as any,
					);

					// ACT
					await service.getMany(ownerUser, {
						includeData: true,
					});

					// ASSERT
					expect(credentialsRepository.findMany).toHaveBeenCalledWith(
						expect.objectContaining({
							includeData: true,
						}),
					);
				});
			});

			describe('with shared project relations', () => {
				const sharedRelation = { credentialsId: 'cred-1', projectId: 'proj-1' } as any;

				it('should fetch all relations when filtering by shared.projectId', async () => {
					// ARRANGE
					const credWithShared = { ...regularCredential, shared: [] } as any;
					credentialsRepository.findMany.mockResolvedValue([credWithShared]);
					sharedCredentialsRepository.getAllRelationsForCredentials.mockResolvedValue([
						sharedRelation,
					]);

					// ACT
					const result = await service.getMany(ownerUser, {
						listQueryOptions: {
							filter: { shared: { projectId: 'proj-1' } },
						},
					});

					// ASSERT
					expect(sharedCredentialsRepository.getAllRelationsForCredentials).toHaveBeenCalledWith([
						'cred-1',
					]);
					expect(result[0].shared).toHaveLength(1);
				});

				it('should fetch all relations when onlySharedWithMe is true', async () => {
					// ARRANGE
					const credWithShared = { ...regularCredential, shared: [] } as any;
					credentialsRepository.getManyAndCountWithSharingSubquery.mockResolvedValue({
						credentials: [credWithShared],
						count: 1,
					});
					sharedCredentialsRepository.getAllRelationsForCredentials.mockResolvedValue([
						sharedRelation,
					]);

					// ACT
					const result = await service.getMany(ownerUser, {
						onlySharedWithMe: true,
					});

					// ASSERT
					expect(sharedCredentialsRepository.getAllRelationsForCredentials).toHaveBeenCalledWith([
						'cred-1',
					]);
					expect(result[0].shared).toHaveLength(1);
				});

				it('should not fetch all relations when shared.projectId is not present', async () => {
					// ARRANGE
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);

					// ACT
					await service.getMany(ownerUser, {
						listQueryOptions: {
							filter: { type: 'apiKey' },
						},
					});

					// ASSERT
					expect(sharedCredentialsRepository.getAllRelationsForCredentials).not.toHaveBeenCalled();
				});
			});

			describe('with custom select (non-default select)', () => {
				it('should skip addOwnedByAndSharedWith when select is custom', async () => {
					// ARRANGE
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);

					// ACT
					await service.getMany(ownerUser, {
						listQueryOptions: {
							select: { id: true, name: true },
						},
					});

					// ASSERT
					expect(ownershipService.addOwnedByAndSharedWith).not.toHaveBeenCalled();
				});

				it('should skip fetching all relations when select is custom', async () => {
					// ARRANGE
					credentialsRepository.findMany.mockResolvedValue([regularCredential]);

					// ACT
					await service.getMany(ownerUser, {
						listQueryOptions: {
							select: { id: true, name: true },
							filter: { shared: { projectId: 'proj-1' } },
						},
					});

					// ASSERT
					expect(sharedCredentialsRepository.getAllRelationsForCredentials).not.toHaveBeenCalled();
				});
			});
		});

		describe('returnAll = false (member user)', () => {
			beforeEach(() => {
				// Member users now use the subquery approach
				credentialsRepository.getManyAndCountWithSharingSubquery.mockResolvedValue({
					credentials: [regularCredential],
					count: 1,
				});
			});

			it('should fetch credentials using subquery approach', async () => {
				// ARRANGE - mock is set in beforeEach

				// ACT
				await service.getMany(memberUser, {});

				// ASSERT
				expect(roleService.rolesWithScope).toHaveBeenCalledWith('project', ['credential:read']);
				expect(roleService.rolesWithScope).toHaveBeenCalledWith('credential', ['credential:read']);
				expect(credentialsRepository.getManyAndCountWithSharingSubquery).toHaveBeenCalledWith(
					memberUser,
					expect.objectContaining({
						scopes: ['credential:read'],
						projectRoles: expect.any(Array),
						credentialRoles: expect.any(Array),
					}),
					expect.objectContaining({
						filters: { dependency: undefined },
					}),
				);
			});

			describe('with includeScopes', () => {
				it('should add scopes to credentials when includeScopes is true', async () => {
					// ARRANGE
					const projectRelations = [{ projectId: 'proj-1', role: 'project:editor' }] as any;
					credentialsRepository.getManyAndCountWithSharingSubquery.mockResolvedValue({
						credentials: [regularCredential],
						count: 1,
					});
					projectService.getProjectRelationsForUser.mockResolvedValue(projectRelations);
					roleService.addScopes.mockImplementation(
						(c) => ({ ...c, scopes: ['credential:read'] }) as any,
					);

					// ACT
					const result = await service.getMany(memberUser, {
						includeScopes: true,
					});

					// ASSERT
					expect(projectService.getProjectRelationsForUser).toHaveBeenCalledWith(memberUser);
					expect(roleService.addScopes).toHaveBeenCalledWith(
						regularCredential,
						memberUser,
						projectRelations,
					);
					expect(result[0]).toHaveProperty('scopes');
				});
			});

			describe('with includeData', () => {
				beforeEach(() => {
					projectService.getProjectRelationsForUser.mockResolvedValue([]);
					jest.spyOn(Credentials.prototype, 'getData').mockResolvedValue({
						apiKey: 'secret-key',
					});
					credentialTypes.getByName.mockReturnValue(credType);
				});

				it('should include decrypted data when user has credential:update scope', async () => {
					// ARRANGE
					credentialsRepository.getManyAndCountWithSharingSubquery.mockResolvedValue({
						credentials: [regularCredential],
						count: 1,
					});
					roleService.addScopes.mockImplementation(
						(c) => ({ ...c, scopes: ['credential:update'] }) as any,
					);

					// ACT
					const result = await service.getMany(memberUser, {
						includeData: true,
					});

					// ASSERT
					expect(result[0]).toHaveProperty('data');
					expect(result[0].data).toBeDefined();
				});

				it('should not include decrypted data when user lacks credential:update scope', async () => {
					// ARRANGE
					credentialsRepository.getManyAndCountWithSharingSubquery.mockResolvedValue({
						credentials: [regularCredential],
						count: 1,
					});
					roleService.addScopes.mockImplementation(
						(c) => ({ ...c, scopes: ['credential:read'] }) as any,
					);

					// ACT
					const result = await service.getMany(memberUser, {
						includeData: true,
					});

					// ASSERT
					expect(result[0]).toHaveProperty('data');
					expect(result[0].data).toBeUndefined();
				});
			});

			describe('with shared project relations', () => {
				const sharedRelation = { credentialsId: 'cred-1', projectId: 'proj-1' } as any;

				it('should fetch all relations when filtering by shared.projectId', async () => {
					// ARRANGE
					const credWithShared = { ...regularCredential, shared: [] } as any;
					credentialsRepository.getManyAndCountWithSharingSubquery.mockResolvedValue({
						credentials: [credWithShared],
						count: 1,
					});
					sharedCredentialsRepository.getAllRelationsForCredentials.mockResolvedValue([
						sharedRelation,
					]);

					// ACT
					const result = await service.getMany(memberUser, {
						listQueryOptions: {
							filter: { shared: { projectId: 'proj-1' } },
						},
					});

					// ASSERT
					expect(sharedCredentialsRepository.getAllRelationsForCredentials).toHaveBeenCalledWith([
						'cred-1',
					]);
					expect(result[0].shared).toHaveLength(1);
				});

				it('should fetch all relations when onlySharedWithMe is true', async () => {
					// ARRANGE
					const credWithShared = { ...regularCredential, shared: [] } as any;
					credentialsRepository.getManyAndCountWithSharingSubquery.mockResolvedValue({
						credentials: [credWithShared],
						count: 1,
					});
					sharedCredentialsRepository.getAllRelationsForCredentials.mockResolvedValue([
						sharedRelation,
					]);

					// ACT
					const result = await service.getMany(memberUser, {
						onlySharedWithMe: true,
					});

					// ASSERT
					expect(sharedCredentialsRepository.getAllRelationsForCredentials).toHaveBeenCalledWith([
						'cred-1',
					]);
					expect(result[0].shared).toHaveLength(1);
				});
			});

			describe('with custom select', () => {
				it('should skip addOwnedByAndSharedWith when select is custom', async () => {
					// ARRANGE
					credentialsRepository.getManyAndCountWithSharingSubquery.mockResolvedValue({
						credentials: [regularCredential],
						count: 1,
					});

					// ACT
					await service.getMany(memberUser, {
						listQueryOptions: {
							select: { id: true, name: true },
						},
					});

					// ASSERT
					expect(ownershipService.addOwnedByAndSharedWith).not.toHaveBeenCalled();
				});
			});
		});

		describe('with onlySharedWithMe', () => {
			it('should use subquery with onlySharedWithMe when onlySharedWithMe is true', async () => {
				// ARRANGE
				const credWithShared = { ...regularCredential, shared: [] } as any;
				const sharedRelation = { credentialsId: 'cred-1', projectId: 'proj-1' } as any;
				credentialsRepository.getManyAndCountWithSharingSubquery.mockResolvedValue({
					credentials: [credWithShared],
					count: 1,
				});
				sharedCredentialsRepository.getAllRelationsForCredentials.mockResolvedValue([
					sharedRelation,
				]);

				// ACT
				await service.getMany(memberUser, {
					onlySharedWithMe: true,
				});

				// ASSERT
				expect(credentialsRepository.getManyAndCountWithSharingSubquery).toHaveBeenCalledWith(
					memberUser,
					expect.objectContaining({
						onlySharedWithMe: true,
					}),
					expect.objectContaining({
						filters: { dependency: undefined },
					}),
				);
				expect(sharedCredentialsRepository.getAllRelationsForCredentials).toHaveBeenCalledWith([
					'cred-1',
				]);
			});

			it('should pass filters through when onlySharedWithMe is true', async () => {
				// ARRANGE
				const credWithShared = { ...regularCredential, shared: [] } as any;
				const sharedRelation = { credentialsId: 'cred-1', projectId: 'proj-1' } as any;
				credentialsRepository.getManyAndCountWithSharingSubquery.mockResolvedValue({
					credentials: [credWithShared],
					count: 1,
				});
				sharedCredentialsRepository.getAllRelationsForCredentials.mockResolvedValue([
					sharedRelation,
				]);

				// ACT
				await service.getMany(memberUser, {
					listQueryOptions: {
						filter: { type: 'apiKey' },
					},
					onlySharedWithMe: true,
				});

				// ASSERT
				expect(credentialsRepository.getManyAndCountWithSharingSubquery).toHaveBeenCalledWith(
					memberUser,
					expect.objectContaining({
						onlySharedWithMe: true,
					}),
					expect.objectContaining({
						filter: expect.objectContaining({
							type: 'apiKey',
						}),
					}),
				);
			});
		});

		describe('with includeGlobal = true', () => {
			it('should include global credentials for owner users', async () => {
				// ARRANGE
				credentialsRepository.findMany.mockResolvedValue([regularCredential]);
				credentialsRepository.findAllGlobalCredentials.mockResolvedValue([globalCredential]);

				// ACT
				const result = await service.getMany(ownerUser, {
					includeGlobal: true,
				});

				// ASSERT
				expect(credentialsRepository.findMany).toHaveBeenCalled();
				expect(credentialsRepository.findAllGlobalCredentials).toHaveBeenCalledWith({
					includeData: false,
					filters: { dependency: undefined },
				});
				expect(result).toHaveLength(2);
				expect(result).toEqual(
					expect.arrayContaining([
						expect.objectContaining({ id: 'cred-1' }),
						expect.objectContaining({ id: 'cred-2' }),
					]),
				);
			});

			it('should include global credentials for member users', async () => {
				// ARRANGE
				credentialsRepository.getManyAndCountWithSharingSubquery.mockResolvedValue({
					credentials: [regularCredential],
					count: 1,
				});
				credentialsRepository.findAllGlobalCredentials.mockResolvedValue([globalCredential]);

				// ACT
				const result = await service.getMany(memberUser, {
					includeGlobal: true,
				});

				// ASSERT
				expect(credentialsRepository.getManyAndCountWithSharingSubquery).toHaveBeenCalled();
				expect(credentialsRepository.findAllGlobalCredentials).toHaveBeenCalledWith({
					includeData: false,
					filters: { dependency: undefined },
				});
				expect(result).toHaveLength(2);
				expect(result).toEqual(
					expect.arrayContaining([
						expect.objectContaining({ id: 'cred-1' }),
						expect.objectContaining({ id: 'cred-2' }),
					]),
				);
			});

			it('should deduplicate credentials when user has project access to global credential', async () => {
				// ARRANGE - User already has access to global credential through project
				const sharedGlobalCred = {
					id: 'cred-2', // Same ID as globalCredential
					name: 'Global Credential',
					type: 'apiKey',
					isGlobal: true,
					shared: [],
				} as Partial<CredentialsEntity> as CredentialsEntity;
				credentialsRepository.getManyAndCountWithSharingSubquery.mockResolvedValue({
					credentials: [regularCredential, sharedGlobalCred],
					count: 2,
				});
				credentialsRepository.findAllGlobalCredentials.mockResolvedValue([globalCredential]);

				// ACT
				const result = await service.getMany(memberUser, {
					includeGlobal: true,
				});

				// ASSERT
				expect(result).toHaveLength(2);
				// Should have exactly one instance of cred-2, not two
				const credIds = result.map((c) => c.id);
				expect(credIds.filter((id) => id === 'cred-2')).toHaveLength(1);
			});

			it('should include data for global credentials when includeData is true', async () => {
				// ARRANGE
				credentialsRepository.getManyAndCountWithSharingSubquery.mockResolvedValue({
					credentials: [regularCredential],
					count: 1,
				});
				credentialsRepository.findAllGlobalCredentials.mockResolvedValue([globalCredential]);
				projectService.getProjectRelationsForUser.mockResolvedValue([]);
				roleService.addScopes.mockImplementation(
					(c) => ({ ...c, scopes: ['credential:read'] }) as any,
				);

				// ACT
				await service.getMany(memberUser, {
					includeGlobal: true,
					includeData: true,
				});

				// ASSERT
				expect(credentialsRepository.findAllGlobalCredentials).toHaveBeenCalledWith({
					includeData: true,
					filters: { dependency: undefined },
				});
			});
		});

		describe('with includeGlobal = false', () => {
			it('should exclude global credentials when includeGlobal is false', async () => {
				// ARRANGE
				credentialsRepository.findMany.mockResolvedValue([regularCredential]);

				// ACT
				const result = await service.getMany(ownerUser, {
					includeGlobal: false,
				});

				// ASSERT
				expect(credentialsRepository.findMany).toHaveBeenCalled();
				expect(credentialsRepository.findAllGlobalCredentials).not.toHaveBeenCalled();
				expect(result).toHaveLength(1);
				expect(result[0].id).toBe('cred-1');
			});

			it('should exclude global credentials when includeGlobal is undefined', async () => {
				// ARRANGE
				credentialsRepository.getManyAndCountWithSharingSubquery.mockResolvedValue({
					credentials: [regularCredential],
					count: 1,
				});

				// ACT
				const result = await service.getMany(memberUser, {
					includeGlobal: false,
				});

				// ASSERT
				expect(credentialsRepository.findAllGlobalCredentials).not.toHaveBeenCalled();
				expect(result).toHaveLength(1);
			});
		});

		describe('with externalSecretsStore', () => {
			it('should resolve dependency filter and pass it to repository query', async () => {
				// ARRANGE
				ownershipService.addOwnedByAndSharedWith.mockImplementation(
					(credential: any) => credential,
				);
				const credentialWithExternalSecret1 = {
					id: 'cred-with-external-secret-1',
					name: 'Credential with secret 1',
					type: 'apiKey',
					isGlobal: false,
					shared: [],
				} as Partial<CredentialsEntity> as CredentialsEntity;
				credentialDependencyService.resolveExternalSecretsStoreDependencyFilter.mockResolvedValue({
					dependencyType: 'externalSecretProvider',
					dependencyId: '123',
				});
				credentialsRepository.getManyAndCountWithSharingSubquery.mockResolvedValue({
					credentials: [credentialWithExternalSecret1],
					count: 1,
				});

				// ACT
				const result = await service.getMany(memberUser, {
					filters: { externalSecretsStore: 'myProvider' },
					listQueryOptions: { select: { id: true } } as any,
				});

				// ASSERT
				expect(result).toHaveLength(1);
				expect(result[0].id).toBe(credentialWithExternalSecret1.id);
				expect(credentialsRepository.getManyAndCountWithSharingSubquery).toHaveBeenCalledWith(
					memberUser,
					expect.any(Object),
					{
						select: { id: true },
						filters: {
							dependency: {
								dependencyType: 'externalSecretProvider',
								dependencyId: '123',
							},
						},
					},
				);
			});

			it('should return early when no credential dependencies match the external secrets store', async () => {
				credentialDependencyService.resolveExternalSecretsStoreDependencyFilter.mockResolvedValue(
					undefined,
				);

				const result = await service.getMany(memberUser, {
					filters: { externalSecretsStore: 'myProvider' },
				});

				expect(result).toEqual([]);
				expect(credentialsRepository.getManyAndCountWithSharingSubquery).not.toHaveBeenCalled();
			});
		});
	});

	describe('getCredentialsAUserCanUseInAWorkflow', () => {
		const user = mock<User>({ id: 'user-1' });
		const regularCredential = {
			id: 'cred-1',
			name: 'Regular Credential',
			type: 'apiKey',
			isGlobal: false,
		} as Partial<CredentialsEntity> as CredentialsEntity;
		const globalCredential = {
			id: 'cred-2',
			name: 'Global Credential',
			type: 'oauth2',
			isGlobal: true,
		} as Partial<CredentialsEntity> as CredentialsEntity;

		beforeEach(() => {
			projectService.getProjectRelationsForUser.mockResolvedValue([]);
			roleService.addScopes.mockImplementation(
				(c) => ({ ...c, scopes: ['credential:read'] }) as any,
			);
		});

		it('should include global credentials for workflows', async () => {
			// ARRANGE
			credentialsFinderService.findCredentialsForUser.mockResolvedValue([
				regularCredential,
				globalCredential,
			]);
			credentialsRepository.findAllCredentialsForWorkflow.mockResolvedValue([regularCredential]);

			// ACT
			const result = await service.getCredentialsAUserCanUseInAWorkflow(user, {
				workflowId: 'workflow-1',
			});

			// ASSERT
			expect(credentialsFinderService.findCredentialsForUser).toHaveBeenCalledWith(user, [
				'credential:read',
			]);
			expect(result).toHaveLength(2);
			expect(result).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ id: 'cred-1', isGlobal: false }),
					expect.objectContaining({ id: 'cred-2', isGlobal: true }),
				]),
			);
		});

		it('should include global credentials for projects', async () => {
			// ARRANGE
			credentialsFinderService.findCredentialsForUser.mockResolvedValue([
				regularCredential,
				globalCredential,
			]);
			credentialsRepository.findAllCredentialsForProject.mockResolvedValue([regularCredential]);

			// ACT
			const result = await service.getCredentialsAUserCanUseInAWorkflow(user, {
				projectId: 'project-1',
			});

			// ASSERT
			expect(credentialsFinderService.findCredentialsForUser).toHaveBeenCalledWith(user, [
				'credential:read',
			]);
			expect(result).toHaveLength(2);
			expect(result).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ id: 'cred-1' }),
					expect.objectContaining({ id: 'cred-2' }),
				]),
			);
		});

		it('should not duplicate credentials when user has access to global credential through project', async () => {
			// ARRANGE - Both regular and global credentials are in workflow's project
			credentialsFinderService.findCredentialsForUser.mockResolvedValue([
				regularCredential,
				globalCredential,
			]);
			credentialsRepository.findAllCredentialsForWorkflow.mockResolvedValue([
				regularCredential,
				globalCredential,
			]);

			// ACT
			const result = await service.getCredentialsAUserCanUseInAWorkflow(user, {
				workflowId: 'workflow-1',
			});

			// ASSERT
			expect(result).toHaveLength(2);
			const credIds = result.map((c) => c.id);
			expect(credIds).toEqual(['cred-1', 'cred-2']);
			// Verify no duplicates
			expect(new Set(credIds).size).toBe(2);
		});
	});

	describe('findAllCredentialIdsForWorkflow', () => {
		const workflowId = 'workflow-1';

		it('should return all personal credentials when owner has global read permissions', async () => {
			// ARRANGE
			const personalCred1 = mock<CredentialsEntity>({ id: 'cred-1' });
			const personalCred2 = mock<CredentialsEntity>({ id: 'cred-2' });
			userRepository.findPersonalOwnerForWorkflow.mockResolvedValue(ownerUser);
			credentialsRepository.findAllPersonalCredentials.mockResolvedValue([
				personalCred1,
				personalCred2,
			]);

			// ACT
			const credentials = await service.findAllCredentialIdsForWorkflow(workflowId);

			// ASSERT
			expect(userRepository.findPersonalOwnerForWorkflow).toHaveBeenCalledWith(workflowId);
			expect(credentialsRepository.findAllPersonalCredentials).toHaveBeenCalled();
			expect(credentials).toHaveLength(2);
			expect(credentials).toEqual([personalCred1, personalCred2]);
		});

		it('should return workflow credentials when owner lacks global read permissions', async () => {
			// ARRANGE
			const workflowCred1 = mock<CredentialsEntity>({ id: 'cred-1' });
			const workflowCred2 = mock<CredentialsEntity>({ id: 'cred-2' });
			userRepository.findPersonalOwnerForWorkflow.mockResolvedValue(memberUser);
			credentialsRepository.findAllCredentialsForWorkflow.mockResolvedValue([
				workflowCred1,
				workflowCred2,
			]);

			// ACT
			const credentials = await service.findAllCredentialIdsForWorkflow(workflowId);

			// ASSERT
			expect(userRepository.findPersonalOwnerForWorkflow).toHaveBeenCalledWith(workflowId);
			expect(credentialsRepository.findAllCredentialsForWorkflow).toHaveBeenCalledWith(workflowId);
			expect(credentials).toHaveLength(2);
			expect(credentials).toEqual([workflowCred1, workflowCred2]);
		});

		it('should return workflow credentials when user is not found', async () => {
			// ARRANGE
			const workflowCred = mock<CredentialsEntity>({ id: 'cred-1' });
			userRepository.findPersonalOwnerForWorkflow.mockResolvedValue(null);
			credentialsRepository.findAllCredentialsForWorkflow.mockResolvedValue([workflowCred]);

			// ACT
			const credentials = await service.findAllCredentialIdsForWorkflow(workflowId);

			// ASSERT
			expect(credentialsRepository.findAllCredentialsForWorkflow).toHaveBeenCalledWith(workflowId);
			expect(credentials).toHaveLength(1);
		});
	});

	describe('findAllCredentialIdsForProject', () => {
		const projectId = 'project-1';

		it('should return all personal credentials when project owner has global read permissions', async () => {
			// ARRANGE
			const personalCred1 = mock<CredentialsEntity>({ id: 'cred-1' });
			const personalCred2 = mock<CredentialsEntity>({ id: 'cred-2' });
			userRepository.findPersonalOwnerForProject.mockResolvedValue(ownerUser);
			credentialsRepository.findAllPersonalCredentials.mockResolvedValue([
				personalCred1,
				personalCred2,
			]);

			// ACT
			const credentials = await service.findAllCredentialIdsForProject(projectId);

			// ASSERT
			expect(userRepository.findPersonalOwnerForProject).toHaveBeenCalledWith(projectId);
			expect(credentialsRepository.findAllPersonalCredentials).toHaveBeenCalled();
			expect(credentials).toHaveLength(2);
			expect(credentials).toEqual([personalCred1, personalCred2]);
		});

		it('should return project credentials when owner lacks global read permissions', async () => {
			// ARRANGE
			const projectCred1 = mock<CredentialsEntity>({ id: 'cred-1' });
			const projectCred2 = mock<CredentialsEntity>({ id: 'cred-2' });
			userRepository.findPersonalOwnerForProject.mockResolvedValue(memberUser);
			credentialsRepository.findAllCredentialsForProject.mockResolvedValue([
				projectCred1,
				projectCred2,
			]);

			// ACT
			const credentials = await service.findAllCredentialIdsForProject(projectId);

			// ASSERT
			expect(userRepository.findPersonalOwnerForProject).toHaveBeenCalledWith(projectId);
			expect(credentialsRepository.findAllCredentialsForProject).toHaveBeenCalledWith(projectId);
			expect(credentials).toHaveLength(2);
			expect(credentials).toEqual([projectCred1, projectCred2]);
		});

		it('should return project credentials when user is not found', async () => {
			// ARRANGE
			const projectCred = mock<CredentialsEntity>({ id: 'cred-1' });
			userRepository.findPersonalOwnerForProject.mockResolvedValue(null);
			credentialsRepository.findAllCredentialsForProject.mockResolvedValue([projectCred]);

			// ACT
			const credentials = await service.findAllCredentialIdsForProject(projectId);

			// ASSERT
			expect(credentialsRepository.findAllCredentialsForProject).toHaveBeenCalledWith(projectId);
			expect(credentials).toHaveLength(1);
		});
	});

	describe('createUnmanagedCredential', () => {
		const credentialData = {
			name: 'Test Credential',
			type: 'apiKey',
			data: { apiKey: 'test-key' },
			projectId: 'project-1',
		};

		beforeEach(() => {
			// Mock the save chain
			credentialsRepository.create.mockImplementation((data) => ({ ...data }) as any);
			roleService.addScopes.mockImplementation(
				(c) =>
					({
						...c,
						scopes: ['credential:read', 'credential:update'],
					}) as any,
			);
			roleService.combineResourceScopes.mockReturnValue([
				'credential:read',
				'credential:update',
			] as any);
			sharedCredentialsRepository.findOne.mockResolvedValue({ role: 'credential:owner' } as any);
			sharedCredentialsRepository.create.mockImplementation((data) => data as any);
			sharedCredentialsRepository.find.mockResolvedValue([]);
			externalHooks.run.mockResolvedValue();
			projectService.getProjectWithScope.mockResolvedValue({
				id: 'project-1',
			} as any);
			projectService.getProjectRelationsForUser.mockResolvedValue([]);
			credentialsHelper.getCredentialsProperties.mockReturnValue([]);
			jest.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
		});

		it('should allow owner to create global credential', async () => {
			// ARRANGE
			const payload = { ...credentialData, isGlobal: true };
			const savedEntities: any[] = [];
			let credentialEntityInput: any;
			credentialsRepository.create.mockImplementation((data) => {
				credentialEntityInput = data;
				return data as any;
			});
			mockTransactionManager({ onSave: (entity) => savedEntities.push(entity) });

			// ACT
			await service.createUnmanagedCredential(payload, ownerUser);

			// ASSERT
			expect(credentialEntityInput.isGlobal).toBe(true);
			// First entity saved should be the credential with isGlobal
			expect(savedEntities[0]).toMatchObject({
				isGlobal: true,
			});
		});

		it('should throw error when non-owner tries to create global credential', async () => {
			// ARRANGE
			const payload = { ...credentialData, isGlobal: true };

			// ACT & ASSERT
			await expect(service.createUnmanagedCredential(payload, memberUser)).rejects.toThrow(
				'You do not have permission to create globally shared credentials',
			);
		});

		it('should create non-global credential by default', async () => {
			// ARRANGE
			const payload = { ...credentialData }; // no isGlobal field
			let savedCredential: any;
			mockTransactionManager({ onSave: (entity) => (savedCredential = entity) });

			// ACT
			await service.createUnmanagedCredential(payload, ownerUser);

			// ASSERT
			expect(savedCredential.isGlobal).toBeUndefined();
		});

		it('should allow member to create non-global credential', async () => {
			// ARRANGE
			const payload = { ...credentialData, isGlobal: false };
			let savedCredential: any;
			mockTransactionManager({ onSave: (entity) => (savedCredential = entity) });

			// ACT
			await service.createUnmanagedCredential(payload, memberUser);

			// ASSERT
			expect(savedCredential.isGlobal).toBeUndefined();
		});

		it('should allow creating credential when required field has default value and is not provided', async () => {
			// ARRANGE
			// Mock credential properties with a required field that has a default value
			credentialsHelper.getCredentialsProperties.mockReturnValue([
				{
					displayName: 'Host',
					name: 'host',
					type: 'string',
					required: true,
					default: 'https://generativelanguage.googleapis.com',
				},
				{
					displayName: 'API Key',
					name: 'apiKey',
					type: 'string',
					required: true,
					default: '',
				},
			] as any);

			// Payload without 'host' field - should use default value
			const payload = {
				name: 'Google Gemini Credential',
				type: 'googlePalmApi',
				data: { apiKey: 'test-api-key' }, // host is not provided
				projectId: 'project-1',
			};

			// @ts-expect-error - Mocking manager for testing
			credentialsRepository.manager = {
				transaction: jest.fn().mockImplementation(async (callback) => {
					const mockManager = {
						save: jest.fn().mockImplementation(async (entity) => {
							return { ...entity, id: 'new-cred-id' };
						}),
					};
					return await callback(mockManager);
				}),
			};

			// ACT & ASSERT
			await expect(service.createUnmanagedCredential(payload, ownerUser)).resolves.toBeDefined();
		});

		it('should throw error when required field without default value is not provided', async () => {
			// ARRANGE
			credentialsHelper.getCredentialsProperties.mockReturnValue([
				{
					displayName: 'API Key',
					name: 'apiKey',
					type: 'string',
					required: true,
					default: '', // Empty default means no valid default
					displayOptions: {},
				},
			] as any);

			const payload = {
				name: 'Test Credential',
				type: 'apiKey',
				data: {}, // apiKey is missing
				projectId: 'project-1',
			};

			// ACT & ASSERT
			await expect(service.createUnmanagedCredential(payload, ownerUser)).rejects.toThrow(
				'The field "apiKey" is mandatory for credentials of type "apiKey"',
			);
		});

		describe('external secrets', () => {
			it('should prevent use of external secret expression when required permission is missing', async () => {
				jest.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(false);
				credentialsHelper.getCredentialsProperties.mockReturnValue([]);
				const payload = {
					name: 'Test Credential',
					type: 'apiKey',
					data: {
						apiKey: '={{ $secrets.myApiKey }}',
						url: 'https://api.example.com',
					},
					projectId: 'WHwt9vP3keCUvmB5',
				};

				await expect(service.createUnmanagedCredential(payload, memberUser)).rejects.toThrow(
					'Lacking permissions to reference external secrets in credentials',
				);
			});

			it('should list all unavailable external secret providers in error message', async () => {
				credentialsHelper.getCredentialsProperties.mockReturnValue([]);
				const payload = {
					name: 'Test Credential',
					type: 'apiKey',
					data: {
						apiKey: '={{ $secrets.outsideProvider.bar }}',
						anotherApiKey: '={{ $secrets.anotherOutsideProvider.bar }}',
					},
					projectId: 'WHwt9vP3keCUvmB5',
				};
				externalSecretsProviderAccessCheckService.isProviderAvailableInProject.mockResolvedValue(
					false,
				);

				await expect(service.createUnmanagedCredential(payload, ownerUser)).rejects.toThrow(
					'The secret providers "outsideProvider" (used in "apiKey"), "anotherOutsideProvider" (used in "anotherApiKey") do not exist in this project',
				);
			});

			it('should throw BadRequestError when referencing external secret provider that is not available in current project', async () => {
				credentialsHelper.getCredentialsProperties.mockReturnValue([]);
				const payload = {
					name: 'Test Credential',
					type: 'apiKey',
					data: {
						apiKey: '={{ $secrets.outsideProvider.bar }}',
						url: 'https://api.example.com',
					},
					projectId: 'WHwt9vP3keCUvmB5',
				};
				externalSecretsProviderAccessCheckService.isProviderAvailableInProject.mockResolvedValue(
					false,
				);

				await expect(service.createUnmanagedCredential(payload, ownerUser)).rejects.toThrow(
					'The secret provider "outsideProvider" used in "apiKey" does not exist in this project',
				);
			});

			it('should create credential that references external secret provider that is shared with current project', async () => {
				credentialsHelper.getCredentialsProperties.mockReturnValue([]);
				const payload = {
					name: 'Test Credential',
					type: 'apiKey',
					data: {
						apiKey: '={{ $secrets.validProvider.bar }}',
						url: 'https://api.example.com',
					},
					projectId: 'WHwt9vP3keCUvmB5',
				};

				externalSecretsProviderAccessCheckService.isProviderAvailableInProject.mockResolvedValue(
					true,
				);

				credentialsRepository.create.mockImplementation((data) => ({ ...data }) as any);
				mockTransactionManager();

				await service.createUnmanagedCredential(payload, ownerUser);
			});

			it('should create credential when external secret uses mixed bracket notation', async () => {
				credentialsHelper.getCredentialsProperties.mockReturnValue([]);
				const payload = {
					name: 'Test Credential',
					type: 'apiKey',
					data: {
						apiKey: "={{ $secrets.validProvider['bar'] }}",
						url: 'https://api.example.com',
					},
					projectId: 'WHwt9vP3keCUvmB5',
				};

				externalSecretsProviderAccessCheckService.isProviderAvailableInProject.mockResolvedValue(
					true,
				);

				credentialsRepository.create.mockImplementation((data) => ({ ...data }) as any);
				mockTransactionManager();

				await expect(service.createUnmanagedCredential(payload, ownerUser)).resolves.toBeDefined();
				expect(
					externalSecretsProviderAccessCheckService.isProviderAvailableInProject,
				).toHaveBeenCalledWith('validProvider', 'WHwt9vP3keCUvmB5');
			});
		});
	});

	describe('createManagedCredential', () => {
		const credentialData = {
			name: 'Managed Credential',
			type: 'oauth2',
			oauthProvider: 'google',
			projectId: 'project-1',
			data: { someData: 'value' },
		};

		beforeEach(async () => {
			// Mock the save chain
			roleService.addScopes.mockImplementation(
				(c) =>
					({
						...c,
						scopes: ['credential:read', 'credential:update'],
					}) as any,
			);
			roleService.combineResourceScopes.mockReturnValue([
				'credential:read',
				'credential:update',
			] as any);
			sharedCredentialsRepository.findOne.mockResolvedValue({ role: 'credential:owner' } as any);
			sharedCredentialsRepository.create.mockImplementation((data) => data as any);
			sharedCredentialsRepository.find.mockResolvedValue([]);
			externalHooks.run.mockResolvedValue();
			projectService.getProjectWithScope.mockResolvedValue({
				id: 'project-1',
			} as any);
			projectService.getProjectRelationsForUser.mockResolvedValue([]);
		});

		it('should throw BadRequestError when credential is missing required properties', async () => {
			// ARRANGE
			const payload = { ...credentialData };
			credentialsHelper.getCredentialsProperties.mockReturnValue([
				{
					displayName: 'required prop',
					name: 'requiredProp',
					type: 'string',
					required: true,
					default: null,
					displayOptions: {},
				},
			]);

			// ACT
			await expect(service.createManagedCredential(payload, ownerUser)).rejects.toThrow(
				'The field "requiredProp" is mandatory for credentials of type "oauth2"',
			);
		});

		it('should create managed credential when all required properties are provided', async () => {
			// ARRANGE
			const payload = {
				...credentialData,
				data: {
					requiredProp: 'some-value',
				},
			};
			credentialsHelper.getCredentialsProperties.mockReturnValue([
				{
					displayName: 'required prop',
					name: 'requiredProp',
					type: 'string',
					required: true,
					default: null,
				},
			]);
			credentialsRepository.create.mockImplementation((data) => ({ ...data }) as any);
			mockTransactionManager({ credentialId: 'new-managed-cred-id' });

			// ACT
			const result = await service.createManagedCredential(payload, ownerUser);

			// ASSERT
			expect(result).toHaveProperty('id', 'new-managed-cred-id');
			expect(result).toHaveProperty('name', 'Managed Credential');
		});
	});

	describe('prepareUpdateData', () => {
		describe('external secrets', () => {
			beforeEach(() => {
				jest.spyOn(service, 'decrypt').mockResolvedValue({});
				jest.spyOn(checkAccess, 'userHasScopes').mockResolvedValue(true);
			});

			it('should list all unavailable external secret providers in error message', async () => {
				credentialsHelper.getCredentialsProperties.mockReturnValue([]);
				const payload = {
					name: 'Test Credential',
					type: 'apiKey',
					data: {
						apiKey: '={{ $secrets.outsideProvider.bar }}',
						anotherApiKey: '={{ $secrets.anotherOutsideProvider.bar }}',
					},
					projectId: 'WHwt9vP3keCUvmB5',
				};
				const existingCredential = mockExistingCredential({
					name: 'Test Credential',
					type: 'apiKey',
					data: {},
					projectId: 'WHwt9vP3keCUvmB5',
				});
				externalSecretsProviderAccessCheckService.isProviderAvailableInProject.mockResolvedValue(
					false,
				);

				await expect(
					service.prepareUpdateData(ownerUser, payload, existingCredential),
				).rejects.toThrow(
					'The secret providers "outsideProvider" (used in "apiKey"), "anotherOutsideProvider" (used in "anotherApiKey") do not exist in this project',
				);
				expect(
					externalSecretsProviderAccessCheckService.isProviderAvailableInProject.mock.calls,
				).toEqual([
					['outsideProvider', 'WHwt9vP3keCUvmB5'],
					['anotherOutsideProvider', 'WHwt9vP3keCUvmB5'],
				]);
			});

			it('should throw BadRequestError when referencing external secret provider that is not available in current project', async () => {
				credentialsHelper.getCredentialsProperties.mockReturnValue([]);
				const payload = {
					name: 'Test Credential',
					type: 'apiKey',
					data: {
						apiKey: '={{ $secrets.outsideProvider.bar }}',
						url: 'https://api.example.com',
					},
					projectId: 'WHwt9vP3keCUvmB5',
				};
				const existingCredential = mockExistingCredential({
					name: 'Test Credential',
					type: 'apiKey',
					data: {},
					projectId: 'WHwt9vP3keCUvmB5',
				});
				externalSecretsProviderAccessCheckService.isProviderAvailableInProject.mockResolvedValue(
					false,
				);

				await expect(
					service.prepareUpdateData(ownerUser, payload, existingCredential),
				).rejects.toThrow(
					'The secret provider "outsideProvider" used in "apiKey" does not exist in this project',
				);
				expect(
					externalSecretsProviderAccessCheckService.isProviderAvailableInProject,
				).toHaveBeenCalledWith('outsideProvider', 'WHwt9vP3keCUvmB5');
			});

			it('should create credential that references external secret provider that is shared with current project', async () => {
				credentialsHelper.getCredentialsProperties.mockReturnValue([]);
				const payload = {
					name: 'Test Credential',
					type: 'apiKey',
					data: {
						apiKey: '={{ $secrets.validProvider.bar }}',
						url: 'https://api.example.com',
					},
					projectId: 'WHwt9vP3keCUvmB5',
				};
				const existingCredential = mockExistingCredential({
					name: 'Test Credential',
					type: 'apiKey',
					data: {},
					projectId: 'WHwt9vP3keCUvmB5',
				});

				externalSecretsProviderAccessCheckService.isProviderAvailableInProject.mockResolvedValue(
					true,
				);

				credentialsRepository.create.mockImplementation((data) => ({ ...data }) as any);
				mockTransactionManager();

				await service.prepareUpdateData(ownerUser, payload, existingCredential);
			});
		});
	});

	describe('unredact (httpCustomAuth JSON shape merging)', () => {
		const s = (v: unknown) => JSON.stringify(v);
		const p = (v: unknown) => jsonParse(String(v));
		const jsonLeafProps = [
			{ name: 'json', type: 'json', typeOptions: { redactJsonLeaves: true } },
		] as unknown as INodeProperties[];

		it('should restore all *** leaves from saved JSON when all are redacted', () => {
			const saved = { token: 'real-token', key: 'real-key' };
			const result = service.unredact(
				{ json: s({ token: '***', key: '***' }) },
				{ json: s(saved) },
				jsonLeafProps,
			);
			expect(p(result.json)).toEqual(saved);
		});

		it('should keep new value for changed leaf and restore *** leaf from saved', () => {
			const result = service.unredact(
				{ json: s({ token: 'new-token', key: '***' }) },
				{ json: s({ token: 'old-token', key: 'old-key' }) },
				jsonLeafProps,
			);
			expect(p(result.json)).toEqual({ token: 'new-token', key: 'old-key' });
		});

		it('should merge *** leaves recursively in nested objects', () => {
			const result = service.unredact(
				{ json: s({ headers: { Authorization: 'Bearer new', 'X-Api-Key': '***' } }) },
				{ json: s({ headers: { Authorization: 'Bearer secret', 'X-Api-Key': 'key123' } }) },
				jsonLeafProps,
			);
			expect(p(result.json)).toEqual({
				headers: { Authorization: 'Bearer new', 'X-Api-Key': 'key123' },
			});
		});

		it('should merge *** elements in arrays by position', () => {
			const result = service.unredact(
				{ json: s({ scopes: ['***', 'new-write', '***'] }) },
				{ json: s({ scopes: ['read', 'write', 'admin'] }) },
				jsonLeafProps,
			);
			expect(p(result.json)).toEqual({ scopes: ['read', 'new-write', 'admin'] });
		});

		it('should save all leaves as-is when none are redacted', () => {
			const result = service.unredact(
				{ json: s({ token: 'completely-new', extra: 'new-field' }) },
				{ json: s({ token: 'old-token' }) },
				jsonLeafProps,
			);
			expect(p(result.json)).toEqual({ token: 'completely-new', extra: 'new-field' });
		});

		it('should leave json unchanged when it is not valid JSON', () => {
			const result = service.unredact(
				{ json: 'not-valid-json' },
				{ json: s({ token: 'saved' }) },
				jsonLeafProps,
			);
			expect(result.json).toEqual('not-valid-json');
		});

		it('should not apply JSON leaf merge when no props are given', () => {
			const result = service.unredact(
				{ json: s({ token: '***' }) },
				{ json: s({ token: 'saved' }) },
			);
			// *** is not a standard sentinel so it stays as-is
			expect(p(result.json)).toEqual({ token: '***' });
		});

		it('should not apply JSON leaf merge when props have no redactJsonLeaves field', () => {
			const result = service.unredact(
				{ json: s({ token: '***' }) },
				{ json: s({ token: 'saved' }) },
				[{ name: 'json', type: 'json' }] as INodeProperties[],
			);
			expect(p(result.json)).toEqual({ token: '***' });
		});

		it('should restore *** leaves in a deeply nested object', () => {
			const result = service.unredact(
				{ json: s({ a: { b: { c: { d: '***' } } } }) },
				{ json: s({ a: { b: { c: { d: 'deep-secret' } } } }) },
				jsonLeafProps,
			);
			expect(p(result.json)).toEqual({ a: { b: { c: { d: 'deep-secret' } } } });
		});

		it('should restore *** leaves inside arrays nested inside deep objects', () => {
			const result = service.unredact(
				{
					json: s({
						auth: {
							headers: [
								{ name: '***', value: '***' },
								{ name: '***', value: 'new-value' },
							],
						},
					}),
				},
				{
					json: s({
						auth: {
							headers: [
								{ name: 'Authorization', value: 'Bearer secret' },
								{ name: 'X-Api-Key', value: 'key123' },
							],
						},
					}),
				},
				jsonLeafProps,
			);
			expect(p(result.json)).toEqual({
				auth: {
					headers: [
						{ name: 'Authorization', value: 'Bearer secret' },
						{ name: 'X-Api-Key', value: 'new-value' },
					],
				},
			});
		});

		it('should drop a key the user removed from the JSON', () => {
			// When the user removes a key, it simply won't be in newVal — it is not re-added from saved
			const result = service.unredact(
				{ json: s({ token: '***' }) },
				{ json: s({ token: 'secret', removedKey: 'data' }) },
				jsonLeafProps,
			);
			expect(p(result.json)).toEqual({ token: 'secret' });
			expect(p(result.json)).not.toHaveProperty('removedKey');
		});

		it('should save a new key the user added to the JSON', () => {
			const result = service.unredact(
				{ json: s({ token: '***', newHeader: 'X-Custom-Value' }) },
				{ json: s({ token: 'secret' }) },
				jsonLeafProps,
			);
			expect(p(result.json)).toEqual({ token: 'secret', newHeader: 'X-Custom-Value' });
		});

		it('should use the new scalar value when the user changes a key from object to scalar', () => {
			// Type change: saved was an object, user replaced it with a plain string — new value wins
			const result = service.unredact(
				{ json: s({ auth: 'new-plain-string' }) },
				{ json: s({ auth: { token: 'secret', key: 'abc' } }) },
				jsonLeafProps,
			);
			expect(p(result.json)).toEqual({ auth: 'new-plain-string' });
		});

		it('should preserve the new array when the user changes a key from object to array', () => {
			// Type mismatch (array vs object): user made a structural change — new value is preserved as-is
			const result = service.unredact(
				{ json: s({ auth: ['new-item-1', 'new-item-2'] }) },
				{ json: s({ auth: { token: 'secret' } }) },
				jsonLeafProps,
			);
			expect(p(result.json)).toEqual({ auth: ['new-item-1', 'new-item-2'] });
		});

		it('should preserve the new object when the user changes a key from array to object (even with *** sentinels)', () => {
			// Type mismatch (object vs array): structural change — new object is preserved as-is, *** unresolved
			const result = service.unredact(
				{ json: s({ data: { key: '***' } }) },
				{ json: s({ data: ['secret1', 'secret2'] }) },
				jsonLeafProps,
			);
			expect(p(result.json)).toEqual({ data: { key: '***' } });
		});
	});

	describe('checkCredentialData', () => {
		const testProjectId = 'test-project-id';

		beforeEach(() => {
			jest.clearAllMocks();
			jest.spyOn(validation, 'validateExternalSecretsPermissions').mockResolvedValue();
		});

		it('should pass when all required fields are provided', async () => {
			credentialsHelper.getCredentialsProperties.mockReturnValue([
				{
					displayName: 'API Key',
					name: 'apiKey',
					type: 'string',
					required: true,
					default: '',
					displayOptions: {},
				},
				{
					displayName: 'Domain',
					name: 'domain',
					type: 'string',
					required: true,
					default: '',
					displayOptions: {},
				},
			]);

			const data = {
				apiKey: 'test-key',
				domain: 'example.com',
			};

			await expect(
				service.checkCredentialData('apiCredential', data, ownerUser, testProjectId),
			).resolves.not.toThrow();
		});

		it('should pass when required field with valid default is not provided', async () => {
			credentialsHelper.getCredentialsProperties.mockReturnValue([
				{
					displayName: 'Host',
					name: 'host',
					type: 'string',
					required: true,
					default: 'https://api.example.com',
					displayOptions: {},
				},
			]);

			const data = {};

			await expect(
				service.checkCredentialData('apiCredential', data, ownerUser, testProjectId),
			).resolves.not.toThrow();
		});

		it('should pass when credential has no required fields', async () => {
			credentialsHelper.getCredentialsProperties.mockReturnValue([
				{
					displayName: 'Optional Field',
					name: 'optionalField',
					type: 'string',
					required: false,
					default: '',
				},
			]);

			const data = {};

			await expect(
				service.checkCredentialData('apiCredential', data, ownerUser, testProjectId),
			).resolves.not.toThrow();
		});

		it('should call validateExternalSecretsPermissions', async () => {
			credentialsHelper.getCredentialsProperties.mockReturnValue([]);
			const validateSpy = jest
				.spyOn(validation, 'validateExternalSecretsPermissions')
				.mockResolvedValue();

			const data = { apiKey: 'test-key' };

			await service.checkCredentialData('apiCredential', data, ownerUser, testProjectId);

			expect(validateSpy).toHaveBeenCalledWith({
				user: ownerUser,
				projectId: testProjectId,
				dataToSave: data,
			});
		});

		it('should throw BadRequestError when required field is missing and has no default', async () => {
			credentialsHelper.getCredentialsProperties.mockReturnValue([
				{
					displayName: 'API Key',
					name: 'apiKey',
					type: 'string',
					required: true,
					default: undefined,
					displayOptions: {},
				},
			]);

			const data = {}; // apiKey is missing

			await expect(
				service.checkCredentialData('apiCredential', data, ownerUser, testProjectId),
			).rejects.toThrow('The field "apiKey" is mandatory for credentials of type "apiCredential"');
		});

		it('should throw when required field value is undefined', async () => {
			credentialsHelper.getCredentialsProperties.mockReturnValue([
				{
					displayName: 'API Key',
					name: 'apiKey',
					type: 'string',
					required: true,
					default: '',
					displayOptions: {},
				},
			]);

			const data = { apiKey: undefined } as unknown as ICredentialDataDecryptedObject;

			await expect(
				service.checkCredentialData('apiCredential', data, ownerUser, testProjectId),
			).rejects.toThrow('The field "apiKey" is mandatory for credentials of type "apiCredential"');
		});

		it('should throw when required field value is empty string', async () => {
			credentialsHelper.getCredentialsProperties.mockReturnValue([
				{
					displayName: 'API Key',
					name: 'apiKey',
					type: 'string',
					required: true,
					default: '',
					displayOptions: {},
				},
			]);

			const data = { apiKey: '' };

			await expect(
				service.checkCredentialData('apiCredential', data, ownerUser, testProjectId),
			).rejects.toThrow('The field "apiKey" is mandatory for credentials of type "apiCredential"');
		});

		it('should skip validation when required field has displayOptions undefined', async () => {
			credentialsHelper.getCredentialsProperties.mockReturnValue([
				{
					displayName: 'API Key',
					name: 'apiKey',
					type: 'string',
					required: true,
					default: undefined,
					displayOptions: undefined,
				},
			]);

			const data = {}; // apiKey is missing

			// Should not throw because displayOptions is undefined, so validation is skipped
			await expect(
				service.checkCredentialData('apiCredential', data, ownerUser, testProjectId),
			).resolves.not.toThrow();
		});

		it('should skip validation when required field is hidden by displayOptions', async () => {
			credentialsHelper.getCredentialsProperties.mockReturnValue([
				{
					displayName: 'API Key',
					name: 'apiKey',
					type: 'string',
					required: true,
					default: undefined,
					displayOptions: {
						show: {
							authType: ['oauth2'],
						},
					},
				},
			]);

			const data = { authType: 'apiKey' }; // apiKey is missing and field is hidden

			// Should not throw because displayParameter will return false (field is hidden)
			await expect(
				service.checkCredentialData('apiCredential', data, ownerUser, testProjectId),
			).resolves.not.toThrow();
		});

		it('should validate when required field is shown by displayOptions', async () => {
			credentialsHelper.getCredentialsProperties.mockReturnValue([
				{
					displayName: 'API Key',
					name: 'apiKey',
					type: 'string',
					required: true,
					default: undefined,
					displayOptions: {
						show: {
							authType: ['oauth2'],
						},
					},
				},
			]);

			const data = { authType: 'oauth2' }; // Field is shown but apiKey is missing

			// Should throw because field is shown but value is missing
			await expect(
				service.checkCredentialData('apiCredential', data, ownerUser, testProjectId),
			).rejects.toThrow('The field "apiKey" is mandatory for credentials of type "apiCredential"');
		});

		it('should validate when displayOptions is explicitly null (edge case)', async () => {
			credentialsHelper.getCredentialsProperties.mockReturnValue([
				{
					displayName: 'API Key',
					name: 'apiKey',
					type: 'string',
					required: true,
					default: undefined,
					// @ts-expect-error - Testing edge case where displayOptions is explicitly null
					displayOptions: null,
				},
			]);

			const data = {}; // apiKey is missing

			// null !== undefined, so the check passes and displayParameter is called
			// displayParameter treats null as falsy and returns true, so validation proceeds
			await expect(
				service.checkCredentialData('apiCredential', data, ownerUser, testProjectId),
			).rejects.toThrow('The field "apiKey" is mandatory for credentials of type "apiCredential"');
		});
	});

	describe('validateOAuthCredentialUrls', () => {
		const testProjectId = 'test-project-id';

		beforeEach(() => {
			credentialsHelper.getCredentialsProperties.mockReturnValue([]);
			jest.spyOn(validation, 'validateExternalSecretsPermissions').mockResolvedValue();
		});

		it('should reject an invalid OAuth2 URL', async () => {
			credentialTypes.getParentTypes.mockReturnValue(['oAuth2Api']);
			const data = { authUrl: 'javascript:alert(1)' };

			await expect(
				service.checkCredentialData('myOAuth2Cred', data, ownerUser, testProjectId),
			).rejects.toThrow('OAuth url must use HTTP or HTTPS protocol');
		});

		it('should accept a valid OAuth2 URL', async () => {
			credentialTypes.getParentTypes.mockReturnValue(['oAuth2Api']);
			const data = { authUrl: 'https://example.com/oauth/authorize' };

			await expect(
				service.checkCredentialData('myOAuth2Cred', data, ownerUser, testProjectId),
			).resolves.toBeUndefined();
		});

		it('should skip validation for expression-prefixed OAuth2 URLs', async () => {
			credentialTypes.getParentTypes.mockReturnValue(['oAuth2Api']);
			const data = {
				authUrl: '=https://example.com/oauth/authorize',
				accessTokenUrl: '={{ $vars.tokenUrl }}',
				serverUrl: '={{ $vars.serverUrl }}',
			};

			await expect(
				service.checkCredentialData('myOAuth2Cred', data, ownerUser, testProjectId),
			).resolves.toBeUndefined();
		});

		it('should skip validation for expression-prefixed OAuth1 URLs', async () => {
			credentialTypes.getParentTypes.mockReturnValue(['oAuth1Api']);
			const data = {
				authUrl: '={{ $vars.authUrl }}',
				requestTokenUrl: '=https://example.com/request-token',
				accessTokenUrl: '={{ $vars.tokenUrl }}',
			};

			await expect(
				service.checkCredentialData('myOAuth1Cred', data, ownerUser, testProjectId),
			).resolves.toBeUndefined();
		});
	});
});
