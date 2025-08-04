'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const feature_not_licensed_error_1 = require('@/errors/feature-not-licensed.error');
const telemetry_1 = require('@/telemetry');
const users_1 = require('@test-integration/db/users');
const utils_1 = require('@test-integration/utils');
describe('Projects in Public API', () => {
	const testServer = (0, utils_1.setupTestServer)({ endpointGroups: ['publicApi'] });
	(0, backend_test_utils_1.mockInstance)(telemetry_1.Telemetry);
	beforeAll(async () => {
		await backend_test_utils_1.testDb.init();
	});
	beforeEach(async () => {
		await backend_test_utils_1.testDb.truncate(['Project', 'User']);
	});
	describe('GET /projects', () => {
		it('if licensed, should return all projects with pagination', async () => {
			testServer.license.setQuota('quota:maxTeamProjects', -1);
			testServer.license.enable('feat:projectRole:admin');
			const owner = await (0, users_1.createOwnerWithApiKey)();
			const projects = await Promise.all([
				(0, backend_test_utils_1.createTeamProject)(),
				(0, backend_test_utils_1.createTeamProject)(),
				(0, backend_test_utils_1.createTeamProject)(),
			]);
			const response = await testServer.publicApiAgentFor(owner).get('/projects');
			expect(response.status).toBe(200);
			expect(response.body).toHaveProperty('data');
			expect(response.body).toHaveProperty('nextCursor');
			expect(Array.isArray(response.body.data)).toBe(true);
			expect(response.body.data.length).toBe(projects.length + 1);
			projects.forEach(({ id, name }) => {
				expect(response.body.data).toContainEqual(expect.objectContaining({ id, name }));
			});
		});
		it('if not authenticated, should reject', async () => {
			const response = await testServer.publicApiAgentWithoutApiKey().get('/projects');
			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty('message', "'X-N8N-API-KEY' header required");
		});
		it('if not licensed, should reject', async () => {
			const owner = await (0, users_1.createOwnerWithApiKey)();
			const response = await testServer.publicApiAgentFor(owner).get('/projects');
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty(
				'message',
				new feature_not_licensed_error_1.FeatureNotLicensedError('feat:projectRole:admin').message,
			);
		});
		it('if missing scope, should reject', async () => {
			testServer.license.setQuota('quota:maxTeamProjects', -1);
			testServer.license.enable('feat:projectRole:admin');
			const member = await (0, users_1.createMemberWithApiKey)();
			const response = await testServer.publicApiAgentFor(member).get('/projects');
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', 'Forbidden');
		});
	});
	describe('POST /projects', () => {
		it('if licensed, should create a new project', async () => {
			testServer.license.setQuota('quota:maxTeamProjects', -1);
			testServer.license.enable('feat:projectRole:admin');
			const owner = await (0, users_1.createOwnerWithApiKey)();
			const projectPayload = { name: 'some-project' };
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/projects')
				.send(projectPayload);
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
			await expect(
				(0, backend_test_utils_1.getProjectByNameOrFail)(projectPayload.name),
			).resolves.not.toThrow();
		});
		it('if not authenticated, should reject', async () => {
			const projectPayload = { name: 'some-project' };
			const response = await testServer
				.publicApiAgentWithoutApiKey()
				.post('/projects')
				.send(projectPayload);
			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty('message', "'X-N8N-API-KEY' header required");
		});
		it('if not licensed, should reject', async () => {
			const owner = await (0, users_1.createOwnerWithApiKey)();
			const projectPayload = { name: 'some-project' };
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/projects')
				.send(projectPayload);
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty(
				'message',
				new feature_not_licensed_error_1.FeatureNotLicensedError('feat:projectRole:admin').message,
			);
		});
		it('if missing scope, should reject', async () => {
			testServer.license.setQuota('quota:maxTeamProjects', -1);
			testServer.license.enable('feat:projectRole:admin');
			const member = await (0, users_1.createMemberWithApiKey)();
			const projectPayload = { name: 'some-project' };
			const response = await testServer
				.publicApiAgentFor(member)
				.post('/projects')
				.send(projectPayload);
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', 'Forbidden');
		});
	});
	describe('DELETE /projects/:id', () => {
		it('if licensed, should delete a project', async () => {
			testServer.license.setQuota('quota:maxTeamProjects', -1);
			testServer.license.enable('feat:projectRole:admin');
			const owner = await (0, users_1.createOwnerWithApiKey)();
			const project = await (0, backend_test_utils_1.createTeamProject)();
			const response = await testServer.publicApiAgentFor(owner).delete(`/projects/${project.id}`);
			expect(response.status).toBe(204);
			await expect((0, backend_test_utils_1.getProjectByNameOrFail)(project.id)).rejects.toThrow();
		});
		it('if not authenticated, should reject', async () => {
			const project = await (0, backend_test_utils_1.createTeamProject)();
			const response = await testServer
				.publicApiAgentWithoutApiKey()
				.delete(`/projects/${project.id}`);
			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty('message', "'X-N8N-API-KEY' header required");
		});
		it('if not licensed, should reject', async () => {
			const owner = await (0, users_1.createOwnerWithApiKey)();
			const project = await (0, backend_test_utils_1.createTeamProject)();
			const response = await testServer.publicApiAgentFor(owner).delete(`/projects/${project.id}`);
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty(
				'message',
				new feature_not_licensed_error_1.FeatureNotLicensedError('feat:projectRole:admin').message,
			);
		});
		it('if missing scope, should reject', async () => {
			testServer.license.setQuota('quota:maxTeamProjects', -1);
			testServer.license.enable('feat:projectRole:admin');
			const owner = await (0, users_1.createMemberWithApiKey)();
			const project = await (0, backend_test_utils_1.createTeamProject)();
			const response = await testServer.publicApiAgentFor(owner).delete(`/projects/${project.id}`);
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', 'Forbidden');
		});
	});
	describe('PUT /projects/:id', () => {
		it('if licensed, should update a project', async () => {
			testServer.license.setQuota('quota:maxTeamProjects', -1);
			testServer.license.enable('feat:projectRole:admin');
			const owner = await (0, users_1.createOwnerWithApiKey)();
			const project = await (0, backend_test_utils_1.createTeamProject)('old-name');
			const response = await testServer
				.publicApiAgentFor(owner)
				.put(`/projects/${project.id}`)
				.send({ name: 'new-name' });
			expect(response.status).toBe(204);
			await expect(
				(0, backend_test_utils_1.getProjectByNameOrFail)('new-name'),
			).resolves.not.toThrow();
		});
		it('if not authenticated, should reject', async () => {
			const project = await (0, backend_test_utils_1.createTeamProject)();
			const response = await testServer
				.publicApiAgentWithoutApiKey()
				.put(`/projects/${project.id}`)
				.send({ name: 'new-name' });
			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty('message', "'X-N8N-API-KEY' header required");
		});
		it('if not licensed, should reject', async () => {
			const owner = await (0, users_1.createOwnerWithApiKey)();
			const project = await (0, backend_test_utils_1.createTeamProject)();
			const response = await testServer
				.publicApiAgentFor(owner)
				.put(`/projects/${project.id}`)
				.send({ name: 'new-name' });
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty(
				'message',
				new feature_not_licensed_error_1.FeatureNotLicensedError('feat:projectRole:admin').message,
			);
		});
		it('if missing scope, should reject', async () => {
			testServer.license.setQuota('quota:maxTeamProjects', -1);
			testServer.license.enable('feat:projectRole:admin');
			const member = await (0, users_1.createMemberWithApiKey)();
			const project = await (0, backend_test_utils_1.createTeamProject)();
			const response = await testServer
				.publicApiAgentFor(member)
				.put(`/projects/${project.id}`)
				.send({ name: 'new-name' });
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty('message', 'Forbidden');
		});
	});
	describe('POST /projects/:id/users', () => {
		it('if not authenticated, should reject with 401', async () => {
			const project = await (0, backend_test_utils_1.createTeamProject)();
			const response = await testServer
				.publicApiAgentWithoutApiKey()
				.post(`/projects/${project.id}/users`);
			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty('message', "'X-N8N-API-KEY' header required");
		});
		it('if not licensed, should reject with a 403', async () => {
			const owner = await (0, users_1.createOwnerWithApiKey)();
			const project = await (0, backend_test_utils_1.createTeamProject)();
			const member = await (0, users_1.createMember)();
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
				new feature_not_licensed_error_1.FeatureNotLicensedError('feat:projectRole:admin').message,
			);
		});
		it('if missing scope, should reject with 403', async () => {
			testServer.license.setQuota('quota:maxTeamProjects', -1);
			testServer.license.enable('feat:projectRole:admin');
			const member = await (0, users_1.createMemberWithApiKey)();
			const project = await (0, backend_test_utils_1.createTeamProject)();
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
				const owner = await (0, users_1.createOwnerWithApiKey)();
				const member = await (0, users_1.createMember)();
				const payload = {
					relations: [
						{
							userId: member.id,
							role: 'project:boss',
						},
					],
				};
				const response = await testServer
					.publicApiAgentFor(owner)
					.post('/projects/123456/users')
					.send(payload)
					.expect(400);
				expect(response.body).toHaveProperty(
					'message',
					"Invalid enum value. Expected 'project:admin' | 'project:editor' | 'project:viewer', received 'project:boss'",
				);
			});
			it('should reject with 404 if no project found', async () => {
				const owner = await (0, users_1.createOwnerWithApiKey)();
				const member = await (0, users_1.createMember)();
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
				const owner = await (0, users_1.createOwnerWithApiKey)();
				const project = await (0, backend_test_utils_1.createTeamProject)('shared-project', owner);
				const member = await (0, users_1.createMember)();
				const member2 = await (0, users_1.createMember)();
				const projectBefore = await (0, backend_test_utils_1.getAllProjectRelations)({
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
				const projectAfter = await (0, backend_test_utils_1.getAllProjectRelations)({
					projectId: project.id,
				});
				expect(response.status).toBe(201);
				expect(projectBefore.length).toEqual(1);
				expect(projectBefore[0].userId).toEqual(owner.id);
				expect(projectAfter.length).toEqual(3);
				const adminRelation = projectAfter.find(
					(relation) => relation.userId === owner.id && relation.role === 'project:admin',
				);
				expect(adminRelation).toEqual(
					expect.objectContaining({ userId: owner.id, role: 'project:admin' }),
				);
				const viewerRelation = projectAfter.find(
					(relation) => relation.userId === member.id && relation.role === 'project:viewer',
				);
				expect(viewerRelation).toEqual(
					expect.objectContaining({ userId: member.id, role: 'project:viewer' }),
				);
				const editorRelation = projectAfter.find(
					(relation) => relation.userId === member2.id && relation.role === 'project:editor',
				);
				expect(editorRelation).toEqual(
					expect.objectContaining({ userId: member2.id, role: 'project:editor' }),
				);
			});
			it('should reject with 400 if license does not include user role', async () => {
				const owner = await (0, users_1.createOwnerWithApiKey)();
				const project = await (0, backend_test_utils_1.createTeamProject)('shared-project', owner);
				const member = await (0, users_1.createMember)();
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
			const owner = await (0, users_1.createOwnerWithApiKey)();
			const response = await testServer
				.publicApiAgentFor(owner)
				.patch('/projects/123/users/456')
				.send({ role: 'project:viewer' });
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty(
				'message',
				new feature_not_licensed_error_1.FeatureNotLicensedError('feat:projectRole:admin').message,
			);
		});
		it('if missing scope, should reject with 403', async () => {
			testServer.license.setQuota('quota:maxTeamProjects', -1);
			testServer.license.enable('feat:projectRole:admin');
			const member = await (0, users_1.createMemberWithApiKey)();
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
			it("should reject with 400 if the payload can't be validated", async () => {
				const owner = await (0, users_1.createOwnerWithApiKey)();
				const response = await testServer
					.publicApiAgentFor(owner)
					.patch('/projects/1234/users/1235')
					.send({ role: 'project:boss' })
					.expect(400);
				expect(response.body).toHaveProperty(
					'message',
					"Invalid enum value. Expected 'project:admin' | 'project:editor' | 'project:viewer', received 'project:boss'",
				);
			});
			it("should change a user's role in a project", async () => {
				const owner = await (0, users_1.createOwnerWithApiKey)();
				const project = await (0, backend_test_utils_1.createTeamProject)('shared-project', owner);
				const member = await (0, users_1.createMember)();
				expect(
					await (0, backend_test_utils_1.getProjectRoleForUser)(project.id, member.id),
				).toBeUndefined();
				await (0, backend_test_utils_1.linkUserToProject)(member, project, 'project:viewer');
				expect(await (0, backend_test_utils_1.getProjectRoleForUser)(project.id, member.id)).toBe(
					'project:viewer',
				);
				await testServer
					.publicApiAgentFor(owner)
					.patch(`/projects/${project.id}/users/${member.id}`)
					.send({ role: 'project:editor' })
					.expect(204);
				expect(await (0, backend_test_utils_1.getProjectRoleForUser)(project.id, member.id)).toBe(
					'project:editor',
				);
			});
			it('should reject with 404 if no project found', async () => {
				const owner = await (0, users_1.createOwnerWithApiKey)();
				const member = await (0, users_1.createMember)();
				const response = await testServer
					.publicApiAgentFor(owner)
					.patch(`/projects/123456/users/${member.id}`)
					.send({ role: 'project:editor' })
					.expect(404);
				expect(response.body).toHaveProperty('message', 'Could not find project with ID: 123456');
			});
			it('should reject with 404 if user is not in the project', async () => {
				const owner = await (0, users_1.createOwnerWithApiKey)();
				const project = await (0, backend_test_utils_1.createTeamProject)('shared-project', owner);
				const member = await (0, users_1.createMember)();
				expect(
					await (0, backend_test_utils_1.getProjectRoleForUser)(project.id, member.id),
				).toBeUndefined();
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
			const project = await (0, backend_test_utils_1.createTeamProject)();
			const member = await (0, users_1.createMember)();
			const response = await testServer
				.publicApiAgentWithoutApiKey()
				.delete(`/projects/${project.id}/users/${member.id}`);
			expect(response.status).toBe(401);
			expect(response.body).toHaveProperty('message', "'X-N8N-API-KEY' header required");
		});
		it('if not licensed, should reject with a 403', async () => {
			const owner = await (0, users_1.createOwnerWithApiKey)();
			const project = await (0, backend_test_utils_1.createTeamProject)();
			const member = await (0, users_1.createMember)();
			const response = await testServer
				.publicApiAgentFor(owner)
				.delete(`/projects/${project.id}/users/${member.id}`);
			expect(response.status).toBe(403);
			expect(response.body).toHaveProperty(
				'message',
				new feature_not_licensed_error_1.FeatureNotLicensedError('feat:projectRole:admin').message,
			);
		});
		it('if missing scope, should reject with 403', async () => {
			testServer.license.setQuota('quota:maxTeamProjects', -1);
			testServer.license.enable('feat:projectRole:admin');
			const member = await (0, users_1.createMemberWithApiKey)();
			const project = await (0, backend_test_utils_1.createTeamProject)();
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
				const owner = await (0, users_1.createOwnerWithApiKey)();
				const project = await (0, backend_test_utils_1.createTeamProject)('shared-project', owner);
				const member = await (0, users_1.createMember)();
				await (0, backend_test_utils_1.linkUserToProject)(member, project, 'project:viewer');
				const projectBefore = await (0, backend_test_utils_1.getAllProjectRelations)({
					projectId: project.id,
				});
				const response = await testServer
					.publicApiAgentFor(owner)
					.delete(`/projects/${project.id}/users/${member.id}`);
				const projectAfter = await (0, backend_test_utils_1.getAllProjectRelations)({
					projectId: project.id,
				});
				expect(response.status).toBe(204);
				expect(projectBefore.length).toEqual(2);
				expect(projectBefore.find((p) => p.role === 'project:admin')?.userId).toEqual(owner.id);
				expect(projectBefore.find((p) => p.role === 'project:viewer')?.userId).toEqual(member.id);
				expect(projectAfter.length).toEqual(1);
				expect(projectAfter[0].userId).toEqual(owner.id);
			});
			it('should reject with 404 if no project found', async () => {
				const owner = await (0, users_1.createOwnerWithApiKey)();
				const member = await (0, users_1.createMember)();
				const response = await testServer
					.publicApiAgentFor(owner)
					.delete(`/projects/123456/users/${member.id}`);
				expect(response.status).toBe(404);
				expect(response.body).toHaveProperty('message', 'Could not find project with ID: 123456');
			});
			it('should remain unchanged if user if not in project', async () => {
				const owner = await (0, users_1.createOwnerWithApiKey)();
				const project = await (0, backend_test_utils_1.createTeamProject)('shared-project', owner);
				const member = await (0, users_1.createMember)();
				const projectBefore = await (0, backend_test_utils_1.getAllProjectRelations)({
					projectId: project.id,
				});
				const response = await testServer
					.publicApiAgentFor(owner)
					.delete(`/projects/${project.id}/users/${member.id}`);
				const projectAfter = await (0, backend_test_utils_1.getAllProjectRelations)({
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
//# sourceMappingURL=projects.test.js.map
