import {
	createWorkflow,
	shareWorkflowWithUsers,
	createTeamProject,
	linkUserToProject,
	randomCredentialPayload,
	randomCredentialPayloadWithOauthTokenData,
	testDb,
	mockInstance,
} from '@n8n/backend-test-utils';
import type { Project, User, ListQueryDb } from '@n8n/db';
import { GLOBAL_MEMBER_ROLE, ProjectRepository, SharedCredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ProjectRole } from '@n8n/permissions';
import { In } from '@n8n/typeorm';

import config from '@/config';
import { CredentialsService } from '@/credentials/credentials.service';
import { ProjectService } from '@/services/project.service.ee';
import { UserManagementMailer } from '@/user-management/email';

import {
	affixRoleToSaveCredential,
	getCredentialSharings,
	shareCredentialWithProjects,
	shareCredentialWithUsers,
} from '../shared/db/credentials';
import {
	createAdmin,
	createManyUsers,
	createOwner,
	createUser,
	createUserShell,
} from '../shared/db/users';
import type { SaveCredentialFunction, SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils';
import { RoleCacheService } from '@/services/role-cache.service';

const testServer = utils.setupTestServer({
	endpointGroups: ['credentials'],
	enabledFeatures: ['feat:sharing'],
	quotas: {
		'quota:maxTeamProjects': -1,
	},
});

let owner: User;
let admin: User;
let ownerPersonalProject: Project;
let member: User;
let memberPersonalProject: Project;
let anotherMember: User;
let anotherMemberPersonalProject: Project;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let authAnotherMemberAgent: SuperAgentTest;
let saveCredential: SaveCredentialFunction;
const mailer = mockInstance(UserManagementMailer);

let projectService: ProjectService;
let projectRepository: ProjectRepository;

beforeAll(async () => {
	await Container.get(RoleCacheService).refreshCache();
});

beforeEach(async () => {
	await testDb.truncate(['SharedCredentials', 'CredentialsEntity', 'Project', 'ProjectRelation']);
	projectRepository = Container.get(ProjectRepository);
	projectService = Container.get(ProjectService);

	owner = await createOwner();
	admin = await createAdmin();
	ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);

	member = await createUser({ role: { slug: 'global:member' } });
	memberPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(member.id);

	anotherMember = await createUser({ role: { slug: 'global:member' } });
	anotherMemberPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
		anotherMember.id,
	);

	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);
	authAnotherMemberAgent = testServer.authAgentFor(anotherMember);

	saveCredential = affixRoleToSaveCredential('credential:owner');
});

afterEach(() => {
	jest.clearAllMocks();
});

describe('POST /credentials', () => {
	test('project viewers cannot create credentials', async () => {
		const teamProject = await createTeamProject();
		await linkUserToProject(member, teamProject, 'project:viewer');

		const response = await testServer
			.authAgentFor(member)
			.post('/credentials')
			.send({ ...randomCredentialPayload(), projectId: teamProject.id });

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toBe(
			"You don't have the permissions to save the credential in this project.",
		);
	});
});

// ----------------------------------------
// GET /credentials - fetch all credentials
// ----------------------------------------
describe('GET /credentials', () => {
	test('should return all creds for owner', async () => {
		const [member1, member2, member3] = await createManyUsers(3, {
			role: { slug: 'global:member' },
		});
		const member1PersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member1.id,
		);
		const member2PersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member2.id,
		);
		const member3PersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member3.id,
		);

		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });
		await saveCredential(randomCredentialPayload(), { user: member1 });

		const sharedWith = [member1PersonalProject, member2PersonalProject, member3PersonalProject];
		await shareCredentialWithProjects(savedCredential, sharedWith);

		const response = await authOwnerAgent.get('/credentials');

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(2); // owner retrieved owner cred and member cred
		const ownerCredential: ListQueryDb.Credentials.WithOwnedByAndSharedWith =
			response.body.data.find(
				(e: ListQueryDb.Credentials.WithOwnedByAndSharedWith) =>
					e.homeProject?.id === ownerPersonalProject.id,
			);
		const memberCredential: ListQueryDb.Credentials.WithOwnedByAndSharedWith =
			response.body.data.find(
				(e: ListQueryDb.Credentials.WithOwnedByAndSharedWith) =>
					e.homeProject?.id === member1PersonalProject.id,
			);

		validateMainCredentialData(ownerCredential);
		expect(ownerCredential.data).toBeUndefined();

		validateMainCredentialData(memberCredential);
		expect(memberCredential.data).toBeUndefined();

		expect(ownerCredential.homeProject).toMatchObject({
			id: ownerPersonalProject.id,
			type: 'personal',
			name: owner.createPersonalProjectName(),
		});

		expect(Array.isArray(ownerCredential.sharedWithProjects)).toBe(true);
		expect(ownerCredential.sharedWithProjects).toHaveLength(3);

		// Fix order issue (MySQL might return items in any order)
		const ownerCredentialsSharedWithOrdered = [...ownerCredential.sharedWithProjects].sort(
			(a, b) => (a.id < b.id ? -1 : 1),
		);
		const orderedSharedWith = [...sharedWith].sort((a, b) => (a.id < b.id ? -1 : 1));

		ownerCredentialsSharedWithOrdered.forEach((sharee, idx) => {
			expect(sharee).toMatchObject({
				id: orderedSharedWith[idx].id,
				type: orderedSharedWith[idx].type,
			});
		});

		expect(memberCredential.homeProject).toMatchObject({
			id: member1PersonalProject.id,
			type: member1PersonalProject.type,
			name: member1.createPersonalProjectName(),
		});

		expect(Array.isArray(memberCredential.sharedWithProjects)).toBe(true);
		expect(memberCredential.sharedWithProjects).toHaveLength(0);
	});

	test('should return only relevant creds for member', async () => {
		const [member1, member2] = await createManyUsers(2, {
			role: { slug: 'global:member' },
		});
		const member1PersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member1.id,
		);
		const member2PersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member2.id,
		);

		await saveCredential(randomCredentialPayload(), { user: member2 });
		const savedMemberCredential = await saveCredential(randomCredentialPayload(), {
			user: member1,
		});

		await shareCredentialWithUsers(savedMemberCredential, [member2]);

		const response = await testServer.authAgentFor(member1).get('/credentials');

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(1); // member retrieved only member cred

		const [member1Credential]: [ListQueryDb.Credentials.WithOwnedByAndSharedWith] =
			response.body.data;

		validateMainCredentialData(member1Credential);
		expect(member1Credential.data).toBeUndefined();

		expect(member1Credential.homeProject).toMatchObject({
			id: member1PersonalProject.id,
			name: member1.createPersonalProjectName(),
			type: member1PersonalProject.type,
		});

		expect(member1Credential.sharedWithProjects).toHaveLength(1);
		expect(member1Credential.sharedWithProjects[0]).toMatchObject({
			id: member2PersonalProject.id,
			name: member2.createPersonalProjectName(),
			type: member2PersonalProject.type,
		});
	});

	test('should show credentials that the user has access to through a team project they are part of', async () => {
		//
		// ARRANGE
		//
		const project1 = await projectService.createTeamProject(member, { name: 'Team Project' });
		await projectService.addUser(project1.id, { userId: anotherMember.id, role: 'project:editor' });
		// anotherMember should see this one
		const credential1 = await saveCredential(randomCredentialPayload(), { project: project1 });

		const project2 = await projectService.createTeamProject(member, { name: 'Team Project' });
		// anotherMember should NOT see this one
		await saveCredential(randomCredentialPayload(), { project: project2 });

		//
		// ACT
		//
		const response = await testServer.authAgentFor(anotherMember).get('/credentials');

		//
		// ASSERT
		//
		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].id).toBe(credential1.id);
	});
});

describe('GET /credentials/for-workflow', () => {
	describe('for team projects', () => {
		test.each([
			['workflowId', 'member', () => member],
			['projectId', 'member', () => member],
			['workflowId', 'owner', () => owner],
			['projectId', 'owner', () => owner],
		])(
			'it will only return the credentials in that project if "%s" is used as the query parameter and the actor is a "%s"',
			async (_, queryParam, actorGetter) => {
				const actor = actorGetter();
				// Credential in personal project that should not be returned
				await saveCredential(randomCredentialPayload(), { user: actor });

				const teamProject = await createTeamProject();
				await linkUserToProject(actor, teamProject, 'project:viewer');
				const savedCredential = await saveCredential(randomCredentialPayload(), {
					project: teamProject,
				});
				const savedWorkflow = await createWorkflow({}, teamProject);

				{
					const response = await testServer
						.authAgentFor(actor)
						.get('/credentials/for-workflow')
						.query(
							queryParam === 'workflowId'
								? { workflowId: savedWorkflow.id }
								: { projectId: teamProject.id },
						);
					expect(response.statusCode).toBe(200);
					expect(response.body.data).toHaveLength(1);
					expect(response.body.data).toContainEqual(
						expect.objectContaining({
							id: savedCredential.id,
							scopes: expect.arrayContaining(['credential:read']),
						}),
					);
				}
			},
		);
	});

	describe('for personal projects', () => {
		test.each(['projectId', 'workflowId'])(
			'it returns only personal credentials for a members, if "%s" is used as the query parameter',
			async (queryParam) => {
				const savedWorkflow = await createWorkflow({}, member);
				await shareWorkflowWithUsers(savedWorkflow, [anotherMember]);

				// should be returned respectively
				const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });
				const anotherSavedCredential = await saveCredential(randomCredentialPayload(), {
					user: anotherMember,
				});

				// should not be returned
				await saveCredential(randomCredentialPayload(), { user: owner });
				const teamProject = await createTeamProject();
				await saveCredential(randomCredentialPayload(), { project: teamProject });

				// member should only see their credential
				{
					const response = await testServer
						.authAgentFor(member)
						.get('/credentials/for-workflow')
						.query(
							queryParam === 'workflowId'
								? { workflowId: savedWorkflow.id }
								: { projectId: memberPersonalProject.id },
						);

					expect(response.statusCode).toBe(200);
					expect(response.body.data).toHaveLength(1);
					expect(response.body.data).toContainEqual(
						expect.objectContaining({
							id: savedCredential.id,
							scopes: expect.arrayContaining(['credential:read']),
						}),
					);
				}

				// another member should only see their credential
				{
					const response = await testServer
						.authAgentFor(anotherMember)
						.get('/credentials/for-workflow')
						.query(
							queryParam === 'workflowId'
								? { workflowId: savedWorkflow.id }
								: { projectId: anotherMemberPersonalProject.id },
						);

					expect(response.statusCode).toBe(200);
					expect(response.body.data).toHaveLength(1);
					expect(response.body.data).toContainEqual(
						expect.objectContaining({
							id: anotherSavedCredential.id,
							scopes: expect.arrayContaining(['credential:read']),
						}),
					);
				}
			},
		);

		test('if the actor is a global owner and the workflow has not been shared with them, it returns all credentials of all projects the workflow is part of', async () => {
			const memberWorkflow = await createWorkflow({}, member);
			await shareWorkflowWithUsers(memberWorkflow, [owner]);

			// should be returned
			const memberCredential = await saveCredential(randomCredentialPayload(), { user: member });
			const ownerCredential = await saveCredential(randomCredentialPayload(), { user: owner });

			// should not be returned
			await saveCredential(randomCredentialPayload(), { user: anotherMember });
			const teamProject = await createTeamProject();
			await saveCredential(randomCredentialPayload(), { project: teamProject });

			const response = await testServer
				.authAgentFor(owner)
				.get('/credentials/for-workflow')
				.query({ workflowId: memberWorkflow.id });

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toHaveLength(2);
			expect(response.body.data).toContainEqual(
				expect.objectContaining({
					id: memberCredential.id,
					scopes: expect.arrayContaining(['credential:read']),
				}),
			);
			expect(response.body.data).toContainEqual(
				expect.objectContaining({
					id: ownerCredential.id,
					scopes: expect.arrayContaining(['credential:read']),
				}),
			);
		});

		test('if the actor is a global owner and the workflow has been shared with them, it returns all credentials of all projects the workflow is part of', async () => {
			const memberWorkflow = await createWorkflow({}, member);
			await shareWorkflowWithUsers(memberWorkflow, [anotherMember]);

			// should be returned
			const memberCredential = await saveCredential(randomCredentialPayload(), { user: member });
			const anotherMemberCredential = await saveCredential(randomCredentialPayload(), {
				user: anotherMember,
			});

			// should not be returned
			await saveCredential(randomCredentialPayload(), { user: owner });
			const teamProject = await createTeamProject();
			await saveCredential(randomCredentialPayload(), { project: teamProject });

			const response = await testServer
				.authAgentFor(owner)
				.get('/credentials/for-workflow')
				.query({ workflowId: memberWorkflow.id });

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toHaveLength(2);
			expect(response.body.data).toContainEqual(
				expect.objectContaining({
					id: memberCredential.id,
					scopes: expect.arrayContaining(['credential:read']),
				}),
			);
			expect(response.body.data).toContainEqual(
				expect.objectContaining({
					id: anotherMemberCredential.id,
					scopes: expect.arrayContaining(['credential:read']),
				}),
			);
		});

		test('if the projectId is passed by a global owner it will return all credentials in that project', async () => {
			// should be returned
			const memberCredential = await saveCredential(randomCredentialPayload(), { user: member });

			// should not be returned
			await saveCredential(randomCredentialPayload(), { user: anotherMember });
			await saveCredential(randomCredentialPayload(), { user: owner });
			const teamProject = await createTeamProject();
			await saveCredential(randomCredentialPayload(), { project: teamProject });

			const response = await testServer
				.authAgentFor(owner)
				.get('/credentials/for-workflow')
				.query({ projectId: memberPersonalProject.id });

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toHaveLength(1);
			expect(response.body.data).toContainEqual(
				expect.objectContaining({
					id: memberCredential.id,
					scopes: expect.arrayContaining(['credential:read']),
				}),
			);
		});

		test.each(['workflowId', 'projectId'] as const)(
			'if the global owner owns the workflow it will return all credentials of all personal projects, when using "%s" as the query parameter',
			async (queryParam) => {
				const ownerWorkflow = await createWorkflow({}, owner);

				// should be returned
				const memberCredential = await saveCredential(randomCredentialPayload(), { user: member });
				const anotherMemberCredential = await saveCredential(randomCredentialPayload(), {
					user: anotherMember,
				});
				const ownerCredential = await saveCredential(randomCredentialPayload(), { user: owner });

				// should not be returned
				const teamProject = await createTeamProject();
				await saveCredential(randomCredentialPayload(), { project: teamProject });

				const response = await testServer
					.authAgentFor(owner)
					.get('/credentials/for-workflow')
					.query(
						queryParam === 'workflowId'
							? { workflowId: ownerWorkflow.id }
							: { projectId: ownerPersonalProject.id },
					);

				expect(response.statusCode).toBe(200);
				expect(response.body.data).toHaveLength(3);
				expect(response.body.data).toContainEqual(
					expect.objectContaining({
						id: memberCredential.id,
						scopes: expect.arrayContaining(['credential:read']),
					}),
				);
				expect(response.body.data).toContainEqual(
					expect.objectContaining({
						id: anotherMemberCredential.id,
						scopes: expect.arrayContaining(['credential:read']),
					}),
				);
				expect(response.body.data).toContainEqual(
					expect.objectContaining({
						id: ownerCredential.id,
						scopes: expect.arrayContaining(['credential:read']),
					}),
				);
			},
		);
	});
});

// ----------------------------------------
// GET /credentials/:id - fetch a certain credential
// ----------------------------------------
describe('GET /credentials/:id', () => {
	test('project viewers can view credentials', async () => {
		const teamProject = await createTeamProject();
		await linkUserToProject(member, teamProject, 'project:viewer');

		const savedCredential = await saveCredential(randomCredentialPayload(), {
			project: teamProject,
		});

		const response = await testServer
			.authAgentFor(member)
			.get(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toMatchObject({
			id: savedCredential.id,
			homeProject: {
				id: teamProject.id,
			},
			sharedWithProjects: [],
			scopes: ['credential:read'],
		});
		expect(response.body.data.data).toBeUndefined();
	});

	test('should retrieve owned cred for owner', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const firstResponse = await authOwnerAgent.get(`/credentials/${savedCredential.id}`);

		expect(firstResponse.statusCode).toBe(200);

		const firstCredential: ListQueryDb.Credentials.WithOwnedByAndSharedWith =
			firstResponse.body.data;
		validateMainCredentialData(firstCredential);
		expect(firstCredential.data).toBeUndefined();

		expect(firstCredential.homeProject).toMatchObject({
			id: ownerPersonalProject.id,
			name: owner.createPersonalProjectName(),
			type: ownerPersonalProject.type,
			icon: null,
		});
		expect(firstCredential.sharedWithProjects).toHaveLength(0);

		const secondResponse = await authOwnerAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true });

		expect(secondResponse.statusCode).toBe(200);

		const { data: secondCredential } = secondResponse.body;
		validateMainCredentialData(secondCredential);
		expect(secondCredential.data).toBeDefined();
	});

	test('should redact the data when `includeData:true` is passed', async () => {
		const credentialService = Container.get(CredentialsService);
		const redactSpy = jest.spyOn(credentialService, 'redact');
		const credential = randomCredentialPayloadWithOauthTokenData();
		const savedCredential = await saveCredential(credential, {
			user: owner,
		});

		const response = await authOwnerAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true });

		validateMainCredentialData(response.body.data);
		expect(response.body.data.data).toBeDefined();
		expect(response.body.data.data.oauthTokenData).toBe(true);
		expect(redactSpy).toHaveBeenCalled();
	});

	test('should retrieve non-owned cred for owner', async () => {
		const [member1, member2] = await createManyUsers(2, {
			role: { slug: 'global:member' },
		});
		const member1PersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member1.id,
		);
		const member2PersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member2.id,
		);

		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member1 });
		await shareCredentialWithUsers(savedCredential, [member2]);

		const response1 = await authOwnerAgent.get(`/credentials/${savedCredential.id}`).expect(200);

		const credential: ListQueryDb.Credentials.WithOwnedByAndSharedWith = response1.body.data;

		validateMainCredentialData(credential);
		expect(credential.data).toBeUndefined();
		expect(credential).toMatchObject({
			homeProject: {
				id: member1PersonalProject.id,
				name: member1.createPersonalProjectName(),
				type: member1PersonalProject.type,
			},
			sharedWithProjects: [
				{
					id: member2PersonalProject.id,
					name: member2.createPersonalProjectName(),
					type: member2PersonalProject.type,
				},
			],
		});

		const response2 = await authOwnerAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true })
			.expect(200);

		const credential2: ListQueryDb.Credentials.WithOwnedByAndSharedWith = response2.body.data;

		validateMainCredentialData(credential);
		expect(credential2.data).toBeDefined(); // Instance owners should be capable of editing all credentials
		expect(credential2.sharedWithProjects).toHaveLength(1);
	});

	test('should retrieve owned cred for member', async () => {
		const [member1, member2, member3] = await createManyUsers(3, {
			role: { slug: 'global:member' },
		});
		const member1PersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member1.id,
		);
		const member2PersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member2.id,
		);
		const member3PersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member3.id,
		);
		const authMemberAgent = testServer.authAgentFor(member1);
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member1 });
		await shareCredentialWithUsers(savedCredential, [member2, member3]);

		const firstResponse = await authMemberAgent
			.get(`/credentials/${savedCredential.id}`)
			.expect(200);

		const firstCredential: ListQueryDb.Credentials.WithOwnedByAndSharedWith =
			firstResponse.body.data;
		validateMainCredentialData(firstCredential);
		expect(firstCredential.data).toBeUndefined();
		expect(firstCredential).toMatchObject({
			homeProject: {
				id: member1PersonalProject.id,
				name: member1.createPersonalProjectName(),
				icon: null,
				type: 'personal',
			},
			sharedWithProjects: expect.arrayContaining([
				{
					id: member2PersonalProject.id,
					name: member2.createPersonalProjectName(),
					icon: null,
					type: member2PersonalProject.type,
				},
				{
					id: member3PersonalProject.id,
					name: member3.createPersonalProjectName(),
					icon: null,
					type: member3PersonalProject.type,
				},
			]),
		});

		const secondResponse = await authMemberAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true })
			.expect(200);

		const secondCredential: ListQueryDb.Credentials.WithOwnedByAndSharedWith =
			secondResponse.body.data;
		validateMainCredentialData(secondCredential);
		expect(secondCredential.data).toBeDefined();
		expect(secondCredential.sharedWithProjects).toHaveLength(2);
	});

	test('should not retrieve non-owned cred for member', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const response = await testServer
			.authAgentFor(member)
			.get(`/credentials/${savedCredential.id}`);

		expect(response.statusCode).toBe(403);
		expect(response.body.data).toBeUndefined(); // owner's cred not returned
	});

	test('should return 404 if cred not found', async () => {
		const response = await authOwnerAgent.get('/credentials/789');
		expect(response.statusCode).toBe(404);

		const responseAbc = await authOwnerAgent.get('/credentials/abc');
		expect(responseAbc.statusCode).toBe(404);

		// because EE router has precedence, check if forwards this route
		const responseNew = await authOwnerAgent.get('/credentials/new');
		expect(responseNew.statusCode).toBe(200);
	});
});

describe('PATCH /credentials/:id', () => {
	test('project viewer cannot update credentials', async () => {
		//
		// ARRANGE
		//
		const teamProject = await createTeamProject('', member);
		await linkUserToProject(member, teamProject, 'project:viewer');

		const savedCredential = await saveCredential(randomCredentialPayload(), {
			project: teamProject,
		});

		//
		// ACT
		//
		const response = await testServer
			.authAgentFor(member)
			.patch(`/credentials/${savedCredential.id}`)
			.send({ ...randomCredentialPayload() });

		//
		// ASSERT
		//

		expect(response.statusCode).toBe(403);
		expect(response.body.message).toBe('User is missing a scope required to perform this action');
	});
});

// ----------------------------------------
// idempotent share/unshare
// ----------------------------------------
describe('PUT /credentials/:id/share', () => {
	test('should share the credential with the provided userIds and unshare it for missing ones', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const [member1, member2, member3, member4, member5] = await createManyUsers(5, {
			role: { slug: 'global:member' },
		});
		// TODO: write helper for getting multiple personal projects by user id
		const shareWithProjectIds = (
			await Promise.all([
				projectRepository.getPersonalProjectForUserOrFail(member1.id),
				projectRepository.getPersonalProjectForUserOrFail(member2.id),
				projectRepository.getPersonalProjectForUserOrFail(member3.id),
			])
		).map((project) => project.id);

		await shareCredentialWithUsers(savedCredential, [member4, member5]);

		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: shareWithProjectIds });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeUndefined();

		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});

		// check that sharings have been removed/added correctly
		expect(sharedCredentials.length).toBe(shareWithProjectIds.length + 1); // +1 for the owner

		sharedCredentials.forEach((sharedCredential) => {
			if (sharedCredential.projectId === ownerPersonalProject.id) {
				expect(sharedCredential.role).toBe('credential:owner');
				return;
			}
			expect(shareWithProjectIds).toContain(sharedCredential.projectId);
			expect(sharedCredential.role).toBe('credential:user');
		});

		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(1);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledWith(
			expect.objectContaining({
				newShareeIds: expect.arrayContaining([member1.id, member2.id, member3.id]),
				sharer: expect.objectContaining({ id: owner.id }),
				credentialsName: savedCredential.name,
			}),
		);
	});

	test('should share the credential with the provided userIds', async () => {
		const [member1, member2, member3] = await createManyUsers(3, {
			role: { slug: 'global:member' },
		});
		const projectIds = (
			await Promise.all([
				projectRepository.getPersonalProjectForUserOrFail(member1.id),
				projectRepository.getPersonalProjectForUserOrFail(member2.id),
				projectRepository.getPersonalProjectForUserOrFail(member3.id),
			])
		).map((project) => project.id);
		// const memberIds = [member1.id, member2.id, member3.id];
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: projectIds });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeUndefined();

		// check that sharings got correctly set in DB
		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id, projectId: In(projectIds) },
		});

		expect(sharedCredentials.length).toBe(projectIds.length);

		sharedCredentials.forEach((sharedCredential) => {
			expect(sharedCredential.role).toBe('credential:user');
		});

		// check that owner still exists
		const ownerSharedCredential = await Container.get(SharedCredentialsRepository).findOneOrFail({
			where: { credentialsId: savedCredential.id, projectId: ownerPersonalProject.id },
		});

		expect(ownerSharedCredential.role).toBe('credential:owner');
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(1);
	});

	test('should respond 403 for non-existing credentials', async () => {
		const response = await authOwnerAgent
			.put('/credentials/1234567/share')
			.send({ shareWithIds: [memberPersonalProject.id] });

		expect(response.statusCode).toBe(403);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(0);
	});

	test('should respond 403 for non-owned credentials for shared members', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

		await shareCredentialWithUsers(savedCredential, [anotherMember]);

		const response = await authAnotherMemberAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [ownerPersonalProject.id] });

		expect(response.statusCode).toBe(403);
		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});
		expect(sharedCredentials).toHaveLength(2);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(0);
	});

	test('should respond 403 for non-owned credentials for non-shared members sharing with self', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

		const response = await authAnotherMemberAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [anotherMemberPersonalProject.id] });

		expect(response.statusCode).toBe(403);

		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});
		expect(sharedCredentials).toHaveLength(1);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(0);
	});

	test('should respond 403 for non-owned credentials for non-shared members sharing', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });
		const tempUser = await createUser({ role: { slug: 'global:member' } });
		const tempUserPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			tempUser.id,
		);

		const response = await authAnotherMemberAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [tempUserPersonalProject.id] });

		expect(response.statusCode).toBe(403);

		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});
		expect(sharedCredentials).toHaveLength(1);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(0);
	});

	test('should respond 200 for non-owned credentials for owners', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

		await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [anotherMemberPersonalProject.id] })
			.expect(200);

		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});
		expect(sharedCredentials).toHaveLength(2);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(1);
	});

	test('should not ignore pending sharee', async () => {
		const memberShell = await createUserShell(GLOBAL_MEMBER_ROLE);
		const memberShellPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			memberShell.id,
		);
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [memberShellPersonalProject.id] })
			.expect(200);

		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});

		expect(sharedCredentials).toHaveLength(2);
		expect(
			sharedCredentials.find((c) => c.projectId === ownerPersonalProject.id),
		).not.toBeUndefined();
		expect(
			sharedCredentials.find((c) => c.projectId === memberShellPersonalProject.id),
		).not.toBeUndefined();
	});

	test('should ignore non-existing sharee', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: ['bce38a11-5e45-4d1c-a9ee-36e4a20ab0fc'] });

		expect(response.statusCode).toBe(200);

		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});

		expect(sharedCredentials).toHaveLength(1);
		expect(sharedCredentials[0].projectId).toBe(ownerPersonalProject.id);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(1);
	});

	test('should ignore sharing with owner project', async () => {
		// ARRANGE
		const project = await projectService.createTeamProject(owner, { name: 'Team Project' });
		const credential = await saveCredential(randomCredentialPayload(), { project });

		// ACT
		const response = await authOwnerAgent
			.put(`/credentials/${credential.id}/share`)
			.send({ shareWithIds: [project.id] });

		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: credential.id },
		});

		// ASSERT
		expect(response.statusCode).toBe(200);

		expect(sharedCredentials).toHaveLength(1);
		expect(sharedCredentials[0].projectId).toBe(project.id);
		expect(sharedCredentials[0].role).toBe('credential:owner');
	});

	test('should ignore sharing with project that already has it shared', async () => {
		// ARRANGE
		const project = await projectService.createTeamProject(owner, { name: 'Team Project' });
		const credential = await saveCredential(randomCredentialPayload(), { project });

		const project2 = await projectService.createTeamProject(owner, { name: 'Team Project 2' });
		await shareCredentialWithProjects(credential, [project2]);

		// ACT
		const response = await authOwnerAgent
			.put(`/credentials/${credential.id}/share`)
			.send({ shareWithIds: [project2.id] });

		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: credential.id },
		});

		// ASSERT
		expect(response.statusCode).toBe(200);

		expect(sharedCredentials).toHaveLength(2);
		expect(sharedCredentials).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ projectId: project.id, role: 'credential:owner' }),
				expect.objectContaining({ projectId: project2.id, role: 'credential:user' }),
			]),
		);
	});

	test('should respond 400 if invalid payload is provided', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const responses = await Promise.all([
			authOwnerAgent.put(`/credentials/${savedCredential.id}/share`).send(),
			authOwnerAgent.put(`/credentials/${savedCredential.id}/share`).send({ shareWithIds: [1] }),
		]);

		responses.forEach((response) => expect(response.statusCode).toBe(400));
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(0);
	});

	test('should unshare the credential', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const [member1, member2] = await createManyUsers(2, {
			role: { slug: 'global:member' },
		});

		await shareCredentialWithUsers(savedCredential, [member1, member2]);

		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [] });

		expect(response.statusCode).toBe(200);

		const sharedCredentials = await Container.get(SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});

		expect(sharedCredentials).toHaveLength(1);
		expect(sharedCredentials[0].projectId).toBe(ownerPersonalProject.id);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(1);
	});

	test('should not call internal hooks listener for email sent if emailing is disabled', async () => {
		config.set('userManagement.emails.mode', '');

		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const [member1, member2] = await createManyUsers(2, {
			role: { slug: 'global:member' },
		});

		await shareCredentialWithUsers(savedCredential, [member1, member2]);

		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [] });

		expect(response.statusCode).toBe(200);

		config.set('userManagement.emails.mode', 'smtp');
	});

	test('member should be able to share from personal project to team project that member has access to', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

		const testProject = await createTeamProject();
		await linkUserToProject(member, testProject, 'project:editor');

		const response = await authMemberAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [testProject.id] });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeUndefined();

		const shares = await getCredentialSharings(savedCredential);
		const testShare = shares.find((s) => s.projectId === testProject.id);
		expect(testShare).not.toBeUndefined();
		expect(testShare?.role).toBe('credential:user');
	});

	test('member should be able to share from team project to personal project', async () => {
		const testProject = await createTeamProject(undefined, member);

		const savedCredential = await saveCredential(randomCredentialPayload(), {
			project: testProject,
		});

		const response = await authMemberAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [anotherMemberPersonalProject.id] });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeUndefined();

		const shares = await getCredentialSharings(savedCredential);
		const testShare = shares.find((s) => s.projectId === anotherMemberPersonalProject.id);
		expect(testShare).not.toBeUndefined();
		expect(testShare?.role).toBe('credential:user');
	});

	test('member should be able to share from team project to team project that member has access to', async () => {
		const testProject = await createTeamProject(undefined, member);
		const testProject2 = await createTeamProject();
		await linkUserToProject(member, testProject2, 'project:editor');

		const savedCredential = await saveCredential(randomCredentialPayload(), {
			project: testProject,
		});

		const response = await authMemberAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [testProject2.id] });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeUndefined();

		const shares = await getCredentialSharings(savedCredential);
		const testShare = shares.find((s) => s.projectId === testProject2.id);
		expect(testShare).not.toBeUndefined();
		expect(testShare?.role).toBe('credential:user');
	});

	test('admins should be able to share from any team project to any team project ', async () => {
		const testProject = await createTeamProject();
		const testProject2 = await createTeamProject();

		const savedCredential = await saveCredential(randomCredentialPayload(), {
			project: testProject,
		});

		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [testProject2.id] });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeUndefined();

		const shares = await getCredentialSharings(savedCredential);
		const testShare = shares.find((s) => s.projectId === testProject2.id);
		expect(testShare).not.toBeUndefined();
		expect(testShare?.role).toBe('credential:user');
	});

	test("admins should be able to share from any team project to any user's personal project ", async () => {
		const testProject = await createTeamProject();

		const savedCredential = await saveCredential(randomCredentialPayload(), {
			project: testProject,
		});

		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [memberPersonalProject.id] });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeUndefined();

		const shares = await getCredentialSharings(savedCredential);
		const testShare = shares.find((s) => s.projectId === memberPersonalProject.id);
		expect(testShare).not.toBeUndefined();
		expect(testShare?.role).toBe('credential:user');
	});

	test('admins should be able to share from any personal project to any team project ', async () => {
		const testProject = await createTeamProject();

		const savedCredential = await saveCredential(randomCredentialPayload(), {
			user: member,
		});

		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [testProject.id] });

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeUndefined();

		const shares = await getCredentialSharings(savedCredential);
		const testShare = shares.find((s) => s.projectId === testProject.id);
		expect(testShare).not.toBeUndefined();
		expect(testShare?.role).toBe('credential:user');
	});
});

describe('PUT /:credentialId/transfer', () => {
	test('cannot transfer into the same project', async () => {
		const destinationProject = await createTeamProject('Destination Project', member);

		const credential = await saveCredential(randomCredentialPayload(), {
			project: destinationProject,
		});

		await testServer
			.authAgentFor(member)
			.put(`/credentials/${credential.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(400);
	});

	test('cannot transfer somebody elses credential', async () => {
		const destinationProject = await createTeamProject('Destination Project', member);

		const credential = await saveCredential(randomCredentialPayload(), {
			user: anotherMember,
		});

		await testServer
			.authAgentFor(member)
			.put(`/credentials/${credential.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(403);
	});

	test("cannot transfer if you're not a member of the destination project", async () => {
		const credential = await saveCredential(randomCredentialPayload(), {
			user: member,
		});

		const destinationProject = await createTeamProject('Team Project');

		await testServer
			.authAgentFor(member)
			.put(`/credentials/${credential.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(404);
	});

	test.each<ProjectRole>(['project:editor', 'project:viewer'])(
		'%ss cannot transfer credentials',
		async (projectRole) => {
			//
			// ARRANGE
			//
			const sourceProject = await createTeamProject('Source Project');
			await linkUserToProject(member, sourceProject, projectRole);

			const credential = await saveCredential(randomCredentialPayload(), {
				project: sourceProject,
			});

			const destinationProject = await createTeamProject('Destination Project', member);

			//
			// ACT & ASSERT
			//
			await testServer
				.authAgentFor(member)
				.put(`/credentials/${credential.id}/transfer`)
				.send({ destinationProjectId: destinationProject.id })
				.expect(403);
		},
	);

	test.each<
		[
			// user role
			'owners' | 'admins',
			// source project type
			'team' | 'personal',
			// destination project type
			'team' | 'personal',
			// actor
			() => User,
			// source project
			() => Promise<Project> | Project,
			// destination project
			() => Promise<Project> | Project,
		]
	>([
		// owner
		[
			'owners',
			'team',
			'team',
			() => owner,
			async () => await createTeamProject('Source Project'),
			async () => await createTeamProject('Destination Project'),
		],
		[
			'owners',
			'team',
			'personal',
			() => owner,
			async () => await createTeamProject('Source Project'),
			() => memberPersonalProject,
		],
		[
			'owners',
			'personal',
			'team',
			() => owner,
			() => memberPersonalProject,
			async () => await createTeamProject('Destination Project'),
		],

		// admin
		[
			'admins',
			'team',
			'team',
			() => admin,
			async () => await createTeamProject('Source Project'),
			async () => await createTeamProject('Destination Project'),
		],
		[
			'admins',
			'team',
			'personal',
			() => admin,
			async () => await createTeamProject('Source Project'),
			() => memberPersonalProject,
		],
		[
			'admins',
			'personal',
			'team',
			() => admin,
			() => memberPersonalProject,
			async () => await createTeamProject('Destination Project'),
		],
	])(
		'%s can always transfer from a %s project to a %s project',
		async (
			_roleName,
			_sourceProjectName,
			_destinationProjectName,
			getUser,
			getSourceProject,
			getDestinationProject,
		) => {
			// ARRANGE
			const user = getUser();
			const sourceProject = await getSourceProject();
			const destinationProject = await getDestinationProject();

			const credential = await saveCredential(randomCredentialPayload(), {
				project: sourceProject,
			});

			// ACT
			const response = await testServer
				.authAgentFor(user)
				.put(`/credentials/${credential.id}/transfer`)
				.send({ destinationProjectId: destinationProject.id })
				.expect(200);

			// ASSERT
			expect(response.body).toEqual({});

			{
				const allSharings = await getCredentialSharings(credential);
				expect(allSharings).toHaveLength(1);
				expect(allSharings[0]).toMatchObject({
					projectId: destinationProject.id,
					credentialsId: credential.id,
					role: 'credential:owner',
				});
			}
		},
	);
});

function validateMainCredentialData(credential: ListQueryDb.Credentials.WithOwnedByAndSharedWith) {
	expect(typeof credential.name).toBe('string');
	expect(typeof credential.type).toBe('string');
	expect(credential.homeProject).toBeDefined();
	expect(Array.isArray(credential.sharedWithProjects)).toBe(true);
}
