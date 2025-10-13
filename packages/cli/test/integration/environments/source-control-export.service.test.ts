import type { SourceControlledFile } from '@n8n/api-types';
import { createTeamProject, mockInstance, testDb } from '@n8n/backend-test-utils';
import {
	CredentialsEntity,
	CredentialsRepository,
	GLOBAL_ADMIN_ROLE,
	type Project,
	ProjectRepository,
	SharedCredentialsRepository,
	type User,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { Cipher, InstanceSettings } from 'n8n-core';
import { writeFile as fsWriteFile } from 'node:fs/promises';
import path from 'node:path';
import { v4 as uuid } from 'uuid';

import { SourceControlExportService } from '@/environments.ee/source-control/source-control-export.service.ee';
import type { ExportableCredential } from '@/environments.ee/source-control/types/exportable-credential';

import { createCredentials } from '../shared/db/credentials';
import { createUser } from '../shared/db/users';

// Mock file system operations
jest.mock('node:fs/promises');
jest.mock('@/environments.ee/source-control/source-control-helper.ee', () => ({
	...jest.requireActual('@/environments.ee/source-control/source-control-helper.ee'),
	sourceControlFoldersExistCheck: jest.fn().mockResolvedValue(true),
}));

describe('SourceControlExportService Integration', () => {
	let exportService: SourceControlExportService;
	let testUser: User;
	let personalProject: Project;
	let teamProject: Project;
	let exportDirectory: string;

	// Repositories
	let credentialsRepository: CredentialsRepository;
	let sharedCredentialsRepository: SharedCredentialsRepository;
	let projectRepository: ProjectRepository;

	// Mocked functions
	let mockFsWriteFile: jest.MockedFunction<typeof fsWriteFile>;

	beforeAll(async () => {
		await testDb.init();

		// Get repositories
		credentialsRepository = Container.get(CredentialsRepository);
		sharedCredentialsRepository = Container.get(SharedCredentialsRepository);
		projectRepository = Container.get(ProjectRepository);

		// Create test user
		testUser = await createUser({ role: GLOBAL_ADMIN_ROLE });
		personalProject = await projectRepository.getPersonalProjectForUserOrFail(testUser.id);
		teamProject = await createTeamProject('Test Team Project', testUser);

		// Setup export directory for testing (no longer creating real directories)
		exportDirectory = path.join(process.cwd(), 'test-exports-' + uuid());

		// Mock the instance settings to use our test directory
		mockInstance(InstanceSettings, {
			n8nFolder: exportDirectory,
		});

		// Get the service from container (this will use real dependencies)
		exportService = Container.get(SourceControlExportService);
	});

	afterAll(async () => {
		await testDb.terminate();
		// No cleanup needed since we're not creating real directories
	});

	beforeEach(async () => {
		// Setup mocks before each test
		mockFsWriteFile = jest.mocked(fsWriteFile);
		mockFsWriteFile.mockClear();
		mockFsWriteFile.mockResolvedValue();
	});

	afterEach(async () => {
		// Clear test data between tests
		await testDb.truncate(['SharedCredentials', 'CredentialsEntity']);
		// Reset mocks
		jest.clearAllMocks();
	});

	describe('exportCredentialsToWorkFolder', () => {
		// Helper to get the expected file path for a credential
		const getExpectedCredentialPath = (credentialId: string): string => {
			return path.join(exportDirectory, 'git', 'credential_stubs', `${credentialId}.json`);
		};

		// Helper to parse the JSON content that was written to a file
		const getWrittenCredentialData = (credentialId: string): ExportableCredential => {
			const expectedPath = getExpectedCredentialPath(credentialId);
			const writeCall = mockFsWriteFile.mock.calls.find(([filePath]) => filePath === expectedPath);
			if (!writeCall) {
				throw new Error(
					`No write call found for credential ${credentialId} at path ${expectedPath}`,
				);
			}
			const [, content] = writeCall;
			return JSON.parse(content as string);
		};

		it('should export personal project credentials with correct owner information', async () => {
			// Arrange
			const credentialData = {
				clientId: 'test-client-id',
				clientSecret: 'test-secret',
				apiKey: 'test-api-key',
			};

			const credential = await createCredentials(
				{
					name: 'Test Personal Credential',
					type: 'testCredentialType',
					data: Container.get(Cipher).encrypt(credentialData),
				},
				personalProject,
			);

			const candidates = [{ id: credential.id }] as SourceControlledFile[];

			// Act
			const result = await exportService.exportCredentialsToWorkFolder(candidates);

			// Assert
			expect(result.count).toBe(1);
			expect(result.files).toHaveLength(1);
			expect(result.missingIds).toEqual([]);

			// Verify file write was called with correct path and content
			expect(mockFsWriteFile).toHaveBeenCalledTimes(1);
			const expectedPath = getExpectedCredentialPath(credential.id);
			expect(mockFsWriteFile).toHaveBeenCalledWith(
				expectedPath,
				expect.stringContaining('"name": "Test Personal Credential"'),
			);

			// Verify the exported credential content
			const exportedCredential = getWrittenCredentialData(credential.id);
			expect(exportedCredential).toMatchObject({
				id: credential.id,
				name: 'Test Personal Credential',
				type: 'testCredentialType',
				data: {
					clientId: '',
					clientSecret: '',
					apiKey: '',
				},
				ownedBy: {
					type: 'personal',
					projectId: personalProject.id,
					projectName: personalProject.name,
					personalEmail: testUser.email,
				},
			});

			// Verify sensitive data was removed
			expect(exportedCredential.data.clientId).toBe('');
			expect(exportedCredential.data.clientSecret).toBe('');
			expect(exportedCredential.data.apiKey).toBe('');
		});

		it('should export team project credentials with correct team information', async () => {
			// Arrange

			const credentialData = {
				serverUrl: 'https://example.com',
				token: 'secret-token',
			};

			const credential = await createCredentials(
				{
					name: 'Test Team Credential',
					type: 'teamCredentialType',
					data: Container.get(Cipher).encrypt(credentialData),
				},
				teamProject,
			);

			const candidates = [{ id: credential.id }] as SourceControlledFile[];

			// Act
			const result = await exportService.exportCredentialsToWorkFolder(candidates);

			// Assert
			expect(result.count).toBe(1);
			expect(result.files).toHaveLength(1);
			expect(result.missingIds).toEqual([]);

			// Verify file write was called
			expect(mockFsWriteFile).toHaveBeenCalledTimes(1);
			const expectedPath = getExpectedCredentialPath(credential.id);
			expect(mockFsWriteFile).toHaveBeenCalledWith(
				expectedPath,
				expect.stringContaining('"name": "Test Team Credential"'),
			);

			// Verify file was created and has correct content
			const exportedCredential = getWrittenCredentialData(credential.id);

			expect(exportedCredential).toMatchObject({
				id: credential.id,
				name: 'Test Team Credential',
				type: 'teamCredentialType',
				data: {
					serverUrl: '',
					token: '',
				},
				ownedBy: {
					type: 'team',
					teamId: teamProject.id,
					teamName: teamProject.name,
				},
			});

			// Verify sensitive data was removed
			expect(exportedCredential.data.serverUrl).toBe('');
			expect(exportedCredential.data.token).toBe('');
		});

		it('should handle missing credentials and return correct missingIds', async () => {
			// Arrange

			const nonExistentCredentialId = uuid();
			const candidates = [
				{ id: nonExistentCredentialId },
				{ id: 'another-missing-id' },
			] as SourceControlledFile[];

			// Act
			const result = await exportService.exportCredentialsToWorkFolder(candidates);

			// Assert
			expect(result.count).toBe(0);
			expect(result.files).toHaveLength(0);
			expect(result.missingIds).toEqual([nonExistentCredentialId, 'another-missing-id']);

			// Verify no file writes were attempted
			expect(mockFsWriteFile).not.toHaveBeenCalled();
		});

		it('should correctly handle partial missing credentials', async () => {
			// Arrange

			const credential = await createCredentials(
				{
					name: 'Existing Credential',
					type: 'existingType',
					data: Container.get(Cipher).encrypt({ apiKey: 'test' }),
				},
				personalProject,
			);

			const nonExistentId = uuid();
			const candidates = [{ id: credential.id }, { id: nonExistentId }] as SourceControlledFile[];

			// Act
			const result = await exportService.exportCredentialsToWorkFolder(candidates);

			// Assert
			expect(result.count).toBe(1);
			expect(result.files).toHaveLength(1);
			expect(result.missingIds).toEqual([nonExistentId]);

			// Verify only one file write was attempted (for the existing credential)
			expect(mockFsWriteFile).toHaveBeenCalledTimes(1);

			// Verify the existing credential was exported correctly
			const exportedCredential = getWrittenCredentialData(credential.id);
			expect(exportedCredential.name).toBe('Existing Credential');
		});

		it('should handle role access correctly', async () => {
			// Arrange

			// Create a credential with explicit role setup
			const credential = new CredentialsEntity();
			Object.assign(credential, {
				name: 'Role Access Test Credential',
				type: 'roleTestType',
				data: Container.get(Cipher).encrypt({ testField: 'test-value' }),
			});

			const savedCredential = await credentialsRepository.save(credential);

			// Create the shared credential relationship
			await sharedCredentialsRepository.save(
				sharedCredentialsRepository.create({
					credentials: savedCredential,
					project: personalProject,
					role: 'credential:owner',
				}),
			);

			const candidates = [{ id: savedCredential.id }] as SourceControlledFile[];

			// Act & Assert - This should not throw an error accessing pr.role.slug
			const result = await exportService.exportCredentialsToWorkFolder(candidates);

			expect(result.count).toBe(1);
			expect(result.files).toHaveLength(1);

			// Verify file write was called
			expect(mockFsWriteFile).toHaveBeenCalledTimes(1);

			// Verify the role access worked and owner information is correct
			const exportedCredential = getWrittenCredentialData(savedCredential.id);
			expect(exportedCredential.ownedBy).toEqual({
				type: 'personal',
				projectId: personalProject.id,
				projectName: personalProject.name,
				personalEmail: testUser.email,
			});
		});

		it('should handle OAuth credentials and exclude oauthTokenData', async () => {
			// Arrange

			const credentialData = {
				clientId: 'oauth-client-id',
				clientSecret: 'oauth-secret',
				accessTokenUrl: 'https://oauth.example.com/token',
				oauthTokenData: {
					access_token: 'secret-access-token',
					refresh_token: 'secret-refresh-token',
					expires_in: 3600,
				},
			};

			const credential = await createCredentials(
				{
					name: 'OAuth Test Credential',
					type: 'oauth2Credential',
					data: Container.get(Cipher).encrypt(credentialData),
				},
				personalProject,
			);

			const candidates = [{ id: credential.id }] as SourceControlledFile[];

			// Act
			const result = await exportService.exportCredentialsToWorkFolder(candidates);

			// Assert
			expect(result.count).toBe(1);

			// Verify file write was called
			expect(mockFsWriteFile).toHaveBeenCalledTimes(1);

			const exportedCredential = getWrittenCredentialData(credential.id);

			// Verify oauthTokenData is excluded
			expect(exportedCredential.data).not.toHaveProperty('oauthTokenData');

			// Verify other fields are present but sanitized
			expect(exportedCredential.data).toMatchObject({
				clientId: '',
				clientSecret: '',
				accessTokenUrl: '',
			});
		});

		it('should handle credentials with nested data objects', async () => {
			// Arrange

			const credentialData = {
				connection: {
					host: 'db.example.com',
					port: 5432,
					username: 'user',
					password: 'secret',
				},
				settings: {
					ssl: true,
					timeout: 30,
				},
			};

			const credential = await createCredentials(
				{
					name: 'Nested Data Credential',
					type: 'databaseCredential',
					data: Container.get(Cipher).encrypt(credentialData),
				},
				teamProject,
			);

			const candidates = [{ id: credential.id }] as SourceControlledFile[];

			// Act
			const result = await exportService.exportCredentialsToWorkFolder(candidates);

			// Assert
			expect(result.count).toBe(1);

			// Verify file write was called
			expect(mockFsWriteFile).toHaveBeenCalledTimes(1);

			const exportedCredential = getWrittenCredentialData(credential.id);

			// Verify nested structure is preserved but values are sanitized
			expect(exportedCredential.data).toMatchObject({
				connection: {
					host: '',
					username: '',
					password: '',
				},
				settings: {
					// Numbers should be preserved according to TODO comment in service
					timeout: 30,
				},
			});

			// Verify numbers and booleans are preserved
			expect((exportedCredential.data.connection as any).port).toBe(5432);
			expect((exportedCredential.data.settings as any).ssl).toBe(true);
		});
	});
});
