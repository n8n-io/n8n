import {
	createTeamProject,
	getProjectByNameOrFail,
	linkUserToProject,
	getAllProjectRelations,
	getProjectRoleForUser,
	testDb,
	mockInstance,
} from '@n8n/backend-test-utils';

import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import { Telemetry } from '@/telemetry';
import {
	createMemberWithApiKey,
	createOwnerWithApiKey,
	createMember,
} from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

describe('Projects in Public API', () => {
	const testServer = setupTestServer({ endpointGroups: ['publicApi'] });
	mockInstance(Telemetry);

	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		await testDb.truncate(['Project', 'User']);
	});

	describe('GET /projects', () => {
		it('if licensed, should return all projects with pagination', async () => {
			/**
			 * Arrange
			 */
			testServer.license.setQuota('quota:maxTeamProjects', -1);
			testServer.license.enable('feat:projectRole:admin');
			const owner = await createOwnerWithApiKey();
			const projects = await Promise.all([
				createTeamProject(),
				createTeamProject(),
				createTeamProject(),
			]);

			/**
			 * Act
			 */
			const response = await testServer.publicApiAgentFor(owner).get('/projects');

			/**
			 * Assert
			 */
			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty('data');
			expect(response.body).toHaveProperty('nextCursor');
			expect(Array.isArray(response.body.data)).toBe(true);
			expect(response.body.data.length).toBe(projects.length + 1); // +1 for the owner's personal project

			projects.forEach(({ id, name }) => {
				expect(response.body.data).toContainEqual(expect.objectContaining({ id, name }));
			});
		});

		it('if not authenticated, should reject', async () => {
			/**
			 * Act
			 */
			const response = await testServer.publicApiAgentWithoutApiKey().get('/projects');

			/**
			 * Assert
			 */
			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty('message', "'X-N8N-API-KEY' header required");
		});

		it('if not licensed, should reject', async () => {
			/**
			 * Arrange
			 */
			const owner = await createOwnerWithApiKey();

			/**
			 * Act
			 */
			const response = await testServer.publicApiAgentFor(owner).get('/projects');

			/**
			 * Assert
			 */
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty(
				'message',
				new FeatureNotLicensedError('feat:projectRole:admin').message,
			);
		});

		it('if missing scope, should reject', async () => {
			/**
			 * Arrange
			 */
			testServer.license.setQuota('quota:maxTeamProjects', -1);
			testServer.license.enable('feat:projectRole:admin');
			const member = await createMemberWithApiKey();

			/**
			 * Act
			 */
			const response = await testServer.publicApiAgentFor(member).get('/projects');

			/**
			 * Assert
			 */
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', 'Forbidden');
		});
	});

	describe('POST /projects', () => {
		it('if licensed, should create a new project', async () => {
			/**
			 * Arrange
			 */
			testServer.license.setQuota('quota:maxTeamProjects', -1);
			testServer.license.enable('feat:projectRole:admin');
			const owner = await createOwnerWithApiKey();
			const projectPayload = { name: 'some-project' };

			/**
			 * Act
			 */
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/projects')
				.send(projectPayload);

			/**
			 * Assert
			 */
			expect(response.status).toBe(201);
			expect(response.body).toEqual({
				name: 'some-project',
				icon: null,
				type: 'team',
				description: null,
				id: expect.any(String),
				createdAt: expect.any(String),
				updatedAt: expect.any(String),
				role: 'project:admin',
				scopes: expect.any(Array),
			});
			await expect(getProjectByNameOrFail(projectPayload.name)).resolves.not.toThrow();
		});

		it('if not authenticated, should reject', async () => {
			/**
			 * Arrange
			 */
			const projectPayload = { name: 'some-project' };

			/**
			 * Act
			 */
			const response = await testServer
				.publicApiAgentWithoutApiKey()
				.post('/projects')
				.send(projectPayload);

			/**
			 * Assert
			 */
			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty('message', "'X-N8N-API-KEY' header required");
		});

		it('if not licensed, should reject', async () => {
			/**
			 * Arrange
			 */
			const owner = await createOwnerWithApiKey();
			const projectPayload = { name: 'some-project' };

			/**
			 * Act
			 */
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/projects')
				.send(projectPayload);

			/**
			 * Assert
			 */
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty(
				'message',
				new FeatureNotLicensedError('feat:projectRole:admin').message,
			);
		});

		it('if missing scope, should reject', async () => {
			/**
			 * Arrange
			 */
			testServer.license.setQuota('quota:maxTeamProjects', -1);
			testServer.license.enable('feat:projectRole:admin');
			const member = await createMemberWithApiKey();
			const projectPayload = { name: 'some-project' };

			/**
			 * Act
			 */
			const response = await testServer
				.publicApiAgentFor(member)
				.post('/projects')
				.send(projectPayload);

			/**
			 * Assert
			 */
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', 'Forbidden');
		});
	});

	describe('DELETE /projects/:id', () => {
		it('if licensed, should delete a project', async () => {
			/**
			 * Arrange
			 */
			testServer.license.setQuota('quota:maxTeamProjects', -1);
			testServer.license.enable('feat:projectRole:admin');
			const owner = await createOwnerWithApiKey();
			const project = await createTeamProject();

			/**
			 * Act
			 */
			const response = await testServer.publicApiAgentFor(owner).delete(`/projects/${project.id}`);

			/**
			 * Assert
			 */
			expect(response.status).toBe(204);
			await expect(getProjectByNameOrFail(project.id)).rejects.toThrow();
		});

		it('if not authenticated, should reject', async () => {
			/**
			 * Arrange
			 */
			const project = await createTeamProject();

			/**
			 * Act
			 */
			const response = await testServer
				.publicApiAgentWithoutApiKey()
				.delete(`/projects/${project.id}`);

			/**
			 * Assert
			 */
			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty('message', "'X-N8N-API-KEY' header required");
		});

		it('if not licensed, should reject', async () => {
			/**
			 * Arrange
			 */
			const owner = await createOwnerWithApiKey();
			const project = await createTeamProject();

			/**
			 * Act
			 */
			const response = await testServer.publicApiAgentFor(owner).delete(`/projects/${project.id}`);

			/**
			 * Assert
			 */
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty(
				'message',
				new FeatureNotLicensedError('feat:projectRole:admin').message,
			);
		});

		it('if missing scope, should reject', async () => {
			/**
			 * Arrange
			 */
			testServer.license.setQuota('quota:maxTeamProjects', -1);
			testServer.license.enable('feat:projectRole:admin');
			const owner = await createMemberWithApiKey();
			const project = await createTeamProject();

			/**
			 * Act
			 */
			const response = await testServer.publicApiAgentFor(owner).delete(`/projects/${project.id}`);

			/**
			 * Assert
			 */
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', 'Forbidden');
		});
	});

	describe('PUT /projects/:id', () => {
		it('if licensed, should update a project', async () => {
			/**
			 * Arrange
			 */
			testServer.license.setQuota('quota:maxTeamProjects', -1);
			testServer.license.enable('feat:projectRole:admin');
			const owner = await createOwnerWithApiKey();
			const project = await createTeamProject('old-name');

			/**
			 * Act
			 */
			const response = await testServer
				.publicApiAgentFor(owner)
				.put(`/projects/${project.id}`)
				.send({ name: 'new-name' });

			/**
			 * Assert
			 */
			expect(response.status).toBe(204);
			await expect(getProjectByNameOrFail('new-name')).resolves.not.toThrow();
		});

		it('if not authenticated, should reject', async () => {
			/**
			 * Arrange
			 */
			const project = await createTeamProject();

			/**
			 * Act
			 */
			const response = await testServer
				.publicApiAgentWithoutApiKey()
				.put(`/projects/${project.id}`)
				.send({ name: 'new-name' });

			/**
			 * Assert
			 */
			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty('message', "'X-N8N-API-KEY' header required");
		});

		it('if not licensed, should reject', async () => {
			/**
			 * Arrange
			 */
			const owner = await createOwnerWithApiKey();
			const project = await createTeamProject();

			/**
			 * Act
			 */
			const response = await testServer
				.publicApiAgentFor(owner)
				.put(`/projects/${project.id}`)
				.send({ name: 'new-name' });

			/**
			 * Assert
			 */
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty(
				'message',
				new FeatureNotLicensedError('feat:projectRole:admin').message,
			);
		});

		it('if missing scope, should reject', async () => {
			/**
			 * Arrange
			 */
			testServer.license.setQuota('quota:maxTeamProjects', -1);
			testServer.license.enable('feat:projectRole:admin');
			const member = await createMemberWithApiKey();
			const project = await createTeamProject();

			/**
			 * Act
			 */
			const response = await testServer
				.publicApiAgentFor(member)
				.put(`/projects/${project.id}`)
				.send({ name: 'new-name' });

			/**
			 * Assert
			 */
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', 'Forbidden');
		});
	});

	describe('POST /projects/:id/users', () => {
		it('if not authenticated, should reject with 401', async () => {
			const project = await createTeamProject();

			const response = await testServer
				.publicApiAgentWithoutApiKey()
				.post(`/projects/${project.id}/users`);

			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty('message', "'X-N8N-API-KEY' header required");
		});

		it('if not licensed, should reject with a 403', async () => {
			const owner = await createOwnerWithApiKey();
			const project = await createTeamProject();
			const member = await createMember();

			const payload = {
				relations: [
					{
						userId: member.id,
						role: 'project:viewer',
					},
				],
			};

			const response = await testServer
				.publicApiAgentFor(owner)
				.post(`/projects/${project.id}/users`)
				.send(payload);

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty(
				'message',
				new FeatureNotLicensedError('feat:projectRole:admin').message,
			);
		});

		it('if missing scope, should reject with 403', async () => {
			testServer.license.setQuota('quota:maxTeamProjects', -1);
			testServer.license.enable('feat:projectRole:admin');
			const member = await createMemberWithApiKey();
			const project = await createTeamProject();

			const payload = {
				relations: [
					{
						userId: member.id,
						role: 'project:viewer',
					},
				],
			};

			const response = await testServer
				.publicApiAgentFor(member)
				.post(`/projects/${project.id}/users`)
				.send(payload);

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', 'Forbidden');
		});

		describe('when user has correct license', () => {
			beforeEach(() => {
				testServer.license.setQuota('quota:maxTeamProjects', -1);
				testServer.license.enable('feat:projectRole:admin');
			});

			it("should reject with 400 if the payload can't be validated", async () => {
				// ARRANGE
				const owner = await createOwnerWithApiKey();
				const member = await createMember();

				const payload = {
					relations: [
						{
							userId: member.id,
							// field does not exist
							invalidField: 'invalidValue',
						},
					],
				};

				// ACT
				const response = await testServer
					.publicApiAgentFor(owner)
					.post('/projects/123456/users')
					.send(payload)
					.expect(400);

				// ASSERT
				expect(response.body).toHaveProperty(
					'message',
					"request/body/relations/0 must have required property 'role'",
				);
			});

			it('should reject if the relations have a role that do not exist', async () => {
				const owner = await createOwnerWithApiKey();
				const member = await createMember();
				const project = await createTeamProject('shared-project', owner);

				const payload = {
					relations: [
						{
							userId: member.id,
							role: 'project:invalid-role',
						},
					],
				};

				await testServer
					.publicApiAgentFor(owner)
					.post(`/projects/${project.id}/users`)
					.send(payload)
					.expect(400);

				// TODO: add message check once we properly validate role from database
			});

			it('should reject with 404 if no project found', async () => {
				const owner = await createOwnerWithApiKey();
				const member = await createMember();

				const payload = {
					relations: [
						{
							userId: member.id,
							role: 'project:viewer',
						},
					],
				};

				const response = await testServer
					.publicApiAgentFor(owner)
					.post('/projects/123456/users')
					.send(payload);

				expect(response.status).toBe(404);
				expect(response.body).toHaveProperty('message', 'Could not find project with ID: 123456');
			});

			it('should add expected users to project', async () => {
				testServer.license.enable('feat:projectRole:viewer');
				testServer.license.enable('feat:projectRole:editor');
				const owner = await createOwnerWithApiKey();
				const project = await createTeamProject('shared-project', owner);
				const member = await createMember();
				const member2 = await createMember();
				const projectBefore = await getAllProjectRelations({
					projectId: project.id,
				});

				const payload = {
					relations: [
						{
							userId: member.id,
							role: 'project:viewer',
						},
						{
							userId: member2.id,
							role: 'project:editor',
						},
					],
				};

				const response = await testServer
					.publicApiAgentFor(owner)
					.post(`/projects/${project.id}/users`)
					.send(payload);

				const projectAfter = await getAllProjectRelations({
					projectId: project.id,
				});

				expect(response.status).toBe(201);
				expect(projectBefore.length).toEqual(1);
				expect(projectBefore[0].userId).toEqual(owner.id);

				expect(projectAfter.length).toEqual(3);
				const adminRelation = projectAfter.find(
					(relation) => relation.userId === owner.id && relation.role.slug === 'project:admin',
				);
				expect(adminRelation!.userId).toBe(owner.id);
				expect(adminRelation!.role.slug).toBe('project:admin');
				const viewerRelation = projectAfter.find(
					(relation) => relation.userId === member.id && relation.role.slug === 'project:viewer',
				);
				expect(viewerRelation!.userId).toBe(member.id);
				expect(viewerRelation!.role.slug).toBe('project:viewer');
				const editorRelation = projectAfter.find(
					(relation) => relation.userId === member2.id && relation.role.slug === 'project:editor',
				);
				expect(editorRelation!.userId).toBe(member2.id);
				expect(editorRelation!.role.slug).toBe('project:editor');
			});

			it('should reject with 400 if license does not include user role', async () => {
				const owner = await createOwnerWithApiKey();
				const project = await createTeamProject('shared-project', owner);
				const member = await createMember();

				const payload = {
					relations: [
						{
							userId: member.id,
							role: 'project:viewer',
						},
					],
				};

				const response = await testServer
					.publicApiAgentFor(owner)
					.post(`/projects/${project.id}/users`)
					.send(payload);

				expect(response.status).toBe(400);
				expect(response.body).toHaveProperty(
					'message',
					'Your instance is not licensed to use role "project:viewer".',
				);
			});
		});
	});

	describe('PATCH /projects/:id/users/:userId', () => {
		it('if not authenticated, should reject with 401', async () => {
			const response = await testServer
				.publicApiAgentWithoutApiKey()
				.patch('/projects/123/users/456')
				.send({ role: 'project:viewer' });

			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty('message', "'X-N8N-API-KEY' header required");
		});

		it('if not licensed, should reject with a 403', async () => {
			const owner = await createOwnerWithApiKey();

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch('/projects/123/users/456')
				.send({ role: 'project:viewer' });

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty(
				'message',
				new FeatureNotLicensedError('feat:projectRole:admin').message,
			);
		});

		it('if missing scope, should reject with 403', async () => {
			testServer.license.setQuota('quota:maxTeamProjects', -1);
			testServer.license.enable('feat:projectRole:admin');
			const member = await createMemberWithApiKey();

			const response = await testServer
				.publicApiAgentFor(member)
				.patch('/projects/123/users/456')
				.send({ role: 'project:viewer' });

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', 'Forbidden');
		});

		describe('when user has correct license', () => {
			beforeEach(() => {
				testServer.license.setQuota('quota:maxTeamProjects', -1);
				testServer.license.enable('feat:projectRole:admin');
			});

			it('should reject with 400 if the role do not exist', async () => {
				// ARRANGE
				const owner = await createOwnerWithApiKey();
				const member = await createMember();
				const project = await createTeamProject('shared-project', owner);
				await linkUserToProject(member, project, 'project:viewer');

				// ACT
				await testServer
					.publicApiAgentFor(owner)
					.patch(`/projects/${project.id}/users/${member.id}`)
					// role does not exist
					.send({ role: 'project:boss' })
					.expect(400);

				// ASSERT
				// TODO: add message check once we properly validate that the role exists
			});

			it("should change a user's role in a project", async () => {
				const owner = await createOwnerWithApiKey();
				const project = await createTeamProject('shared-project', owner);

				const member = await createMember();
				expect(await getProjectRoleForUser(project.id, member.id)).toBeUndefined();

				await linkUserToProject(member, project, 'project:viewer');
				expect(await getProjectRoleForUser(project.id, member.id)).toBe('project:viewer');

				await testServer
					.publicApiAgentFor(owner)
					.patch(`/projects/${project.id}/users/${member.id}`)
					.send({ role: 'project:editor' })
					.expect(204);

				expect(await getProjectRoleForUser(project.id, member.id)).toBe('project:editor');
			});

			it('should reject with 404 if no project found', async () => {
				const owner = await createOwnerWithApiKey();
				const member = await createMember();

				const response = await testServer
					.publicApiAgentFor(owner)
					.patch(`/projects/123456/users/${member.id}`)
					.send({ role: 'project:editor' })
					.expect(404);

				expect(response.body).toHaveProperty('message', 'Could not find project with ID: 123456');
			});

			it('should reject with 404 if user is not in the project', async () => {
				const owner = await createOwnerWithApiKey();
				const project = await createTeamProject('shared-project', owner);
				const member = await createMember();

				expect(await getProjectRoleForUser(project.id, member.id)).toBeUndefined();

				const response = await testServer
					.publicApiAgentFor(owner)
					.patch(`/projects/${project.id}/users/${member.id}`)
					.send({ role: 'project:editor' })
					.expect(404);

				expect(response.body).toHaveProperty(
					'message',
					`Could not find project with ID: ${project.id}`,
				);
			});
		});
	});

	describe('DELETE /projects/:id/users/:userId', () => {
		it('if not authenticated, should reject with 401', async () => {
			const project = await createTeamProject();
			const member = await createMember();

			const response = await testServer
				.publicApiAgentWithoutApiKey()
				.delete(`/projects/${project.id}/users/${member.id}`);

			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty('message', "'X-N8N-API-KEY' header required");
		});

		it('if not licensed, should reject with a 403', async () => {
			const owner = await createOwnerWithApiKey();
			const project = await createTeamProject();
			const member = await createMember();

			const response = await testServer
				.publicApiAgentFor(owner)
				.delete(`/projects/${project.id}/users/${member.id}`);

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty(
				'message',
				new FeatureNotLicensedError('feat:projectRole:admin').message,
			);
		});

		it('if missing scope, should reject with 403', async () => {
			testServer.license.setQuota('quota:maxTeamProjects', -1);
			testServer.license.enable('feat:projectRole:admin');
			const member = await createMemberWithApiKey();
			const project = await createTeamProject();

			const response = await testServer
				.publicApiAgentFor(member)
				.delete(`/projects/${project.id}/users/${member.id}`);

			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', 'Forbidden');
		});

		describe('when user has correct license', () => {
			beforeEach(() => {
				testServer.license.setQuota('quota:maxTeamProjects', -1);
				testServer.license.enable('feat:projectRole:admin');
			});

			it('should remove given user from project', async () => {
				const owner = await createOwnerWithApiKey();
				const project = await createTeamProject('shared-project', owner);
				const member = await createMember();
				await linkUserToProject(member, project, 'project:viewer');
				const projectBefore = await getAllProjectRelations({
					projectId: project.id,
				});

				const response = await testServer
					.publicApiAgentFor(owner)
					.delete(`/projects/${project.id}/users/${member.id}`);

				const projectAfter = await getAllProjectRelations({
					projectId: project.id,
				});

				expect(response.status).toBe(204);
				expect(projectBefore.length).toEqual(2);
				expect(projectBefore.find((p) => p.role.slug === 'project:admin')?.userId).toEqual(
					owner.id,
				);
				expect(projectBefore.find((p) => p.role.slug === 'project:viewer')?.userId).toEqual(
					member.id,
				);

				expect(projectAfter.length).toEqual(1);
				expect(projectAfter[0].userId).toEqual(owner.id);
			});

			it('should reject with 404 if no project found', async () => {
				const owner = await createOwnerWithApiKey();
				const member = await createMember();

				const response = await testServer
					.publicApiAgentFor(owner)
					.delete(`/projects/123456/users/${member.id}`);

				expect(response.status).toBe(404);
				expect(response.body).toHaveProperty('message', 'Could not find project with ID: 123456');
			});

			it('should remain unchanged if user if not in project', async () => {
				const owner = await createOwnerWithApiKey();
				const project = await createTeamProject('shared-project', owner);
				const member = await createMember();
				const projectBefore = await getAllProjectRelations({
					projectId: project.id,
				});

				const response = await testServer
					.publicApiAgentFor(owner)
					.delete(`/projects/${project.id}/users/${member.id}`);

				const projectAfter = await getAllProjectRelations({
					projectId: project.id,
				});

				expect(response.status).toBe(204);
				expect(projectBefore.length).toEqual(1);
				expect(projectBefore[0].userId).toEqual(owner.id);

				expect(projectAfter.length).toEqual(1);
				expect(projectAfter[0].userId).toEqual(owner.id);
			});
		});
	});
});
