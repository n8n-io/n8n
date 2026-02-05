import type { CredentialsEntity, User } from '@n8n/db';
import { CredentialsRepository, GLOBAL_OWNER_ROLE, GLOBAL_MEMBER_ROLE } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { Cipher } from 'n8n-core';
import type { InstanceSettings } from 'n8n-core';
import type { GenericValue, IDataObject, INodeProperties } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import type { IDependency } from '@/public-api/types';

import { toJsonSchema, updateCredential } from '../credentials.service';

// Set up real Cipher with mocked InstanceSettings for encryption
const cipher = new Cipher(mock<InstanceSettings>({ encryptionKey: 'test-encryption-key' }));
Container.set(Cipher, cipher);

describe('CredentialsService', () => {
	describe('toJsonSchema', () => {
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
				return mock();
			});

			jest.clearAllMocks();

			ownerUser = { id: 'user-with-permission', role: GLOBAL_OWNER_ROLE } as User;
			memberUser = { id: 'user-without-permission', role: GLOBAL_MEMBER_ROLE } as User;
		});

		describe('external secrets', () => {
			it('should throw error when user without permission tries to add external secret expression', async () => {
				const existingCredential = mock<CredentialsEntity>({
					id: 'cred-id',
					name: 'Test Credential',
					type: 'testApi',
					isManaged: false,
				});

				credentialsRepository.findOneBy = jest.fn().mockResolvedValue(existingCredential);
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
				});

				credentialsRepository.findOneBy = jest.fn().mockResolvedValue(existingCredential);

				// Mock credential that already has secret expression
				jest
					.mocked(credentialsService.decrypt)
					.mockReturnValue({ apiKey: '{{ $secrets.oldKey }}' });

				await expect(
					updateCredential('cred-id', memberUser, {
						data: { apiKey: '$secrets.newKey' },
					}),
				).rejects.toThrow('Lacking permissions to reference external secrets in credentials');
			});

			it('should allow updates when no external secret expression is being changed', async () => {
				const existingCredential = mock<CredentialsEntity>({
					id: 'cred-id',
					name: 'Test Credential',
					type: 'testApi',
					isManaged: false,
				});

				credentialsRepository.findOneBy = jest.fn().mockResolvedValue(existingCredential);

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
				});

				credentialsRepository.findOneBy = jest.fn().mockResolvedValue(existingCredential);

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
				});
				credentialsRepository.findOneBy = jest.fn().mockResolvedValue(existingCredential);
				jest.mocked(credentialsService.decrypt).mockReturnValue({ apiKey: 'regular-key' });
				credentialsRepository.update = jest.fn().mockResolvedValue(undefined);

				await updateCredential('cred-id', ownerUser, {
					data: { apiKey: '{{ $secrets.myKey }}' },
				});
			});
		});
	});
});
