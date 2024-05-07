import Container from 'typedi';
import type { SuperAgentTest } from 'supertest';

import { UsersController } from '@/controllers/users.controller';
import type { User } from '@db/entities/User';
import { UserRepository } from '@db/repositories/user.repository';
import { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { ExecutionService } from '@/executions/execution.service';

import {
	getCredentialById,
	saveCredential,
	shareCredentialWithUsers,
} from './shared/db/credentials';
import { createAdmin, createMember, createOwner, getUserById } from './shared/db/users';
import { createWorkflow, getWorkflowById, shareWorkflowWithUsers } from './shared/db/workflows';
import { SUCCESS_RESPONSE_BODY } from './shared/constants';
import { validateUser } from './shared/utils/users';
import { randomCredentialPayload } from './shared/random';
import * as utils from './shared/utils/';
import * as testDb from './shared/testDb';
import { mockInstance } from '../shared/mocking';
import { RESPONSE_ERROR_MESSAGES } from '@/constants';
import { ProjectRepository } from '@/databases/repositories/project.repository';
import { createTeamProject, getPersonalProject, linkUserToProject } from './shared/db/projects';
import { ProjectRelationRepository } from '@/databases/repositories/projectRelation.repository';
import { CacheService } from '@/services/cache/cache.service';
import { v4 as uuid } from 'uuid';

mockInstance(ExecutionService);

const testServer = utils.setupTestServer({
	endpointGroups: ['users'],
	enabledFeatures: ['feat:advancedPermissions'],
});

let projectRepository: ProjectRepository;

beforeAll(() => {
	projectRepository = Container.get(ProjectRepository);
});

describe('GET /users', () => {
	let owner: User;
	let member: User;
	let ownerAgent: SuperAgentTest;

	beforeAll(async () => {
		await testDb.truncate(['User']);

		owner = await createOwner();
		member = await createMember();
		await createMember();

		ownerAgent = testServer.authAgentFor(owner);
	});

	test('should return all users', async () => {
		const response = await ownerAgent.get('/users').expect(200);

		expect(response.body.data).toHaveLength(3);

		response.body.data.forEach(validateUser);
	});

	describe('list query options', () => {
		describe('filter', () => {
			test('should filter users by field: email', async () => {
				const response = await ownerAgent
					.get('/users')
					.query(`filter={ "email": "${member.email}" }`)
					.expect(200);

				expect(response.body.data).toHaveLength(1);

				const [user] = response.body.data;

				expect(user.email).toBe(member.email);

				const _response = await ownerAgent
					.get('/users')
					.query('filter={ "email": "non@existing.com" }')
					.expect(200);

				expect(_response.body.data).toHaveLength(0);
			});

			test('should filter users by field: firstName', async () => {
				const response = await ownerAgent
					.get('/users')
					.query(`filter={ "firstName": "${member.firstName}" }`)
					.expect(200);

				expect(response.body.data).toHaveLength(1);

				const [user] = response.body.data;

				expect(user.email).toBe(member.email);

				const _response = await ownerAgent
					.get('/users')
					.query('filter={ "firstName": "Non-Existing" }')
					.expect(200);

				expect(_response.body.data).toHaveLength(0);
			});

			test('should filter users by field: lastName', async () => {
				const response = await ownerAgent
					.get('/users')
					.query(`filter={ "lastName": "${member.lastName}" }`)
					.expect(200);

				expect(response.body.data).toHaveLength(1);

				const [user] = response.body.data;

				expect(user.email).toBe(member.email);

				const _response = await ownerAgent
					.get('/users')
					.query('filter={ "lastName": "Non-Existing" }')
					.expect(200);

				expect(_response.body.data).toHaveLength(0);
			});

			test('should filter users by computed field: isOwner', async () => {
				const response = await ownerAgent
					.get('/users')
					.query('filter={ "isOwner": true }')
					.expect(200);

				expect(response.body.data).toHaveLength(1);

				const [user] = response.body.data;

				expect(user.isOwner).toBe(true);

				const _response = await ownerAgent
					.get('/users')
					.query('filter={ "isOwner": false }')
					.expect(200);

				expect(_response.body.data).toHaveLength(2);

				const [_user] = _response.body.data;

				expect(_user.isOwner).toBe(false);
			});
		});

		describe('select', () => {
			test('should select user field: id', async () => {
				const response = await ownerAgent.get('/users').query('select=["id"]').expect(200);

				expect(response.body).toEqual({
					data: [
						{ id: expect.any(String) },
						{ id: expect.any(String) },
						{ id: expect.any(String) },
					],
				});
			});

			test('should select user field: email', async () => {
				const response = await ownerAgent.get('/users').query('select=["email"]').expect(200);

				expect(response.body).toEqual({
					data: [
						{ email: expect.any(String) },
						{ email: expect.any(String) },
						{ email: expect.any(String) },
					],
				});
			});

			test('should select user field: firstName', async () => {
				const response = await ownerAgent.get('/users').query('select=["firstName"]').expect(200);

				expect(response.body).toEqual({
					data: [
						{ firstName: expect.any(String) },
						{ firstName: expect.any(String) },
						{ firstName: expect.any(String) },
					],
				});
			});

			test('should select user field: lastName', async () => {
				const response = await ownerAgent.get('/users').query('select=["lastName"]').expect(200);

				expect(response.body).toEqual({
					data: [
						{ lastName: expect.any(String) },
						{ lastName: expect.any(String) },
						{ lastName: expect.any(String) },
					],
				});
			});
		});

		describe('take', () => {
			test('should return n users or less, without skip', async () => {
				const response = await ownerAgent.get('/users').query('take=2').expect(200);

				expect(response.body.data).toHaveLength(2);

				response.body.data.forEach(validateUser);

				const _response = await ownerAgent.get('/users').query('take=1').expect(200);

				expect(_response.body.data).toHaveLength(1);

				_response.body.data.forEach(validateUser);
			});

			test('should return n users or less, with skip', async () => {
				const response = await ownerAgent.get('/users').query('take=1&skip=1').expect(200);

				expect(response.body.data).toHaveLength(1);

				response.body.data.forEach(validateUser);
			});
		});

		describe('auxiliary fields', () => {
			/**
			 * Some list query options require auxiliary fields:
			 *
			 * - `select` with `take` requires `id` (for pagination)
			 */
			test('should support options that require auxiliary fields', async () => {
				const response = await ownerAgent
					.get('/users')
					.query('filter={ "isOwner": true }&select=["firstName"]&take=1')
					.expect(200);

				expect(response.body).toEqual({ data: [{ firstName: expect.any(String) }] });
			});
		});
	});
});

describe('DELETE /users/:id', () => {
	let owner: User;
	let ownerAgent: SuperAgentTest;

	beforeAll(async () => {
		await testDb.truncate(['User']);

		owner = await createOwner();
		ownerAgent = testServer.authAgentFor(owner);
	});

	test('should delete user and their resources', async () => {
		//
		// ARRANGE
		//
		// @TODO: Include active workflow and check whether webhook has been removed

		const member = await createMember();
		const memberPersonalProject = await getPersonalProject(member);

		// stays untouched
		const teamProject = await createTeamProject();
		// will be deleted
		await linkUserToProject(member, teamProject, 'project:admin');

		const [savedWorkflow, savedCredential, teamWorkflow, teamCredential] = await Promise.all([
			// personal resource -> deleted
			createWorkflow({}, member),
			saveCredential(randomCredentialPayload(), {
				user: member,
				role: 'credential:owner',
			}),
			// resources in a team project -> untouched
			createWorkflow({}, teamProject),
			saveCredential(randomCredentialPayload(), {
				project: teamProject,
				role: 'credential:owner',
			}),
		]);

		//
		// ACT
		//
		await ownerAgent.delete(`/users/${member.id}`).expect(200, SUCCESS_RESPONSE_BODY);

		//
		// ASSERT
		//
		const userRepository = Container.get(UserRepository);
		const projectRepository = Container.get(ProjectRepository);
		const projectRelationRepository = Container.get(ProjectRelationRepository);
		const sharedWorkflowRepository = Container.get(SharedWorkflowRepository);
		const sharedCredentialsRepository = Container.get(SharedCredentialsRepository);

		await Promise.all([
			// user, their personal project and their relationship to the team project is gone
			expect(userRepository.findOneBy({ id: member.id })).resolves.toBeNull(),
			expect(projectRepository.findOneBy({ id: memberPersonalProject.id })).resolves.toBeNull(),
			expect(
				projectRelationRepository.findOneBy({ userId: member.id, projectId: teamProject.id }),
			).resolves.toBeNull(),

			// their personal workflows and and credentials are gone
			expect(
				sharedWorkflowRepository.findOneBy({
					workflowId: savedWorkflow.id,
					projectId: memberPersonalProject.id,
				}),
			).resolves.toBeNull(),
			expect(
				sharedCredentialsRepository.findOneBy({
					credentialsId: savedCredential.id,
					projectId: memberPersonalProject.id,
				}),
			).resolves.toBeNull(),

			// team workflows and credentials are untouched
			expect(
				sharedWorkflowRepository.findOneBy({
					workflowId: teamWorkflow.id,
					projectId: teamProject.id,
					role: 'workflow:owner',
				}),
			).resolves.not.toBeNull(),
			expect(
				sharedCredentialsRepository.findOneBy({
					credentialsId: teamCredential.id,
					projectId: teamProject.id,
					role: 'credential:owner',
				}),
			).resolves.not.toBeNull(),
		]);

		const user = await Container.get(UserRepository).findOneBy({ id: member.id });
		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			where: { projectId: memberPersonalProject.id, role: 'workflow:owner' },
		});
		const sharedCredential = await Container.get(SharedCredentialsRepository).findOne({
			where: { projectId: memberPersonalProject.id, role: 'credential:owner' },
		});
		const workflow = await getWorkflowById(savedWorkflow.id);
		const credential = await getCredentialById(savedCredential.id);

		expect(user).toBeNull();
		expect(sharedWorkflow).toBeNull();
		expect(sharedCredential).toBeNull();
		expect(workflow).toBeNull();
		expect(credential).toBeNull();
	});

	test('should delete user and team relations and transfer their personal resources', async () => {
		//
		// ARRANGE
		//
		const [member, transferee, otherMember] = await Promise.all([
			createMember(),
			createMember(),
			createMember(),
		]);

		// stays untouched
		const teamProject = await createTeamProject();
		await Promise.all([
			// will be deleted
			linkUserToProject(member, teamProject, 'project:admin'),

			// stays untouched
			linkUserToProject(transferee, teamProject, 'project:editor'),
		]);

		const [
			ownedWorkflow,
			ownedCredential,
			teamWorkflow,
			teamCredential,
			sharedByOtherMemberWorkflow,
			sharedByOtherMemberCredential,
			sharedByTransfereeWorkflow,
			sharedByTransfereeCredential,
		] = await Promise.all([
			// personal resource
			// -> transferred to transferee's personal project
			createWorkflow({}, member),
			saveCredential(randomCredentialPayload(), {
				user: member,
				role: 'credential:owner',
			}),

			// resources in a team project
			// -> untouched
			createWorkflow({}, teamProject),
			saveCredential(randomCredentialPayload(), {
				project: teamProject,
				role: 'credential:owner',
			}),

			// credential and workflow that are shared with the user to delete
			// -> transferred to transferee's personal project
			createWorkflow({}, otherMember),
			saveCredential(randomCredentialPayload(), {
				user: otherMember,
				role: 'credential:owner',
			}),

			// credential and workflow that are shared with the user to delete but owned by the transferee
			// -> not transferred but deleted
			createWorkflow({}, transferee),
			saveCredential(randomCredentialPayload(), {
				user: transferee,
				role: 'credential:owner',
			}),
		]);

		await Promise.all([
			shareWorkflowWithUsers(sharedByOtherMemberWorkflow, [member]),
			shareCredentialWithUsers(sharedByOtherMemberCredential, [member]),

			shareWorkflowWithUsers(sharedByTransfereeWorkflow, [member]),
			shareCredentialWithUsers(sharedByTransfereeCredential, [member]),
		]);

		const [memberPersonalProject, transfereePersonalProject] = await Promise.all([
			getPersonalProject(member),
			getPersonalProject(transferee),
		]);

		const deleteSpy = jest.spyOn(Container.get(CacheService), 'deleteMany');

		//
		// ACT
		//
		await ownerAgent
			.delete(`/users/${member.id}`)
			.query({ transferId: transfereePersonalProject.id })
			.expect(200);

		//
		// ASSERT
		//

		expect(deleteSpy).toBeCalledWith(
			expect.arrayContaining([
				`credential-can-use-secrets:${sharedByTransfereeCredential.id}`,
				`credential-can-use-secrets:${ownedCredential.id}`,
			]),
		);
		deleteSpy.mockClear();

		const userRepository = Container.get(UserRepository);
		const projectRepository = Container.get(ProjectRepository);
		const projectRelationRepository = Container.get(ProjectRelationRepository);
		const sharedWorkflowRepository = Container.get(SharedWorkflowRepository);
		const sharedCredentialsRepository = Container.get(SharedCredentialsRepository);

		await Promise.all([
			// user, their personal project and their relationship to the team project is gone
			expect(userRepository.findOneBy({ id: member.id })).resolves.toBeNull(),
			expect(projectRepository.findOneBy({ id: memberPersonalProject.id })).resolves.toBeNull(),
			expect(
				projectRelationRepository.findOneBy({
					projectId: teamProject.id,
					userId: member.id,
				}),
			).resolves.toBeNull(),

			// their owned workflow and credential are transferred to the transferee
			expect(
				sharedWorkflowRepository.findOneBy({
					workflowId: ownedWorkflow.id,
					projectId: transfereePersonalProject.id,
					role: 'workflow:owner',
				}),
			).resolves.not.toBeNull,
			expect(
				sharedCredentialsRepository.findOneBy({
					credentialsId: ownedCredential.id,
					projectId: transfereePersonalProject.id,
					role: 'credential:owner',
				}),
			).resolves.not.toBeNull(),

			// the credential and workflow shared with them by another member is now shared with the transferee
			expect(
				sharedWorkflowRepository.findOneBy({
					workflowId: sharedByOtherMemberWorkflow.id,
					projectId: transfereePersonalProject.id,
					role: 'workflow:editor',
				}),
			).resolves.not.toBeNull(),
			expect(
				sharedCredentialsRepository.findOneBy({
					credentialsId: sharedByOtherMemberCredential.id,
					projectId: transfereePersonalProject.id,
					role: 'credential:user',
				}),
			),

			// the transferee is still owner of the workflow and credential they shared with the user to delete
			expect(
				sharedWorkflowRepository.findOneBy({
					workflowId: sharedByTransfereeWorkflow.id,
					projectId: transfereePersonalProject.id,
					role: 'workflow:owner',
				}),
			).resolves.not.toBeNull(),
			expect(
				sharedCredentialsRepository.findOneBy({
					credentialsId: sharedByTransfereeCredential.id,
					projectId: transfereePersonalProject.id,
					role: 'credential:owner',
				}),
			).resolves.not.toBeNull(),

			// the transferee's relationship to the team project is unchanged
			expect(
				projectRepository.findOneBy({
					id: teamProject.id,
					projectRelations: {
						userId: transferee.id,
						role: 'project:editor',
					},
				}),
			).resolves.not.toBeNull(),

			// the sharing of the team workflow is unchanged
			expect(
				sharedWorkflowRepository.findOneBy({
					workflowId: teamWorkflow.id,
					projectId: teamProject.id,
					role: 'workflow:owner',
				}),
			).resolves.not.toBeNull(),

			// the sharing of the team credential is unchanged
			expect(
				sharedCredentialsRepository.findOneBy({
					credentialsId: teamCredential.id,
					projectId: teamProject.id,
					role: 'credential:owner',
				}),
			).resolves.not.toBeNull(),
		]);
	});

	test('should fail to delete self', async () => {
		await ownerAgent.delete(`/users/${owner.id}`).expect(400);

		const user = await getUserById(owner.id);

		expect(user).toBeDefined();
	});

	test('should fail to delete a user that does not exist', async () => {
		await ownerAgent.delete(`/users/${uuid()}`).query({ transferId: '' }).expect(404);
	});

	test('should fail to transfer to a project that does not exist', async () => {
		const member = await createMember();

		await ownerAgent.delete(`/users/${member.id}`).query({ transferId: 'foobar' }).expect(404);

		const user = await Container.get(UserRepository).findOneBy({ id: member.id });

		expect(user).toBeDefined();
	});

	test('should fail to delete if user to delete is transferee', async () => {
		const member = await createMember();
		const personalProject = await getPersonalProject(member);

		await ownerAgent
			.delete(`/users/${member.id}`)
			.query({ transferId: personalProject.id })
			.expect(400);

		const user = await Container.get(UserRepository).findOneBy({ id: member.id });

		expect(user).toBeDefined();
	});
});

describe('PATCH /users/:id/role', () => {
	let owner: User;
	let admin: User;
	let otherAdmin: User;
	let member: User;
	let otherMember: User;

	let ownerAgent: SuperAgentTest;
	let adminAgent: SuperAgentTest;
	let memberAgent: SuperAgentTest;
	let authlessAgent: SuperAgentTest;

	const { NO_ADMIN_ON_OWNER, NO_USER, NO_OWNER_ON_OWNER } =
		UsersController.ERROR_MESSAGES.CHANGE_ROLE;

	beforeAll(async () => {
		await testDb.truncate(['User']);

		[owner, admin, otherAdmin, member, otherMember] = await Promise.all([
			await createOwner(),
			await createAdmin(),
			await createAdmin(),
			await createMember(),
			await createMember(),
		]);

		ownerAgent = testServer.authAgentFor(owner);
		adminAgent = testServer.authAgentFor(admin);
		memberAgent = testServer.authAgentFor(member);
		authlessAgent = testServer.authlessAgent;
	});

	describe('unauthenticated user', () => {
		test('should receive 401', async () => {
			const response = await authlessAgent.patch(`/users/${member.id}/role`).send({
				newRoleName: 'global:admin',
			});

			expect(response.statusCode).toBe(401);
		});
	});

	describe('Invalid payload should return 400 when newRoleName', () => {
		test.each([
			['is missing', {}],
			['is `owner`', { newRoleName: 'global:owner' }],
			['is an array', { newRoleName: ['global:owner'] }],
		])('%s', async (_, payload) => {
			const response = await adminAgent.patch(`/users/${member.id}/role`).send(payload);
			expect(response.statusCode).toBe(400);
			expect(response.body.message).toBe(
				'newRoleName must be one of the following values: global:admin, global:member',
			);
		});
	});

	describe('member', () => {
		test('should fail to demote owner to member', async () => {
			await memberAgent
				.patch(`/users/${owner.id}/role`)
				.send({
					newRoleName: 'global:member',
				})
				.expect(403, { status: 'error', message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE });
		});

		test('should fail to demote owner to admin', async () => {
			await memberAgent
				.patch(`/users/${owner.id}/role`)
				.send({
					newRoleName: 'global:admin',
				})
				.expect(403, { status: 'error', message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE });
		});

		test('should fail to demote admin to member', async () => {
			await memberAgent
				.patch(`/users/${admin.id}/role`)
				.send({
					newRoleName: 'global:member',
				})
				.expect(403, { status: 'error', message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE });
		});

		test('should fail to promote other member to owner', async () => {
			await memberAgent
				.patch(`/users/${otherMember.id}/role`)
				.send({
					newRoleName: 'global:owner',
				})
				.expect(403, { status: 'error', message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE });
		});

		test('should fail to promote other member to admin', async () => {
			await memberAgent
				.patch(`/users/${otherMember.id}/role`)
				.send({
					newRoleName: 'global:admin',
				})
				.expect(403, { status: 'error', message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE });
		});

		test('should fail to promote self to admin', async () => {
			await memberAgent
				.patch(`/users/${member.id}/role`)
				.send({
					newRoleName: 'global:admin',
				})
				.expect(403, { status: 'error', message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE });
		});

		test('should fail to promote self to owner', async () => {
			await memberAgent
				.patch(`/users/${member.id}/role`)
				.send({
					newRoleName: 'global:owner',
				})
				.expect(403, { status: 'error', message: RESPONSE_ERROR_MESSAGES.MISSING_SCOPE });
		});
	});

	describe('admin', () => {
		test('should receive 404 on unknown target user', async () => {
			const response = await adminAgent
				.patch('/users/c2317ff3-7a9f-4fd4-ad2b-7331f6359260/role')
				.send({
					newRoleName: 'global:member',
				});

			expect(response.statusCode).toBe(404);
			expect(response.body.message).toBe(NO_USER);
		});

		test('should fail to demote owner to admin', async () => {
			const response = await adminAgent.patch(`/users/${owner.id}/role`).send({
				newRoleName: 'global:admin',
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(NO_ADMIN_ON_OWNER);
		});

		test('should fail to demote owner to member', async () => {
			const response = await adminAgent.patch(`/users/${owner.id}/role`).send({
				newRoleName: 'global:member',
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(NO_ADMIN_ON_OWNER);
		});

		test('should fail to promote member to admin if not licensed', async () => {
			testServer.license.disable('feat:advancedPermissions');

			const response = await adminAgent.patch(`/users/${member.id}/role`).send({
				newRoleName: 'global:admin',
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe('Plan lacks license for this feature');
		});

		test('should be able to demote admin to member', async () => {
			const response = await adminAgent.patch(`/users/${otherAdmin.id}/role`).send({
				newRoleName: 'global:member',
			});

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toStrictEqual({ success: true });

			const user = await getUserById(otherAdmin.id);

			expect(user.role).toBe('global:member');

			// restore other admin

			otherAdmin = await createAdmin();
			adminAgent = testServer.authAgentFor(otherAdmin);
		});

		test('should be able to demote self to member', async () => {
			const response = await adminAgent.patch(`/users/${admin.id}/role`).send({
				newRoleName: 'global:member',
			});

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toStrictEqual({ success: true });

			const user = await getUserById(admin.id);

			expect(user.role).toBe('global:member');

			// restore admin

			admin = await createAdmin();
			adminAgent = testServer.authAgentFor(admin);
		});

		test('should be able to promote member to admin if licensed', async () => {
			const response = await adminAgent.patch(`/users/${member.id}/role`).send({
				newRoleName: 'global:admin',
			});

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toStrictEqual({ success: true });

			const user = await getUserById(admin.id);

			expect(user.role).toBe('global:admin');

			// restore member

			member = await createMember();
			memberAgent = testServer.authAgentFor(member);
		});
	});

	describe('owner', () => {
		test('should fail to demote self to admin', async () => {
			const response = await ownerAgent.patch(`/users/${owner.id}/role`).send({
				newRoleName: 'global:admin',
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(NO_OWNER_ON_OWNER);
		});

		test('should fail to demote self to member', async () => {
			const response = await ownerAgent.patch(`/users/${owner.id}/role`).send({
				newRoleName: 'global:member',
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe(NO_OWNER_ON_OWNER);
		});

		test('should fail to promote member to admin if not licensed', async () => {
			testServer.license.disable('feat:advancedPermissions');

			const response = await ownerAgent.patch(`/users/${member.id}/role`).send({
				newRoleName: 'global:admin',
			});

			expect(response.statusCode).toBe(403);
			expect(response.body.message).toBe('Plan lacks license for this feature');
		});

		test('should be able to promote member to admin if licensed', async () => {
			const response = await ownerAgent.patch(`/users/${member.id}/role`).send({
				newRoleName: 'global:admin',
			});

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toStrictEqual({ success: true });

			const user = await getUserById(admin.id);

			expect(user.role).toBe('global:admin');

			// restore member

			member = await createMember();
			memberAgent = testServer.authAgentFor(member);
		});

		test('should be able to demote admin to member', async () => {
			const response = await ownerAgent.patch(`/users/${admin.id}/role`).send({
				newRoleName: 'global:member',
			});

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toStrictEqual({ success: true });

			const user = await getUserById(admin.id);

			expect(user.role).toBe('global:member');

			// restore admin

			admin = await createAdmin();
			adminAgent = testServer.authAgentFor(admin);
		});
	});

	test("should clear credential external secrets usability cache when changing a user's role", async () => {
		const user = await createAdmin();

		const [project1, project2] = await Promise.all([
			createTeamProject(undefined, user),
			createTeamProject(),
		]);

		const [credential1, credential2, credential3] = await Promise.all([
			saveCredential(randomCredentialPayload(), {
				user,
				role: 'credential:owner',
			}),
			saveCredential(randomCredentialPayload(), {
				project: project1,
				role: 'credential:owner',
			}),
			saveCredential(randomCredentialPayload(), {
				project: project2,
				role: 'credential:owner',
			}),
			linkUserToProject(user, project2, 'project:editor'),
		]);

		const deleteSpy = jest.spyOn(Container.get(CacheService), 'deleteMany');
		const response = await ownerAgent.patch(`/users/${user.id}/role`).send({
			newRoleName: 'global:member',
		});

		expect(deleteSpy).toBeCalledTimes(2);
		deleteSpy.mockClear();

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toStrictEqual({ success: true });
	});
});
