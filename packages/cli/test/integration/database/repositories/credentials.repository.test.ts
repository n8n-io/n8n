import { testDb } from '@n8n/backend-test-utils';
import { CredentialsRepository, SharedCredentialsRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { Scope } from '@n8n/permissions';

// Test helper functions
async function shareCredentialsToProject(
	credentials: Array<{ id: string }>,
	projectId: string,
	role: 'credential:user' | 'credential:owner',
) {
	const sharedCredentialsRepository = Container.get(SharedCredentialsRepository);
	await sharedCredentialsRepository.save(
		credentials.map((c) => ({
			credentialsId: c.id,
			projectId,
			role,
		})),
	);
}

function expectCredentialsMatch(
	oldCredentials: Array<{ id: string; [key: string]: any }>,
	newCredentials: Array<{ id: string; [key: string]: any }>,
) {
	// Sort by ID for consistent order-independent comparison
	const oldSorted = [...oldCredentials].sort((a, b) => a.id.localeCompare(b.id));
	const newSorted = [...newCredentials].sort((a, b) => a.id.localeCompare(b.id));

	// Jest's toEqual does deep recursive comparison of all fields
	expect(newSorted).toEqual(oldSorted);
}

describe('CredentialsRepository', () => {
	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['SharedCredentials', 'CredentialsEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('getManyAndCountWithSharingSubquery', () => {
		let credentialsRepository: CredentialsRepository;

		beforeEach(async () => {
			await testDb.truncate([
				'SharedCredentials',
				'ProjectRelation',
				'CredentialsEntity',
				'Project',
				'User',
			]);
			credentialsRepository = Container.get(CredentialsRepository);
		});

		it('should fetch credentials using subquery for standard user with roles', async () => {
			// ARRANGE
			const { createMember } = await import('../../shared/db/users');
			const { createTeamProject, linkUserToProject } = await import('@n8n/backend-test-utils');
			const { createCredentials } = await import('../../shared/db/credentials');

			const member = await createMember();
			const teamProject = await createTeamProject('test-project');
			await linkUserToProject(member, teamProject, 'project:editor');

			const credentials = await Promise.all([
				createCredentials({ name: 'Team Credential 1', type: 'googleApi', data: '' }),
				createCredentials({ name: 'Team Credential 2', type: 'slackApi', data: '' }),
			]);

			await shareCredentialsToProject(credentials, teamProject.id, 'credential:user');

			const sharingOptions = {
				scopes: ['credential:read'] as Scope[],
				projectRoles: ['project:editor'],
				credentialRoles: ['credential:user'],
			};

			// ACT
			const result = await credentialsRepository.getManyAndCountWithSharingSubquery(
				member,
				sharingOptions,
				{},
			);

			// ASSERT
			expect(result.credentials).toHaveLength(2);
			expect(result.count).toBe(2);
			expect(result.credentials.map((c) => c.name)).toEqual(
				expect.arrayContaining(['Team Credential 1', 'Team Credential 2']),
			);
		});

		it('should handle personal project filtering correctly', async () => {
			// ARRANGE
			const { createOwner } = await import('../../shared/db/users');
			const { getPersonalProject } = await import('@n8n/backend-test-utils');
			const { createCredentials } = await import('../../shared/db/credentials');

			const owner = await createOwner();
			const personalProject = await getPersonalProject(owner);

			const credentials = await Promise.all([
				createCredentials({ name: 'Personal Credential 1', type: 'githubApi', data: '' }),
				createCredentials({ name: 'Personal Credential 2', type: 'googleApi', data: '' }),
			]);

			await shareCredentialsToProject(credentials, personalProject.id, 'credential:owner');

			// ACT
			const result = await credentialsRepository.getManyAndCountWithSharingSubquery(
				owner,
				{ isPersonalProject: true, personalProjectOwnerId: owner.id },
				{ filter: { projectId: personalProject.id } },
			);

			// ASSERT
			expect(result.credentials).toHaveLength(2);
			expect(result.count).toBe(2);
		});

		it('should handle onlySharedWithMe filter correctly', async () => {
			// ARRANGE
			const { createMember } = await import('../../shared/db/users');
			const { getPersonalProject } = await import('@n8n/backend-test-utils');
			const { createCredentials } = await import('../../shared/db/credentials');

			const member = await createMember();
			const memberPersonalProject = await getPersonalProject(member);

			const sharedCredential = await createCredentials({
				name: 'Shared Credential',
				type: 'slackApi',
				data: '',
			});
			await shareCredentialsToProject(
				[sharedCredential],
				memberPersonalProject.id,
				'credential:user',
			);

			// ACT
			const result = await credentialsRepository.getManyAndCountWithSharingSubquery(
				member,
				{ onlySharedWithMe: true },
				{},
			);

			// ASSERT
			expect(result.credentials).toHaveLength(1);
			expect(result.count).toBe(1);
			expect(result.credentials[0].name).toBe('Shared Credential');
		});

		it('should apply name filter correctly with subquery approach', async () => {
			// ARRANGE
			const { createOwner } = await import('../../shared/db/users');
			const { getPersonalProject } = await import('@n8n/backend-test-utils');
			const { createCredentials } = await import('../../shared/db/credentials');

			const owner = await createOwner();
			const personalProject = await getPersonalProject(owner);

			const credentials = await Promise.all([
				createCredentials({ name: 'Test Credential Alpha', type: 'googleApi', data: '' }),
				createCredentials({ name: 'Test Credential Beta', type: 'slackApi', data: '' }),
				createCredentials({ name: 'Production Credential', type: 'githubApi', data: '' }),
			]);

			await shareCredentialsToProject(credentials, personalProject.id, 'credential:owner');

			// ACT
			const result = await credentialsRepository.getManyAndCountWithSharingSubquery(
				owner,
				{ isPersonalProject: true, personalProjectOwnerId: owner.id },
				{ filter: { projectId: personalProject.id, name: 'Test' } },
			);

			// ASSERT
			expect(result.credentials).toHaveLength(2);
			expect(result.count).toBe(2);
			expect(result.credentials.map((c) => c.name)).toEqual(
				expect.arrayContaining(['Test Credential Alpha', 'Test Credential Beta']),
			);
		});

		it('should apply type filter correctly with subquery approach', async () => {
			// ARRANGE
			const { createOwner } = await import('../../shared/db/users');
			const { getPersonalProject } = await import('@n8n/backend-test-utils');
			const { createCredentials } = await import('../../shared/db/credentials');

			const owner = await createOwner();
			const personalProject = await getPersonalProject(owner);

			const credentials = await Promise.all([
				createCredentials({ name: 'Google Credential 1', type: 'googleApi', data: '' }),
				createCredentials({ name: 'Google Credential 2', type: 'googleApi', data: '' }),
				createCredentials({ name: 'Slack Credential', type: 'slackApi', data: '' }),
			]);

			await shareCredentialsToProject(credentials, personalProject.id, 'credential:owner');

			// ACT
			const result = await credentialsRepository.getManyAndCountWithSharingSubquery(
				owner,
				{ isPersonalProject: true, personalProjectOwnerId: owner.id },
				{ filter: { projectId: personalProject.id, type: 'google', data: '' } },
			);

			// ASSERT
			expect(result.credentials).toHaveLength(2);
			expect(result.count).toBe(2);
			expect(result.credentials.map((c) => c.name)).toEqual(
				expect.arrayContaining(['Google Credential 1', 'Google Credential 2']),
			);
		});

		it('should handle pagination correctly with subquery approach', async () => {
			// ARRANGE
			const { createOwner } = await import('../../shared/db/users');
			const { getPersonalProject } = await import('@n8n/backend-test-utils');
			const { createCredentials } = await import('../../shared/db/credentials');

			const owner = await createOwner();
			const personalProject = await getPersonalProject(owner);

			const credentials = await Promise.all([
				createCredentials({ name: 'Credential 1', type: 'googleApi', data: '' }),
				createCredentials({ name: 'Credential 2', type: 'slackApi', data: '' }),
				createCredentials({ name: 'Credential 3', type: 'githubApi', data: '' }),
				createCredentials({ name: 'Credential 4', type: 'googleApi', data: '' }),
				createCredentials({ name: 'Credential 5', type: 'slackApi', data: '' }),
			]);

			await shareCredentialsToProject(credentials, personalProject.id, 'credential:owner');

			const sharingOptions = { isPersonalProject: true, personalProjectOwnerId: owner.id };

			// ACT
			const page1 = await credentialsRepository.getManyAndCountWithSharingSubquery(
				owner,
				sharingOptions,
				{
					filter: { projectId: personalProject.id },
					take: 2,
					skip: 0,
				},
			);

			const page2 = await credentialsRepository.getManyAndCountWithSharingSubquery(
				owner,
				sharingOptions,
				{
					filter: { projectId: personalProject.id },
					take: 2,
					skip: 2,
				},
			);

			// ASSERT
			expect(page1.credentials).toHaveLength(2);
			expect(page1.count).toBe(5);
			expect(page2.credentials).toHaveLength(2);
			expect(page2.count).toBe(5);

			// Ensure different credentials in each page
			const page1Ids = page1.credentials.map((c) => c.id);
			const page2Ids = page2.credentials.map((c) => c.id);
			expect(page1Ids).not.toEqual(expect.arrayContaining(page2Ids));
		});

		it('should correctly filter credentials by project when credentials belong to multiple projects', async () => {
			// ARRANGE
			const { createMember } = await import('../../shared/db/users');
			const { createTeamProject, linkUserToProject } = await import('@n8n/backend-test-utils');
			const { createCredentials } = await import('../../shared/db/credentials');

			const member = await createMember();
			const projectA = await createTeamProject('Project A');
			const projectB = await createTeamProject('Project B');
			await linkUserToProject(member, projectA, 'project:editor');
			await linkUserToProject(member, projectB, 'project:editor');

			// Create credentials and share to both projects
			const sharedCredential = await createCredentials({
				name: 'Shared Credential',
				type: 'googleApi',
				data: '',
			});
			const projectAOnlyCredential = await createCredentials({
				name: 'Project A Credential',
				type: 'slackApi',
				data: '',
			});
			const projectBOnlyCredential = await createCredentials({
				name: 'Project B Credential',
				type: 'githubApi',
				data: '',
			});

			await shareCredentialsToProject(
				[sharedCredential, projectAOnlyCredential],
				projectA.id,
				'credential:user',
			);
			await shareCredentialsToProject(
				[sharedCredential, projectBOnlyCredential],
				projectB.id,
				'credential:user',
			);

			const scopes: Scope[] = ['credential:read'];
			const projectRoles = ['project:editor'];
			const credentialRoles = ['credential:user'];

			// ACT - Filter by project A using new approach
			const newResultA = await credentialsRepository.getManyAndCountWithSharingSubquery(
				member,
				{ scopes, projectRoles, credentialRoles },
				{ filter: { projectId: projectA.id } },
			);

			// ACT - Filter by project B using new approach
			const newResultB = await credentialsRepository.getManyAndCountWithSharingSubquery(
				member,
				{ scopes, projectRoles, credentialRoles },
				{ filter: { projectId: projectB.id } },
			);

			// ASSERT
			expect(newResultA.credentials).toHaveLength(2);
			expect(newResultA.credentials.map((c) => c.name)).toEqual(
				expect.arrayContaining(['Shared Credential', 'Project A Credential']),
			);

			expect(newResultB.credentials).toHaveLength(2);
			expect(newResultB.credentials.map((c) => c.name)).toEqual(
				expect.arrayContaining(['Shared Credential', 'Project B Credential']),
			);
		});

		it('should correctly isolate credentials by user - each user sees only their credentials', async () => {
			// ARRANGE
			const { createMember } = await import('../../shared/db/users');
			const { createTeamProject, linkUserToProject } = await import('@n8n/backend-test-utils');
			const { createCredentials } = await import('../../shared/db/credentials');

			const userA = await createMember();
			const userB = await createMember();
			const projectA = await createTeamProject('User A Project');
			const projectB = await createTeamProject('User B Project');
			await linkUserToProject(userA, projectA, 'project:editor');
			await linkUserToProject(userB, projectB, 'project:editor');

			// Create credentials for each user
			const userACredentials = await Promise.all([
				createCredentials({ name: 'User A Credential 1', type: 'googleApi', data: '' }),
				createCredentials({ name: 'User A Credential 2', type: 'slackApi', data: '' }),
			]);
			const userBCredentials = await Promise.all([
				createCredentials({ name: 'User B Credential 1', type: 'githubApi', data: '' }),
				createCredentials({ name: 'User B Credential 2', type: 'googleApi', data: '' }),
			]);

			await shareCredentialsToProject(userACredentials, projectA.id, 'credential:user');
			await shareCredentialsToProject(userBCredentials, projectB.id, 'credential:user');

			const scopes: Scope[] = ['credential:read'];
			const projectRoles = ['project:editor'];
			const credentialRoles = ['credential:user'];

			// ACT - Query credentials for User A (new approach)
			const newResultA = await credentialsRepository.getManyAndCountWithSharingSubquery(
				userA,
				{ scopes, projectRoles, credentialRoles },
				{},
			);

			// ACT - Query credentials for User B (new approach)
			const newResultB = await credentialsRepository.getManyAndCountWithSharingSubquery(
				userB,
				{ scopes, projectRoles, credentialRoles },
				{},
			);

			// ASSERT
			expect(newResultA.credentials).toHaveLength(2);
			expect(newResultA.credentials.map((c) => c.name)).toEqual(
				expect.arrayContaining(['User A Credential 1', 'User A Credential 2']),
			);

			expect(newResultB.credentials).toHaveLength(2);
			expect(newResultB.credentials.map((c) => c.name)).toEqual(
				expect.arrayContaining(['User B Credential 1', 'User B Credential 2']),
			);

			// Verify no overlap
			const credentialAIds = newResultA.credentials.map((c) => c.id);
			const credentialBIds = newResultB.credentials.map((c) => c.id);
			expect(credentialAIds).not.toEqual(expect.arrayContaining(credentialBIds));
		});
	});

	describe('Comparison: Old vs New Approach', () => {
		let credentialsRepository: CredentialsRepository;

		beforeEach(async () => {
			await testDb.truncate([
				'SharedCredentials',
				'ProjectRelation',
				'CredentialsEntity',
				'Project',
				'User',
			]);
			credentialsRepository = Container.get(CredentialsRepository);
		});

		it('should return identical results for standard user with both approaches', async () => {
			// ARRANGE
			const { createMember } = await import('../../shared/db/users');
			const { createTeamProject, linkUserToProject } = await import('@n8n/backend-test-utils');
			const { createCredentials } = await import('../../shared/db/credentials');
			const { CredentialsFinderService } = await import('@/credentials/credentials-finder.service');
			const { RoleService } = await import('@/services/role.service');

			const member = await createMember();
			const teamProject = await createTeamProject('test-project');
			await linkUserToProject(member, teamProject, 'project:editor');

			const credentials = await Promise.all([
				createCredentials({ name: 'Credential A', type: 'googleApi', data: '' }),
				createCredentials({ name: 'Credential B', type: 'slackApi', data: '' }),
				createCredentials({ name: 'Credential C', type: 'githubApi', data: '' }),
			]);

			await shareCredentialsToProject(credentials, teamProject.id, 'credential:user');

			const roleService = Container.get(RoleService);
			const credentialsFinderService = Container.get(CredentialsFinderService);

			const scopes: Scope[] = ['credential:read'];
			const projectRoles = await roleService.rolesWithScope('project', scopes);
			const credentialRoles = await roleService.rolesWithScope('credential', scopes);

			// ACT - Old Approach (pre-fetch IDs then query)
			const credentialIds = await credentialsFinderService.getCredentialIdsByUserAndRole(
				[member.id],
				{ scopes },
			);
			const oldResult = await credentialsRepository.findManyAndCount({}, credentialIds);

			// ACT - New Approach (subquery)
			const newResult = await credentialsRepository.getManyAndCountWithSharingSubquery(
				member,
				{ scopes, projectRoles, credentialRoles },
				{},
			);

			// ASSERT
			expect(newResult.count).toBe(oldResult[1]);
			expect(newResult.credentials).toHaveLength(oldResult[0].length);
			expectCredentialsMatch(oldResult[0], newResult.credentials);
		});

		it('should return identical results for personal project with both approaches', async () => {
			// ARRANGE
			const { createOwner } = await import('../../shared/db/users');
			const { getPersonalProject } = await import('@n8n/backend-test-utils');
			const { createCredentials } = await import('../../shared/db/credentials');
			const { CredentialsFinderService } = await import('@/credentials/credentials-finder.service');

			const owner = await createOwner();
			const personalProject = await getPersonalProject(owner);

			const credentials = await Promise.all([
				createCredentials({ name: 'Personal A', type: 'googleApi', data: '' }),
				createCredentials({ name: 'Personal B', type: 'slackApi', data: '' }),
			]);

			await shareCredentialsToProject(credentials, personalProject.id, 'credential:owner');

			const credentialsFinderService = Container.get(CredentialsFinderService);
			const scopes: Scope[] = ['credential:read'];

			// ACT - Old Approach
			const credentialIds = await credentialsFinderService.getCredentialIdsByUserAndRole(
				[owner.id],
				{ scopes },
			);
			const oldResult = await credentialsRepository.findManyAndCount(
				{ filter: { projectId: personalProject.id } },
				credentialIds,
			);

			// ACT - New Approach
			const newResult = await credentialsRepository.getManyAndCountWithSharingSubquery(
				owner,
				{ isPersonalProject: true, personalProjectOwnerId: owner.id },
				{ filter: { projectId: personalProject.id } },
			);

			// ASSERT
			expect(newResult.count).toBe(oldResult[1]);
			expect(newResult.credentials).toHaveLength(oldResult[0].length);
			expectCredentialsMatch(oldResult[0], newResult.credentials);
		});

		it('should return identical results with filters and pagination', async () => {
			// ARRANGE
			const { createMember } = await import('../../shared/db/users');
			const { createTeamProject, linkUserToProject } = await import('@n8n/backend-test-utils');
			const { createCredentials } = await import('../../shared/db/credentials');
			const { CredentialsFinderService } = await import('@/credentials/credentials-finder.service');
			const { RoleService } = await import('@/services/role.service');

			const member = await createMember();
			const teamProject = await createTeamProject('test-project');
			await linkUserToProject(member, teamProject, 'project:editor');

			const credentials = await Promise.all([
				createCredentials({ name: 'Alpha Test', type: 'googleApi', data: '' }),
				createCredentials({ name: 'Beta Test', type: 'slackApi', data: '' }),
				createCredentials({ name: 'Gamma Production', type: 'githubApi', data: '' }),
				createCredentials({ name: 'Delta Test', type: 'googleApi', data: '' }),
			]);

			await shareCredentialsToProject(credentials, teamProject.id, 'credential:user');

			const roleService = Container.get(RoleService);
			const credentialsFinderService = Container.get(CredentialsFinderService);

			const scopes: Scope[] = ['credential:read'];
			const projectRoles = await roleService.rolesWithScope('project', scopes);
			const credentialRoles = await roleService.rolesWithScope('credential', scopes);

			const oldOptions = {
				filter: { projectId: teamProject.id, name: 'Test' },
				take: 2,
				skip: 0,
			};

			const newOptions = {
				filter: { name: 'Test' },
				take: 2,
				skip: 0,
			};

			// ACT - Old Approach
			const credentialIds = await credentialsFinderService.getCredentialIdsByUserAndRole(
				[member.id],
				{ scopes },
			);
			const oldResult = await credentialsRepository.findManyAndCount(oldOptions, credentialIds);

			// ACT - New Approach (projectId filter already handled in subquery, so don't pass it again)
			const newResult = await credentialsRepository.getManyAndCountWithSharingSubquery(
				member,
				{ scopes, projectRoles, credentialRoles },
				newOptions,
			);

			// ASSERT
			expect(newResult.count).toBe(oldResult[1]);
			expect(newResult.credentials).toHaveLength(oldResult[0].length);

			// Check same credentials in same order (sorting should be consistent)
			const oldIds = oldResult[0].map((c) => c.id);
			const newIds = newResult.credentials.map((c) => c.id);
			expect(newIds).toEqual(oldIds);
		});

		it('should correctly filter credentials by project - old vs new comparison', async () => {
			// ARRANGE
			const { createMember } = await import('../../shared/db/users');
			const { createTeamProject, linkUserToProject } = await import('@n8n/backend-test-utils');
			const { createCredentials } = await import('../../shared/db/credentials');
			const { CredentialsFinderService } = await import('@/credentials/credentials-finder.service');
			const { RoleService } = await import('@/services/role.service');

			const member = await createMember();

			// Create two different projects
			const projectA = await createTeamProject('project-a');
			const projectB = await createTeamProject('project-b');
			await linkUserToProject(member, projectA, 'project:editor');
			await linkUserToProject(member, projectB, 'project:editor');

			// Create credentials in project A
			const credentialsA = await Promise.all([
				createCredentials({ name: 'Project A Credential 1', type: 'googleApi', data: '' }),
				createCredentials({ name: 'Project A Credential 2', type: 'slackApi', data: '' }),
				createCredentials({ name: 'Project A Credential 3', type: 'githubApi', data: '' }),
			]);
			await shareCredentialsToProject(credentialsA, projectA.id, 'credential:user');

			// Create credentials in project B
			const credentialsB = await Promise.all([
				createCredentials({ name: 'Project B Credential 1', type: 'googleApi', data: '' }),
				createCredentials({ name: 'Project B Credential 2', type: 'slackApi', data: '' }),
			]);
			await shareCredentialsToProject(credentialsB, projectB.id, 'credential:user');

			const roleService = Container.get(RoleService);
			const credentialsFinderService = Container.get(CredentialsFinderService);

			const scopes: Scope[] = ['credential:read'];
			const projectRoles = await roleService.rolesWithScope('project', scopes);
			const credentialRoles = await roleService.rolesWithScope('credential', scopes);

			// ACT - Filter by project A using old approach
			const credentialIdsA = await credentialsFinderService.getCredentialIdsByUserAndRole(
				[member.id],
				{ scopes },
			);
			const oldResultA = await credentialsRepository.findManyAndCount(
				{ filter: { projectId: projectA.id } },
				credentialIdsA,
			);

			// ACT - Filter by project A using new approach
			const newResultA = await credentialsRepository.getManyAndCountWithSharingSubquery(
				member,
				{ scopes, projectRoles, credentialRoles },
				{ filter: { projectId: projectA.id } },
			);

			// ACT - Filter by project B using old approach
			const credentialIdsB = await credentialsFinderService.getCredentialIdsByUserAndRole(
				[member.id],
				{ scopes },
			);
			const oldResultB = await credentialsRepository.findManyAndCount(
				{ filter: { projectId: projectB.id } },
				credentialIdsB,
			);

			// ACT - Filter by project B using new approach
			const newResultB = await credentialsRepository.getManyAndCountWithSharingSubquery(
				member,
				{ scopes, projectRoles, credentialRoles },
				{ filter: { projectId: projectB.id } },
			);

			// ASSERT - Project A results
			expect(newResultA.count).toBe(3);
			expect(oldResultA[1]).toBe(3);
			expect(newResultA.credentials).toHaveLength(3);
			expectCredentialsMatch(oldResultA[0], newResultA.credentials);

			// ASSERT - Project B results
			expect(newResultB.count).toBe(2);
			expect(oldResultB[1]).toBe(2);
			expect(newResultB.credentials).toHaveLength(2);
			expectCredentialsMatch(oldResultB[0], newResultB.credentials);
		});

		it('should correctly isolate credentials by user - old vs new comparison', async () => {
			// ARRANGE
			const { createMember } = await import('../../shared/db/users');
			const { createTeamProject, linkUserToProject } = await import('@n8n/backend-test-utils');
			const { createCredentials } = await import('../../shared/db/credentials');
			const { CredentialsFinderService } = await import('@/credentials/credentials-finder.service');
			const { RoleService } = await import('@/services/role.service');

			// Create two separate users
			const userA = await createMember();
			const userB = await createMember();

			// Create separate projects for each user
			const projectA = await createTeamProject('user-a-project');
			const projectB = await createTeamProject('user-b-project');
			await linkUserToProject(userA, projectA, 'project:editor');
			await linkUserToProject(userB, projectB, 'project:editor');

			// Create credentials for User A
			const credentialsUserA = await Promise.all([
				createCredentials({ name: 'User A Credential 1', type: 'googleApi', data: '' }),
				createCredentials({ name: 'User A Credential 2', type: 'slackApi', data: '' }),
			]);
			await shareCredentialsToProject(credentialsUserA, projectA.id, 'credential:user');

			// Create credentials for User B
			const credentialsUserB = await Promise.all([
				createCredentials({ name: 'User B Credential 1', type: 'githubApi', data: '' }),
				createCredentials({ name: 'User B Credential 2', type: 'googleApi', data: '' }),
				createCredentials({ name: 'User B Credential 3', type: 'slackApi', data: '' }),
			]);
			await shareCredentialsToProject(credentialsUserB, projectB.id, 'credential:user');

			const roleService = Container.get(RoleService);
			const credentialsFinderService = Container.get(CredentialsFinderService);

			const scopes: Scope[] = ['credential:read'];
			const projectRoles = await roleService.rolesWithScope('project', scopes);
			const credentialRoles = await roleService.rolesWithScope('credential', scopes);

			// ACT - Query credentials for User A (old approach)
			const credentialIdsA = await credentialsFinderService.getCredentialIdsByUserAndRole(
				[userA.id],
				{ scopes },
			);
			const oldResultA = await credentialsRepository.findManyAndCount({}, credentialIdsA);

			// ACT - Query credentials for User A (new approach)
			const newResultA = await credentialsRepository.getManyAndCountWithSharingSubquery(
				userA,
				{ scopes, projectRoles, credentialRoles },
				{},
			);

			// ACT - Query credentials for User B (old approach)
			const credentialIdsB = await credentialsFinderService.getCredentialIdsByUserAndRole(
				[userB.id],
				{ scopes },
			);
			const oldResultB = await credentialsRepository.findManyAndCount({}, credentialIdsB);

			// ACT - Query credentials for User B (new approach)
			const newResultB = await credentialsRepository.getManyAndCountWithSharingSubquery(
				userB,
				{ scopes, projectRoles, credentialRoles },
				{},
			);

			// ASSERT - User A should only see their 2 credentials
			expect(newResultA.count).toBe(2);
			expect(oldResultA[1]).toBe(2);
			expect(newResultA.credentials).toHaveLength(2);
			expectCredentialsMatch(oldResultA[0], newResultA.credentials);

			// ASSERT - User B should only see their 3 credentials
			expect(newResultB.count).toBe(3);
			expect(oldResultB[1]).toBe(3);
			expect(newResultB.credentials).toHaveLength(3);
			expectCredentialsMatch(oldResultB[0], newResultB.credentials);

			// ASSERT - Verify no cross-contamination: User A credentials should not appear in User B results
			const userBCredentialIds = newResultB.credentials.map((c) => c.id);
			const userACredentialIds = credentialsUserA.map((c) => c.id);
			const contamination = userACredentialIds.filter((id) => userBCredentialIds.includes(id));
			expect(contamination).toHaveLength(0);

			// ASSERT - Verify no cross-contamination: User B credentials should not appear in User A results
			const userAResultIds = newResultA.credentials.map((c) => c.id);
			const userBCredentialIdsOriginal = credentialsUserB.map((c) => c.id);
			const reverseContamination = userBCredentialIdsOriginal.filter((id) =>
				userAResultIds.includes(id),
			);
			expect(reverseContamination).toHaveLength(0);
		});
	});
});
