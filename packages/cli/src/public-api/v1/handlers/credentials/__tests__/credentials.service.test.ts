import type { CredentialsEntity, Project, SharedCredentials, User } from '@n8n/db';
import { CredentialsRepository, GLOBAL_OWNER_ROLE, GLOBAL_MEMBER_ROLE } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { Cipher } from 'n8n-core';
import type { InstanceSettings } from 'n8n-core';
import type { GenericValue, IDataObject, INodeProperties } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { ExternalSecretsConfig } from '@/modules/external-secrets.ee/external-secrets.config';
import { SecretsProviderAccessCheckService } from '@/modules/external-secrets.ee/secret-provider-access-check.service.ee';
import type { IDependency } from '@/public-api/types';

import { buildSharedForCredential, toJsonSchema, updateCredential } from '../credentials.service';

// Set up real Cipher with mocked InstanceSettings for encryption
const cipher = new Cipher(mock<InstanceSettings>({ encryptionKey: 'test-encryption-key' }));
Container.set(Cipher, cipher);

describe('CredentialsService', () => {
	let mockExternalSecretsConfig: ExternalSecretsConfig;
	const canAccessProviderFromProjectMock = jest.fn();
	const mockSecretsProviderAccessCheckService = mock<SecretsProviderAccessCheckService>({
		isProviderAvailableInProject: canAccessProviderFromProjectMock,
	});
	beforeEach(() => {
		mockExternalSecretsConfig = new ExternalSecretsConfig();
		Container.set(ExternalSecretsConfig, mockExternalSecretsConfig);
		Container.set(SecretsProviderAccessCheckService, mockSecretsProviderAccessCheckService);

		canAccessProviderFromProjectMock.mockResolvedValue(true);
	});
	describe('buildSharedForCredential', () => {
		it('returns one shared entry when credential is shared with one project', () => {
			const createdAt = new Date('2024-01-01T00:00:00.000Z');
			const updatedAt = new Date('2024-01-02T00:00:00.000Z');
			const credential = {
				shared: [
					{
						role: 'credential:owner',
						createdAt,
						updatedAt,
						project: { id: 'proj-1', name: 'My Project' },
					},
				],
			} as unknown as CredentialsEntity;
			expect(buildSharedForCredential(credential)).toEqual([
				{
					id: 'proj-1',
					name: 'My Project',
					role: 'credential:owner',
					createdAt,
					updatedAt,
				},
			]);
		});

		it('returns multiple shared entries and skips shared entries without project', () => {
			const createdAt1 = new Date('2024-01-01T00:00:00.000Z');
			const updatedAt1 = new Date('2024-01-02T00:00:00.000Z');
			const createdAt2 = new Date('2024-02-01T00:00:00.000Z');
			const updatedAt2 = new Date('2024-02-02T00:00:00.000Z');
			const credential = {
				shared: [
					{
						role: 'credential:owner',
						createdAt: createdAt1,
						updatedAt: updatedAt1,
						project: { id: 'proj-1', name: 'Project One' },
					},
					{ role: 'credential:user', createdAt: createdAt2, updatedAt: updatedAt2, project: null },
					{
						role: 'credential:user',
						createdAt: createdAt2,
						updatedAt: updatedAt2,
						project: { id: 'proj-2', name: 'Project Two' },
					},
				],
			} as unknown as CredentialsEntity;
			expect(buildSharedForCredential(credential)).toEqual([
				{
					id: 'proj-1',
					name: 'Project One',
					role: 'credential:owner',
					createdAt: createdAt1,
					updatedAt: updatedAt1,
				},
				{
					id: 'proj-2',
					name: 'Project Two',
					role: 'credential:user',
					createdAt: createdAt2,
					updatedAt: updatedAt2,
				},
			]);
		});
	});

	describe('toJsonSchema', () => {
		it('should create separate conditionals for different values of the same dependant field', () => {
			// This test simulates the JWT auth credential scenario where
			// multiple properties depend on the same field (keyType) but with different values
			const properties: INodeProperties[] = [
				{
					name: 'keyType',
					type: 'options',
					options: [
						{ value: 'passphrase', name: 'Passphrase' },
						{ value: 'pemKey', name: 'PEM Key' },
					],
					displayName: 'Key Type',
					default: 'passphrase',
				},
				{
					name: 'secret',
					type: 'string',
					displayName: 'Secret',
					default: '',
					displayOptions: {
						show: {
							keyType: ['passphrase'],
						},
					},
				},
				{
					name: 'privateKey',
					type: 'string',
					displayName: 'Private Key',
					default: '',
					displayOptions: {
						show: {
							keyType: ['pemKey'],
						},
					},
				},
				{
					name: 'publicKey',
					type: 'string',
					displayName: 'Public Key',
					default: '',
					displayOptions: {
						show: {
							keyType: ['pemKey'],
						},
					},
				},
			];

			const schema = toJsonSchema(properties);

			const props = schema.properties as IDataObject;
			expect(props).toBeDefined();
			expect(props.keyType).toEqual({
				type: 'string',
				enum: ['passphrase', 'pemKey'],
			});

			// All conditional fields should not be globally required
			expect(schema.required).not.toContain('secret');
			expect(schema.required).not.toContain('privateKey');
			expect(schema.required).not.toContain('publicKey');

			// Should have 2 separate conditionals (one for each keyType value)
			const allOf = schema.allOf as GenericValue[] | IDataObject[];
			expect(Array.isArray(allOf)).toBe(true);
			expect(allOf?.length).toBe(2);

			// Find conditional for passphrase
			const passphraseCondition = allOf?.find(
				(cond) => (cond as any).if?.properties?.keyType?.enum?.[0] === 'passphrase',
			) as IDependency;
			expect(passphraseCondition).toBeDefined();
			expect(passphraseCondition.then?.allOf).toHaveLength(1);
			expect(passphraseCondition.then?.allOf[0].required).toContain('secret');
			expect(passphraseCondition.then?.allOf[0].required).not.toContain('privateKey');
			expect(passphraseCondition.then?.allOf[0].required).not.toContain('publicKey');

			// Find conditional for pemKey
			const pemKeyCondition = allOf?.find(
				(cond) => (cond as any).if?.properties?.keyType?.enum?.[0] === 'pemKey',
			) as IDependency;
			expect(pemKeyCondition).toBeDefined();
			expect(pemKeyCondition.then?.allOf).toHaveLength(2);
			expect(
				pemKeyCondition.then?.allOf.some((req: any) => req.required?.includes('privateKey')),
			).toBe(true);
			expect(
				pemKeyCondition.then?.allOf.some((req: any) => req.required?.includes('publicKey')),
			).toBe(true);
			expect(pemKeyCondition.then?.allOf.some((req: any) => req.required?.includes('secret'))).toBe(
				false,
			);
		});

		it('should handle properties with no displayOptions as globally required', () => {
			const properties: INodeProperties[] = [
				{ name: 'apiKey', type: 'string', required: true, displayName: 'API Key', default: '' },
				{ name: 'domain', type: 'string', required: true, displayName: 'Domain', default: '' },
				{
					name: 'optionalField',
					type: 'string',
					required: false,
					displayName: 'Optional',
					default: '',
				},
			];

			const schema = toJsonSchema(properties);

			expect(schema.required).toEqual(expect.arrayContaining(['apiKey', 'domain']));
			expect(schema.required).not.toContain('optionalField');
			expect(schema.allOf).toBeUndefined();
		});

		it('should handle mix of required and conditional properties', () => {
			const properties: INodeProperties[] = [
				{ name: 'apiKey', type: 'string', required: true, displayName: 'API Key', default: '' },
				{
					name: 'authType',
					type: 'options',
					required: true,
					options: [
						{ value: 'basic', name: 'Basic' },
						{ value: 'oauth2', name: 'OAuth2' },
					],
					displayName: 'Auth Type',
					default: 'basic',
				},
				{
					name: 'username',
					type: 'string',
					displayName: 'Username',
					default: '',
					displayOptions: {
						show: {
							authType: ['basic'],
						},
					},
				},
				{
					name: 'password',
					type: 'string',
					displayName: 'Password',
					default: '',
					displayOptions: {
						show: {
							authType: ['basic'],
						},
					},
				},
				{
					name: 'clientId',
					type: 'string',
					displayName: 'Client ID',
					default: '',
					displayOptions: {
						show: {
							authType: ['oauth2'],
						},
					},
				},
			];

			const schema = toJsonSchema(properties);

			// apiKey and authType should be globally required
			expect(schema.required).toEqual(expect.arrayContaining(['apiKey', 'authType']));
			// Conditional fields should not be globally required
			expect(schema.required).not.toContain('username');
			expect(schema.required).not.toContain('password');
			expect(schema.required).not.toContain('clientId');

			// Should have 2 conditionals
			const allOf = schema.allOf as GenericValue[] | IDataObject[];
			expect(allOf?.length).toBe(2);
		});

		it('should handle properties with multiple options depending on same field', () => {
			const properties: INodeProperties[] = [
				{
					name: 'operation',
					type: 'options',
					options: [
						{ value: 'create', name: 'Create' },
						{ value: 'update', name: 'Update' },
						{ value: 'delete', name: 'Delete' },
					],
					displayName: 'Operation',
					default: 'create',
				},
				{
					name: 'createField',
					type: 'string',
					displayName: 'Create Field',
					default: '',
					displayOptions: {
						show: {
							operation: ['create'],
						},
					},
				},
				{
					name: 'updateField',
					type: 'string',
					displayName: 'Update Field',
					default: '',
					displayOptions: {
						show: {
							operation: ['update'],
						},
					},
				},
				{
					name: 'deleteField',
					type: 'string',
					displayName: 'Delete Field',
					default: '',
					displayOptions: {
						show: {
							operation: ['delete'],
						},
					},
				},
			];

			const schema = toJsonSchema(properties);

			// Should have 3 separate conditionals (one for each operation)
			const allOf = schema.allOf as GenericValue[] | IDataObject[];
			expect(allOf?.length).toBe(3);

			// Verify each conditional is correct
			const createCondition = allOf?.find(
				(cond) => (cond as any).if?.properties?.operation?.enum?.[0] === 'create',
			) as IDependency;
			expect(createCondition?.then?.allOf[0].required).toContain('createField');

			const updateCondition = allOf?.find(
				(cond) => (cond as any).if?.properties?.operation?.enum?.[0] === 'update',
			) as IDependency;
			expect(updateCondition?.then?.allOf[0].required).toContain('updateField');

			const deleteCondition = allOf?.find(
				(cond) => (cond as any).if?.properties?.operation?.enum?.[0] === 'delete',
			) as IDependency;
			expect(deleteCondition?.then?.allOf[0].required).toContain('deleteField');
		});

		it('should add "false" displayOptions.show dependant value as allof condition', () => {
			const properties: INodeProperties[] = [
				{ name: 'field1', type: 'string', required: true, displayName: 'Field 1', default: '' },
				{
					name: 'field2',
					type: 'options',
					required: true,
					options: [
						{ value: 'opt1', name: 'opt1' },
						{ value: 'opt2', name: 'opt2' },
					],
					displayName: 'Field 2',
					default: 'opt1',
				},
				{
					name: 'field3',
					type: 'string',
					displayName: 'Field 3',
					default: '',
					displayOptions: {
						show: {
							field2: [false], // boolean false as dependant value
						},
					},
				},
			];

			const schema = toJsonSchema(properties);

			// Cast properties as IDataObject
			const props = schema.properties as IDataObject;

			expect(props).toBeDefined();
			expect(props.field1).toEqual({ type: 'string' });
			expect(props.field2).toEqual({
				type: 'string',
				enum: ['opt1', 'opt2'],
			});
			expect(props.field3).toEqual({ type: 'string' });

			// field1 and field2 required globally, field3 required conditionally
			expect(schema.required).toEqual(expect.arrayContaining(['field1', 'field2']));
			expect(schema.required).not.toContain('field3');

			const allOf = schema.allOf as GenericValue[] | IDataObject[];
			expect(Array.isArray(allOf)).toBe(true);
			expect(allOf?.length).toBeGreaterThan(0);

			const condition = allOf?.find((cond) => (cond as any).if?.properties?.field2) as IDependency;
			expect(condition).toBeDefined();
			expect((condition.if?.properties as any).field2).toEqual({
				enum: [false], // boolean false as dependant value
			});

			// then block requires field3 when field2 === false
			expect(condition.then?.allOf.some((req: any) => req.required?.includes('field3'))).toBe(true);
			// else block forbids field3 when field2 !== false
			expect(
				condition.else?.allOf.some((notReq: any) => notReq.not?.required?.includes('field3')),
			).toBe(true);
		});
	});

	describe('updateCredential', () => {
		let credentialsRepository: CredentialsRepository;
		let ownerUser: User;
		let memberUser: User;

		const credentialsService = new CredentialsService(
			mock(), // credentialsRepository
			mock(), // sharedCredentialsRepository
			mock(), // ownershipService
			mock(), // logger
			mock(), // errorReporter
			mock(), // credentialsTester
			mock(), // externalHooks
			mock(), // credentialTypes
			mock(), // projectRepository
			mock(), // projectService
			mock(), // roleService
			mock(), // userRepository
			mock(), // credentialsFinderService
			mock(), // credentialsHelper
			mock(), // externalSecretsConfig
			mock(), // externalSecretsProviderAccessCheckService
		);

		jest.spyOn(credentialsService, 'decrypt');

		beforeEach(() => {
			credentialsRepository = mock<CredentialsRepository>();

			jest.spyOn(Container, 'get').mockImplementation((serviceClass) => {
				if (serviceClass === CredentialsService) {
					return credentialsService;
				}
				if (serviceClass === CredentialsRepository) {
					return credentialsRepository;
				}
				if (serviceClass === Cipher) {
					return cipher;
				}
				if (serviceClass === SecretsProviderAccessCheckService) {
					return mockSecretsProviderAccessCheckService;
				}
				if (serviceClass === ExternalSecretsConfig) {
					return mockExternalSecretsConfig;
				}
				return mock();
			});

			//jest.clearAllMocks();

			ownerUser = { id: 'user-with-permission', role: GLOBAL_OWNER_ROLE } as User;
			memberUser = { id: 'user-without-permission', role: GLOBAL_MEMBER_ROLE } as User;
		});

		describe('external secrets', () => {
			const owningProjectData: Partial<Project> = {
				id: 'nUnAvqXSO4nw522z',
				name: 'Test Project',
				type: 'team',
				icon: { type: 'icon', value: 'layers' },
			};
			const owningProject = {
				role: 'credential:owner',
				project: owningProjectData as Project,
			} as SharedCredentials;
			it('should throw error when user without permission tries to add external secret expression', async () => {
				const existingCredential = mock<CredentialsEntity>({
					id: 'cred-id',
					name: 'Test Credential',
					type: 'testApi',
					isManaged: false,
					shared: [owningProject],
				});

				credentialsRepository.findOne = jest.fn().mockResolvedValue(existingCredential);
				credentialsRepository.update = jest.fn().mockResolvedValue(undefined);
				// mock credential that doesn't have secret expression yet
				jest.mocked(credentialsService.decrypt).mockReturnValue({ apiKey: 'regular-secret' });

				await expect(
					updateCredential('cred-id', memberUser, {
						data: { apiKey: '{{ $secrets.myKey }}' },
					}),
				).rejects.toThrow('Lacking permissions to reference external secrets in credentials');
			});

			it('should throw error when user without permission tries to modify existing external secret expression', async () => {
				const existingCredential = mock<CredentialsEntity>({
					id: 'cred-id',
					name: 'Test Credential',
					type: 'testApi',
					isManaged: false,
					shared: [owningProject],
				});

				credentialsRepository.findOne = jest.fn().mockResolvedValue(existingCredential);
				credentialsRepository.update = jest.fn().mockResolvedValue(undefined);

				// Mock credential that already has secret expression
				jest
					.mocked(credentialsService.decrypt)
					.mockReturnValue({ apiKey: '{{ $secrets.oldKey }}' });

				await expect(
					updateCredential('cred-id', memberUser, {
						data: { apiKey: '{{ $secrets.newKey }}' },
					}),
				).rejects.toThrow('Lacking permissions to reference external secrets in credentials');
			});

			it('should throw error when external secret store referenced in expression is not shared with current project', async () => {
				const existingCredential = mock<CredentialsEntity>({
					id: 'UdGtZBYb2TLDgSHy',
					name: 'Test Credential',
					type: 'testApi',
					isManaged: false,
					shared: [owningProject],
				});
				const secretProviderKey = 'vault';
				const secretExpression = `={{ $secrets.${secretProviderKey}.myKey }}`;

				credentialsRepository.findOne = jest.fn().mockResolvedValue(existingCredential);
				credentialsRepository.update = jest.fn().mockResolvedValue(undefined);
				jest.mocked(credentialsService.decrypt).mockReturnValue({
					apiKey: 'currentPlainTextValue',
				});
				jest
					.mocked(mockSecretsProviderAccessCheckService.isProviderAvailableInProject)
					.mockResolvedValue(false);
				mockExternalSecretsConfig.externalSecretsForProjects = true;

				await expect(
					updateCredential(existingCredential.id, ownerUser, {
						data: { apiKey: secretExpression },
					}),
				).rejects.toThrow(
					'The secret provider "vault" used in "apiKey" does not exist in this project',
				);
			});

			it('should allow updates when no external secret expression is being changed', async () => {
				const existingCredential = mock<CredentialsEntity>({
					id: 'cred-id',
					name: 'Test Credential',
					type: 'testApi',
					isManaged: false,
					shared: [owningProject],
				});

				credentialsRepository.findOne = jest.fn().mockResolvedValue(existingCredential);
				credentialsRepository.update = jest.fn().mockResolvedValue(undefined);

				// Mock credential that has existing secret expression
				jest.mocked(credentialsService.decrypt).mockReturnValue({ apiKey: '{{ $secrets.myKey }}' });

				credentialsRepository.update = jest.fn().mockResolvedValue(undefined);

				await updateCredential('cred-id', memberUser, {
					name: 'Updated Name',
				});
			});

			it('should allow updates of non-secret data without specific external-secret permission', async () => {
				const existingCredential = mock<CredentialsEntity>({
					id: 'cred-id',
					name: 'Test Credential',
					type: 'testApi',
					isManaged: false,
					shared: [owningProject],
				});

				credentialsRepository.findOne = jest.fn().mockResolvedValue(existingCredential);
				credentialsRepository.update = jest.fn().mockResolvedValue(undefined);

				// Mock credential not using any external secret expressions
				jest.mocked(credentialsService.decrypt).mockReturnValue({ apiKey: 'regular-key' });

				credentialsRepository.update = jest.fn().mockResolvedValue(undefined);

				await updateCredential('cred-id', memberUser, {
					data: { apiKey: 'another-regular-key' },
				});
			});

			it('should allow user with permission to add external secret expression', async () => {
				const existingCredential = mock<CredentialsEntity>({
					id: 'cred-id',
					name: 'Test Credential',
					type: 'testApi',
					isManaged: false,
					shared: [owningProject],
				});
				credentialsRepository.findOne = jest.fn().mockResolvedValue(existingCredential);
				credentialsRepository.update = jest.fn().mockResolvedValue(undefined);
				jest.mocked(credentialsService.decrypt).mockReturnValue({ apiKey: 'regular-key' });
				jest
					.mocked(mockSecretsProviderAccessCheckService.isProviderAvailableInProject)
					.mockResolvedValue(true);
				credentialsRepository.update = jest.fn().mockResolvedValue(undefined);

				await updateCredential('cred-id', ownerUser, {
					data: { apiKey: '{{ $secrets.myKey }}' },
				});
			});
		});
	});
});
