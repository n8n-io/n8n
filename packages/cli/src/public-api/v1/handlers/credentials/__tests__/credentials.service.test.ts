import { CredentialsEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import type { GenericValue, IDataObject, INodeProperties } from 'n8n-workflow';

import type { IDependency } from '@/public-api/types';

import { toJsonSchema, saveCredential } from '../credentials.service';

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

	describe('saveCredential', () => {
		it('should save credential with personal project when projectId is not provided', async () => {
			const mockUser = { id: 'user1', email: 'test@example.com' } as any;
			const mockCredential = new CredentialsEntity();
			mockCredential.id = 'cred1';
			mockCredential.name = 'Test Credential';
			mockCredential.type = 'testType';
			mockCredential.data = 'encrypted-data';

			const mockEncryptedData = { id: 'cred1', name: 'Test Credential' } as any;
			const mockProject = { id: 'project1', type: 'personal' };

			const mockTransactionManager = {
				save: jest.fn().mockResolvedValue(mockCredential),
			};

			const mockProjectRepository = {
				manager: { transaction: jest.fn((cb) => cb(mockTransactionManager)) },
				getPersonalProjectForUserOrFail: jest.fn().mockResolvedValue(mockProject),
			};

			const mockProjectService = {
				getProjectForCredentialCreation: jest.fn().mockResolvedValue(mockProject),
			};

			const mockSharedCredentialsRepository = {
				findCredentialOwningProject: jest.fn().mockResolvedValue(mockProject),
			};

			const mockExternalHooks = {
				run: jest.fn().mockResolvedValue(undefined),
			};

			const mockEventService = {
				emit: jest.fn(),
			};

			jest.spyOn(Container, 'get').mockImplementation((token: any) => {
				if (token.name === 'ProjectRepository') return mockProjectRepository;
				if (token.name === 'ProjectService') return mockProjectService;
				if (token.name === 'SharedCredentialsRepository') return mockSharedCredentialsRepository;
				if (token.name === 'ExternalHooks') return mockExternalHooks;
				if (token.name === 'EventService') return mockEventService;
				return {} as any;
			});

			const result = await saveCredential(mockCredential, mockUser, mockEncryptedData);

			expect(result).toBeDefined();
			expect(result.id).toBe('cred1');
			expect(mockTransactionManager.save).toHaveBeenCalledTimes(2);
			expect(mockExternalHooks.run).toHaveBeenCalledWith('credentials.create', [mockEncryptedData]);
			expect(mockEventService.emit).toHaveBeenCalledWith(
				'credentials-created',
				expect.objectContaining({
					user: mockUser,
					credentialType: mockCredential.type,
					credentialId: mockCredential.id,
					projectId: mockProject.id,
					projectType: mockProject.type,
					publicApi: true,
				}),
			);

			jest.restoreAllMocks();
		});

		it('should save credential with specified project when projectId is provided', async () => {
			const mockUser = { id: 'user1', email: 'test@example.com' } as any;
			const mockCredential = new CredentialsEntity();
			mockCredential.id = 'cred2';
			mockCredential.name = 'Team Credential';
			mockCredential.type = 'testType';
			mockCredential.data = 'encrypted-data';

			const mockEncryptedData = { id: 'cred2', name: 'Team Credential' } as any;
			const mockProject = { id: 'project2', type: 'team' };

			const mockTransactionManager = {
				save: jest.fn().mockResolvedValue(mockCredential),
			};

			const mockProjectRepository = {
				manager: { transaction: jest.fn((cb) => cb(mockTransactionManager)) },
			};

			const mockProjectService = {
				getProjectForCredentialCreation: jest.fn().mockResolvedValue(mockProject),
			};

			const mockSharedCredentialsRepository = {
				findCredentialOwningProject: jest.fn().mockResolvedValue(mockProject),
			};

			const mockExternalHooks = {
				run: jest.fn().mockResolvedValue(undefined),
			};

			const mockEventService = {
				emit: jest.fn(),
			};

			jest.spyOn(Container, 'get').mockImplementation((token: any) => {
				if (token.name === 'ProjectRepository') return mockProjectRepository;
				if (token.name === 'ProjectService') return mockProjectService;
				if (token.name === 'SharedCredentialsRepository') return mockSharedCredentialsRepository;
				if (token.name === 'ExternalHooks') return mockExternalHooks;
				if (token.name === 'EventService') return mockEventService;
				return {} as any;
			});

			const result = await saveCredential(mockCredential, mockUser, mockEncryptedData, 'project2');

			expect(result).toBeDefined();
			expect(result.id).toBe('cred2');
			expect(mockProjectService.getProjectForCredentialCreation).toHaveBeenCalledWith(
				mockUser,
				'project2',
				mockTransactionManager,
			);
			expect(mockTransactionManager.save).toHaveBeenCalledTimes(2);
			expect(mockExternalHooks.run).toHaveBeenCalledWith('credentials.create', [mockEncryptedData]);
			expect(mockEventService.emit).toHaveBeenCalledWith(
				'credentials-created',
				expect.objectContaining({
					user: mockUser,
					credentialType: mockCredential.type,
					credentialId: mockCredential.id,
					projectId: mockProject.id,
					projectType: mockProject.type,
					publicApi: true,
				}),
			);

			jest.restoreAllMocks();
		});
	});
});
