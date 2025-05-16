import type { SourceControlledFile } from '@n8n/api-types';
import { CredentialsRepository, Project, User, WorkflowEntity, WorkflowRepository } from '@n8n/db';
import { FolderRepository } from '@n8n/db';
import { ProjectRepository } from '@n8n/db';
import { SharedCredentialsRepository } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { Cipher } from 'n8n-core';
import type { InstanceSettings } from 'n8n-core';
import * as utils from 'n8n-workflow';
import { nanoid } from 'nanoid';
import fsp from 'node:fs/promises';

import { SourceControlImportService } from '@/environments.ee/source-control/source-control-import.service.ee';
import type { ExportableCredential } from '@/environments.ee/source-control/types/exportable-credential';

import { mockInstance } from '../../shared/mocking';
import { saveCredential } from '../shared/db/credentials';
import { createTeamProject, getPersonalProject, linkUserToProject } from '../shared/db/projects';
import { createMember, getGlobalOwner } from '../shared/db/users';
import { createWorkflow } from '../shared/db/workflows';
import { randomCredentialPayload } from '../shared/random';
import * as testDb from '../shared/test-db';

describe('SourceControlImportService', () => {
	let credentialsRepository: CredentialsRepository;
	let projectRepository: ProjectRepository;
	let sharedCredentialsRepository: SharedCredentialsRepository;
	let userRepository: UserRepository;
	let folderRepository: FolderRepository;
	let service: SourceControlImportService;
	let workflowRepository: WorkflowRepository;

	const cipher = mockInstance(Cipher);

	beforeAll(async () => {
		await testDb.init();

		credentialsRepository = Container.get(CredentialsRepository);
		projectRepository = Container.get(ProjectRepository);
		sharedCredentialsRepository = Container.get(SharedCredentialsRepository);
		userRepository = Container.get(UserRepository);
		folderRepository = Container.get(FolderRepository);
		workflowRepository = Container.get(WorkflowRepository);
		service = new SourceControlImportService(
			mock(),
			mock(),
			mock(),
			mock(),
			credentialsRepository,
			projectRepository,
			mock(),
			mock(),
			sharedCredentialsRepository,
			userRepository,
			mock(),
			workflowRepository,
			mock(),
			mock(),
			mock(),
			mock(),
			folderRepository,
			mock<InstanceSettings>({ n8nFolder: '/some-path' }),
		);
	});

	afterEach(async () => {
		await testDb.truncate(['CredentialsEntity', 'SharedCredentials']);

		jest.restoreAllMocks();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('getLocalFoldersAndMappingsFromDb()', () => {
		// TODO: make test cases for folders from DB!
	});

	describe('getLocalVersionIdsFromDb()', () => {
		let instanceOwner: User;
		let projectAdmin: User;
		let projectMember: User;
		let teamProjectA: Project;
		let teamProjectB: Project;
		let teamAWorkflows: WorkflowEntity[];
		let teamBWorkflows: WorkflowEntity[];
		let instanceOwnerWorkflows: WorkflowEntity[];
		let projectAdminWorkflows: WorkflowEntity[];
		let projectMemberWorkflows: WorkflowEntity[];

		beforeAll(async () => {
			[instanceOwner, projectAdmin, projectMember, teamProjectA, teamProjectB] = await Promise.all([
				getGlobalOwner(),
				createMember(),
				createMember(),
				createTeamProject(),
				createTeamProject(),
			]);

			await linkUserToProject(projectAdmin, teamProjectA, 'project:admin');
			await linkUserToProject(projectMember, teamProjectA, 'project:editor');
			await linkUserToProject(projectAdmin, teamProjectB, 'project:editor');
			await linkUserToProject(projectMember, teamProjectB, 'project:editor');

			teamAWorkflows = await Promise.all([
				await createWorkflow({}, teamProjectA),
				await createWorkflow({}, teamProjectA),
				await createWorkflow({}, teamProjectA),
			]);

			teamBWorkflows = await Promise.all([
				await createWorkflow({}, teamProjectB),
				await createWorkflow({}, teamProjectB),
				await createWorkflow({}, teamProjectB),
			]);

			instanceOwnerWorkflows = await Promise.all([
				await createWorkflow({}, instanceOwner),
				await createWorkflow({}, instanceOwner),
				await createWorkflow({}, instanceOwner),
			]);

			projectAdminWorkflows = await Promise.all([
				await createWorkflow({}, projectAdmin),
				await createWorkflow({}, projectAdmin),
				await createWorkflow({}, projectAdmin),
			]);

			projectMemberWorkflows = await Promise.all([
				await createWorkflow({}, projectMember),
				await createWorkflow({}, projectMember),
				await createWorkflow({}, projectMember),
			]);
		});

		describe('if user is an instance owner', () => {
			it('should get all available workflows on the instance', async () => {
				let versions = await service.getLocalVersionIdsFromDb({
					user: instanceOwner,
				});

				expect(new Set(versions.map((v) => v.id))).toEqual(
					new Set([
						...teamAWorkflows.map((w) => w.id),
						...teamBWorkflows.map((w) => w.id),
						...instanceOwnerWorkflows.map((w) => w.id),
						...projectAdminWorkflows.map((w) => w.id),
						...projectMemberWorkflows.map((w) => w.id),
					]),
				);
			});
		});

		describe('if user is a project admin of a team project', () => {
			it('should only get all available workflows from the team project', async () => {
				let versions = await service.getLocalVersionIdsFromDb({
					user: projectAdmin,
				});

				expect(new Set(versions.map((v) => v.id))).toEqual(
					new Set([...teamAWorkflows.map((w) => w.id)]),
				);
			});
		});

		describe('if user is a project member of a team project', () => {
			it('should not get any workflows', async () => {
				let versions = await service.getLocalVersionIdsFromDb({
					user: projectMember,
				});

				expect(new Set(versions.map((v) => v.id))).toEqual(new Set([]));
			});
		});
	});

	describe('importCredentialsFromWorkFolder()', () => {
		describe('if user email specified by `ownedBy` exists at target instance', () => {
			it('should assign credential ownership to original user', async () => {
				const [importingUser, member] = await Promise.all([getGlobalOwner(), createMember()]);

				fsp.readFile = jest.fn().mockResolvedValue(Buffer.from('some-content'));

				const CREDENTIAL_ID = nanoid();

				const stub: ExportableCredential = {
					id: CREDENTIAL_ID,
					name: 'My Credential',
					type: 'someCredentialType',
					data: {},
					ownedBy: member.email, // user at source instance owns credential
				};

				jest.spyOn(utils, 'jsonParse').mockReturnValue(stub);

				cipher.encrypt.mockReturnValue('some-encrypted-data');

				await service.importCredentialsFromWorkFolder(
					[mock<SourceControlledFile>({ id: CREDENTIAL_ID })],
					importingUser.id,
				);

				const personalProject = await getPersonalProject(member);

				const sharing = await sharedCredentialsRepository.findOneBy({
					credentialsId: CREDENTIAL_ID,
					projectId: personalProject.id,
					role: 'credential:owner',
				});

				expect(sharing).toBeTruthy(); // same user at target instance owns credential
			});
		});

		describe('if user email specified by `ownedBy` is `null`', () => {
			it('should assign credential ownership to importing user', async () => {
				const importingUser = await getGlobalOwner();

				fsp.readFile = jest.fn().mockResolvedValue(Buffer.from('some-content'));

				const CREDENTIAL_ID = nanoid();

				const stub: ExportableCredential = {
					id: CREDENTIAL_ID,
					name: 'My Credential',
					type: 'someCredentialType',
					data: {},
					ownedBy: null,
				};

				jest.spyOn(utils, 'jsonParse').mockReturnValue(stub);

				cipher.encrypt.mockReturnValue('some-encrypted-data');

				await service.importCredentialsFromWorkFolder(
					[mock<SourceControlledFile>({ id: CREDENTIAL_ID })],
					importingUser.id,
				);

				const personalProject = await getPersonalProject(importingUser);

				const sharing = await sharedCredentialsRepository.findOneBy({
					credentialsId: CREDENTIAL_ID,
					projectId: personalProject.id,
					role: 'credential:owner',
				});

				expect(sharing).toBeTruthy(); // original user has no email, so importing user owns credential
			});
		});

		describe('if user email specified by `ownedBy` does not exist at target instance', () => {
			it('should assign credential ownership to importing user', async () => {
				const importingUser = await getGlobalOwner();

				fsp.readFile = jest.fn().mockResolvedValue(Buffer.from('some-content'));

				const CREDENTIAL_ID = nanoid();

				const stub: ExportableCredential = {
					id: CREDENTIAL_ID,
					name: 'My Credential',
					type: 'someCredentialType',
					data: {},
					ownedBy: 'user@test.com', // user at source instance owns credential
				};

				jest.spyOn(utils, 'jsonParse').mockReturnValue(stub);

				cipher.encrypt.mockReturnValue('some-encrypted-data');

				await service.importCredentialsFromWorkFolder(
					[mock<SourceControlledFile>({ id: CREDENTIAL_ID })],
					importingUser.id,
				);

				const personalProject = await getPersonalProject(importingUser);

				const sharing = await sharedCredentialsRepository.findOneBy({
					credentialsId: CREDENTIAL_ID,
					projectId: personalProject.id,
					role: 'credential:owner',
				});

				expect(sharing).toBeTruthy(); // original user missing, so importing user owns credential
			});
		});
	});

	describe('if owner specified by `ownedBy` does not exist at target instance', () => {
		it('should assign the credential ownership to the importing user if it was owned by a personal project in the source instance', async () => {
			const importingUser = await getGlobalOwner();

			fsp.readFile = jest.fn().mockResolvedValue(Buffer.from('some-content'));

			const CREDENTIAL_ID = nanoid();

			const stub: ExportableCredential = {
				id: CREDENTIAL_ID,
				name: 'My Credential',
				type: 'someCredentialType',
				data: {},
				ownedBy: {
					type: 'personal',
					personalEmail: 'test@example.com',
				}, // user at source instance owns credential
			};

			jest.spyOn(utils, 'jsonParse').mockReturnValue(stub);

			cipher.encrypt.mockReturnValue('some-encrypted-data');

			await service.importCredentialsFromWorkFolder(
				[mock<SourceControlledFile>({ id: CREDENTIAL_ID })],
				importingUser.id,
			);

			const personalProject = await getPersonalProject(importingUser);

			const sharing = await sharedCredentialsRepository.findOneBy({
				credentialsId: CREDENTIAL_ID,
				projectId: personalProject.id,
				role: 'credential:owner',
			});

			expect(sharing).toBeTruthy(); // original user missing, so importing user owns credential
		});

		it('should create a new team project if the credential was owned by a team project in the source instance', async () => {
			const importingUser = await getGlobalOwner();

			fsp.readFile = jest.fn().mockResolvedValue(Buffer.from('some-content'));

			const CREDENTIAL_ID = nanoid();

			const stub: ExportableCredential = {
				id: CREDENTIAL_ID,
				name: 'My Credential',
				type: 'someCredentialType',
				data: {},
				ownedBy: {
					type: 'team',
					teamId: '1234-asdf',
					teamName: 'Marketing',
				}, // user at source instance owns credential
			};

			jest.spyOn(utils, 'jsonParse').mockReturnValue(stub);

			cipher.encrypt.mockReturnValue('some-encrypted-data');

			{
				const project = await projectRepository.findOne({
					where: [
						{
							id: '1234-asdf',
						},
						{ name: 'Marketing' },
					],
				});

				expect(project?.id).not.toBe('1234-asdf');
				expect(project?.name).not.toBe('Marketing');
			}

			await service.importCredentialsFromWorkFolder(
				[mock<SourceControlledFile>({ id: CREDENTIAL_ID })],
				importingUser.id,
			);

			const sharing = await sharedCredentialsRepository.findOne({
				where: {
					credentialsId: CREDENTIAL_ID,
					role: 'credential:owner',
				},
				relations: { project: true },
			});

			expect(sharing?.project.id).toBe('1234-asdf');
			expect(sharing?.project.name).toBe('Marketing');
			expect(sharing?.project.type).toBe('team');

			expect(sharing).toBeTruthy(); // original user missing, so importing user owns credential
		});
	});

	describe('if owner specified by `ownedBy` does exist at target instance', () => {
		it('should use the existing team project if credential owning project is found', async () => {
			const importingUser = await getGlobalOwner();

			fsp.readFile = jest.fn().mockResolvedValue(Buffer.from('some-content'));

			const CREDENTIAL_ID = nanoid();

			const project = await createTeamProject('Sales');

			const stub: ExportableCredential = {
				id: CREDENTIAL_ID,
				name: 'My Credential',
				type: 'someCredentialType',
				data: {},
				ownedBy: {
					type: 'team',
					teamId: project.id,
					teamName: 'Sales',
				},
			};

			jest.spyOn(utils, 'jsonParse').mockReturnValue(stub);

			cipher.encrypt.mockReturnValue('some-encrypted-data');

			await service.importCredentialsFromWorkFolder(
				[mock<SourceControlledFile>({ id: CREDENTIAL_ID })],
				importingUser.id,
			);

			const sharing = await sharedCredentialsRepository.findOneBy({
				credentialsId: CREDENTIAL_ID,
				projectId: project.id,
				role: 'credential:owner',
			});

			expect(sharing).toBeTruthy();
		});

		it('should not change the owner if the credential is owned by somebody else on the target instance', async () => {
			cipher.encrypt.mockReturnValue('some-encrypted-data');

			const importingUser = await getGlobalOwner();

			fsp.readFile = jest.fn().mockResolvedValue(Buffer.from('some-content'));

			const targetProject = await createTeamProject('Marketing');
			const credential = await saveCredential(randomCredentialPayload(), {
				project: targetProject,
				role: 'credential:owner',
			});

			const sourceProjectId = nanoid();

			const stub: ExportableCredential = {
				id: credential.id,
				name: 'My Credential',
				type: 'someCredentialType',
				data: {},
				ownedBy: {
					type: 'team',
					teamId: sourceProjectId,
					teamName: 'Sales',
				},
			};

			jest.spyOn(utils, 'jsonParse').mockReturnValue(stub);

			await service.importCredentialsFromWorkFolder(
				[mock<SourceControlledFile>({ id: credential.id })],
				importingUser.id,
			);

			await expect(
				sharedCredentialsRepository.findBy({
					credentialsId: credential.id,
				}),
			).resolves.toMatchObject([
				{
					projectId: targetProject.id,
					role: 'credential:owner',
				},
			]);
			await expect(
				credentialsRepository.findBy({
					id: credential.id,
				}),
			).resolves.toMatchObject([
				{
					name: stub.name,
					type: stub.type,
					data: 'some-encrypted-data',
				},
			]);
		});
	});
});
