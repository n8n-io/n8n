'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const permissions_1 = require('@n8n/permissions');
const typeorm_1 = require('@n8n/typeorm');
const active_workflow_manager_1 = require('@/active-workflow-manager');
const workflows_service_1 = require('@/public-api/v1/handlers/workflows/workflows.service');
const cache_service_1 = require('@/services/cache/cache.service');
const folders_1 = require('@test-integration/db/folders');
const credentials_1 = require('./shared/db/credentials');
const users_1 = require('./shared/db/users');
const utils = __importStar(require('./shared/utils/'));
const testServer = utils.setupTestServer({
	endpointGroups: ['project'],
	enabledFeatures: [
		'feat:advancedPermissions',
		'feat:projectRole:admin',
		'feat:projectRole:editor',
		'feat:projectRole:viewer',
	],
	quotas: {
		'quota:maxTeamProjects': -1,
	},
});
(0, backend_test_utils_1.mockInstance)(active_workflow_manager_1.ActiveWorkflowManager);
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate(['User', 'Project']);
});
describe('GET /projects/', () => {
	test('member should get all personal projects and team projects they are apart of', async () => {
		const [testUser1, testUser2, testUser3] = await Promise.all([
			(0, users_1.createUser)(),
			(0, users_1.createUser)(),
			(0, users_1.createUser)(),
		]);
		const [teamProject1, teamProject2] = await Promise.all([
			(0, backend_test_utils_1.createTeamProject)(undefined, testUser1),
			(0, backend_test_utils_1.createTeamProject)(),
		]);
		const [personalProject1, personalProject2, personalProject3] = await Promise.all([
			(0, backend_test_utils_1.getPersonalProject)(testUser1),
			(0, backend_test_utils_1.getPersonalProject)(testUser2),
			(0, backend_test_utils_1.getPersonalProject)(testUser3),
		]);
		const memberAgent = testServer.authAgentFor(testUser1);
		const resp = await memberAgent.get('/projects/');
		expect(resp.status).toBe(200);
		const respProjects = resp.body.data;
		expect(respProjects.length).toBe(4);
		expect(
			[personalProject1, personalProject2, personalProject3].every((v, i) => {
				const p = respProjects.find((p) => p.id === v.id);
				if (!p) {
					return false;
				}
				const u = [testUser1, testUser2, testUser3][i];
				return p.name === u.createPersonalProjectName();
			}),
		).toBe(true);
		expect(respProjects.find((p) => p.id === teamProject1.id)).not.toBeUndefined();
		expect(respProjects.find((p) => p.id === teamProject2.id)).toBeUndefined();
	});
	test('owner should get all projects', async () => {
		const [ownerUser, testUser1, testUser2, testUser3] = await Promise.all([
			(0, users_1.createOwner)(),
			(0, users_1.createUser)(),
			(0, users_1.createUser)(),
			(0, users_1.createUser)(),
		]);
		const [teamProject1, teamProject2] = await Promise.all([
			(0, backend_test_utils_1.createTeamProject)(undefined, testUser1),
			(0, backend_test_utils_1.createTeamProject)(),
		]);
		const [ownerProject, personalProject1, personalProject2, personalProject3] = await Promise.all([
			(0, backend_test_utils_1.getPersonalProject)(ownerUser),
			(0, backend_test_utils_1.getPersonalProject)(testUser1),
			(0, backend_test_utils_1.getPersonalProject)(testUser2),
			(0, backend_test_utils_1.getPersonalProject)(testUser3),
		]);
		const memberAgent = testServer.authAgentFor(ownerUser);
		const resp = await memberAgent.get('/projects/');
		expect(resp.status).toBe(200);
		const respProjects = resp.body.data;
		expect(respProjects.length).toBe(6);
		expect(
			[ownerProject, personalProject1, personalProject2, personalProject3].every((v, i) => {
				const p = respProjects.find((p) => p.id === v.id);
				if (!p) {
					return false;
				}
				const u = [ownerUser, testUser1, testUser2, testUser3][i];
				return p.name === u.createPersonalProjectName();
			}),
		).toBe(true);
		expect(respProjects.find((p) => p.id === teamProject1.id)).not.toBeUndefined();
		expect(respProjects.find((p) => p.id === teamProject2.id)).not.toBeUndefined();
	});
});
describe('GET /projects/count', () => {
	test('should return correct number of projects', async () => {
		const [firstUser] = await Promise.all([
			(0, users_1.createUser)(),
			(0, users_1.createUser)(),
			(0, users_1.createUser)(),
			(0, users_1.createUser)(),
			(0, backend_test_utils_1.createTeamProject)(),
			(0, backend_test_utils_1.createTeamProject)(),
			(0, backend_test_utils_1.createTeamProject)(),
		]);
		const resp = await testServer.authAgentFor(firstUser).get('/projects/count');
		expect(resp.body.data.personal).toBe(4);
		expect(resp.body.data.team).toBe(3);
	});
});
describe('GET /projects/my-projects', () => {
	test('member should get all projects they are apart of', async () => {
		const [testUser1, testUser2, testUser3] = await Promise.all([
			(0, users_1.createUser)(),
			(0, users_1.createUser)(),
			(0, users_1.createUser)(),
		]);
		const [teamProject1, teamProject2] = await Promise.all([
			(0, backend_test_utils_1.createTeamProject)(undefined, testUser1),
			(0, backend_test_utils_1.createTeamProject)(undefined, testUser2),
		]);
		const [personalProject1, personalProject2, personalProject3] = await Promise.all([
			(0, backend_test_utils_1.getPersonalProject)(testUser1),
			(0, backend_test_utils_1.getPersonalProject)(testUser2),
			(0, backend_test_utils_1.getPersonalProject)(testUser3),
		]);
		const resp = await testServer.authAgentFor(testUser1).get('/projects/my-projects').expect(200);
		const respProjects = resp.body.data;
		expect(respProjects.length).toBe(2);
		const projectsExpected = [
			[
				personalProject1,
				{
					role: 'project:personalOwner',
					scopes: ['project:list', 'project:read', 'credential:create'],
				},
			],
			[
				teamProject1,
				{
					role: 'project:admin',
					scopes: [
						'project:list',
						'project:read',
						'project:update',
						'project:delete',
						'credential:create',
					],
				},
			],
		];
		for (const [project, expected] of projectsExpected) {
			const p = respProjects.find((p) => p.id === project.id);
			expect(p.role).toBe(expected.role);
			expect(expected.scopes.every((s) => p.scopes?.includes(s))).toBe(true);
		}
		expect(respProjects).not.toContainEqual(expect.objectContaining({ id: personalProject2.id }));
		expect(respProjects).not.toContainEqual(expect.objectContaining({ id: personalProject3.id }));
		expect(respProjects).not.toContainEqual(expect.objectContaining({ id: teamProject2.id }));
	});
	test('owner should get all projects they are apart of', async () => {
		const [ownerUser, testUser1, testUser2, testUser3] = await Promise.all([
			(0, users_1.createOwner)(),
			(0, users_1.createUser)(),
			(0, users_1.createUser)(),
			(0, users_1.createUser)(),
		]);
		const [teamProject1, teamProject2, teamProject3, teamProject4] = await Promise.all([
			(0, backend_test_utils_1.createTeamProject)(undefined, testUser1),
			(0, backend_test_utils_1.createTeamProject)(undefined, ownerUser),
			(0, backend_test_utils_1.createTeamProject)(undefined, testUser2),
			(0, backend_test_utils_1.createTeamProject)(),
		]);
		await (0, backend_test_utils_1.linkUserToProject)(ownerUser, teamProject3, 'project:editor');
		const [ownerProject, personalProject1, personalProject2, personalProject3] = await Promise.all([
			(0, backend_test_utils_1.getPersonalProject)(ownerUser),
			(0, backend_test_utils_1.getPersonalProject)(testUser1),
			(0, backend_test_utils_1.getPersonalProject)(testUser2),
			(0, backend_test_utils_1.getPersonalProject)(testUser3),
		]);
		const resp = await testServer.authAgentFor(ownerUser).get('/projects/my-projects').expect(200);
		const respProjects = resp.body.data;
		expect(respProjects.length).toBe(5);
		const projectsExpected = [
			[
				ownerProject,
				{
					role: 'project:personalOwner',
					scopes: [
						'project:list',
						'project:create',
						'project:read',
						'project:update',
						'project:delete',
						'credential:create',
					],
				},
			],
			[
				teamProject1,
				{
					role: 'global:owner',
					scopes: [
						'project:list',
						'project:create',
						'project:read',
						'project:update',
						'project:delete',
						'credential:create',
					],
				},
			],
			[
				teamProject2,
				{
					role: 'project:admin',
					scopes: [
						'project:list',
						'project:create',
						'project:read',
						'project:update',
						'project:delete',
						'credential:create',
					],
				},
			],
			[
				teamProject3,
				{
					role: 'project:editor',
					scopes: [
						'project:list',
						'project:create',
						'project:read',
						'project:update',
						'project:delete',
						'credential:create',
					],
				},
			],
			[
				teamProject4,
				{
					role: 'global:owner',
					scopes: [
						'project:list',
						'project:create',
						'project:read',
						'project:update',
						'project:delete',
						'credential:create',
					],
				},
			],
		];
		for (const [project, expected] of projectsExpected) {
			const p = respProjects.find((p) => p.id === project.id);
			expect(p.role).toBe(expected.role);
			expect(expected.scopes.every((s) => p.scopes?.includes(s))).toBe(true);
		}
		expect(respProjects).not.toContainEqual(expect.objectContaining({ id: personalProject1.id }));
		expect(respProjects).not.toContainEqual(expect.objectContaining({ id: personalProject2.id }));
		expect(respProjects).not.toContainEqual(expect.objectContaining({ id: personalProject3.id }));
	});
});
describe('GET /projects/personal', () => {
	test("should return the user's personal project", async () => {
		const user = await (0, users_1.createUser)();
		const project = await (0, backend_test_utils_1.getPersonalProject)(user);
		const memberAgent = testServer.authAgentFor(user);
		const resp = await memberAgent.get('/projects/personal');
		expect(resp.status).toBe(200);
		const respProject = resp.body.data;
		expect(respProject.id).toEqual(project.id);
		expect(respProject.scopes).not.toBeUndefined();
	});
	test("should return 404 if user doesn't have a personal project", async () => {
		const user = await (0, users_1.createUser)();
		const project = await (0, backend_test_utils_1.getPersonalProject)(user);
		await backend_test_utils_1.testDb.truncate(['Project']);
		const memberAgent = testServer.authAgentFor(user);
		const resp = await memberAgent.get('/projects/personal');
		expect(resp.status).toBe(404);
		const respProject = resp.body?.data;
		expect(respProject?.id).not.toEqual(project.id);
	});
});
describe('POST /projects/', () => {
	test('should create a team project', async () => {
		const ownerUser = await (0, users_1.createOwner)();
		const ownerAgent = testServer.authAgentFor(ownerUser);
		const resp = await ownerAgent.post('/projects/').send({ name: 'Test Team Project' });
		expect(resp.status).toBe(200);
		const respProject = resp.body.data;
		expect(respProject.name).toEqual('Test Team Project');
		expect(async () => {
			await (0, backend_test_utils_1.findProject)(respProject.id);
		}).not.toThrow();
		expect(resp.body.data.role).toBe('project:admin');
		for (const scope of (0, permissions_1.getRoleScopes)('project:admin')) {
			expect(resp.body.data.scopes).toContain(scope);
		}
	});
	test('should allow to create a team projects if below the quota', async () => {
		testServer.license.setQuota('quota:maxTeamProjects', 1);
		const ownerUser = await (0, users_1.createOwner)();
		const ownerAgent = testServer.authAgentFor(ownerUser);
		await ownerAgent.post('/projects/').send({ name: 'Test Team Project' }).expect(200);
		expect(
			await di_1.Container.get(db_1.ProjectRepository).count({ where: { type: 'team' } }),
		).toBe(1);
	});
	test('should fail to create a team project if at quota', async () => {
		testServer.license.setQuota('quota:maxTeamProjects', 1);
		await Promise.all([(0, backend_test_utils_1.createTeamProject)()]);
		const ownerUser = await (0, users_1.createOwner)();
		const ownerAgent = testServer.authAgentFor(ownerUser);
		await ownerAgent.post('/projects/').send({ name: 'Test Team Project' }).expect(400, {
			code: 400,
			message:
				'Attempted to create a new project but quota is already exhausted. You may have a maximum of 1 team projects.',
		});
		expect(
			await di_1.Container.get(db_1.ProjectRepository).count({ where: { type: 'team' } }),
		).toBe(1);
	});
	test('should fail to create a team project if above the quota', async () => {
		testServer.license.setQuota('quota:maxTeamProjects', 1);
		await Promise.all([
			(0, backend_test_utils_1.createTeamProject)(),
			(0, backend_test_utils_1.createTeamProject)(),
		]);
		const ownerUser = await (0, users_1.createOwner)();
		const ownerAgent = testServer.authAgentFor(ownerUser);
		await ownerAgent.post('/projects/').send({ name: 'Test Team Project' }).expect(400, {
			code: 400,
			message:
				'Attempted to create a new project but quota is already exhausted. You may have a maximum of 1 team projects.',
		});
		expect(
			await di_1.Container.get(db_1.ProjectRepository).count({ where: { type: 'team' } }),
		).toBe(2);
	});
	const globalConfig = di_1.Container.get(config_1.GlobalConfig);
	if (!globalConfig.database.isLegacySqlite) {
		test('should respect the quota when trying to create multiple projects in parallel (no race conditions)', async () => {
			expect(
				await di_1.Container.get(db_1.ProjectRepository).count({ where: { type: 'team' } }),
			).toBe(0);
			const maxTeamProjects = 3;
			testServer.license.setQuota('quota:maxTeamProjects', maxTeamProjects);
			const ownerUser = await (0, users_1.createOwner)();
			const ownerAgent = testServer.authAgentFor(ownerUser);
			await expect(
				di_1.Container.get(db_1.ProjectRepository).count({ where: { type: 'team' } }),
			).resolves.toBe(0);
			await Promise.all([
				ownerAgent.post('/projects/').send({ name: 'Test Team Project 1' }),
				ownerAgent.post('/projects/').send({ name: 'Test Team Project 2' }),
				ownerAgent.post('/projects/').send({ name: 'Test Team Project 3' }),
				ownerAgent.post('/projects/').send({ name: 'Test Team Project 4' }),
				ownerAgent.post('/projects/').send({ name: 'Test Team Project 5' }),
				ownerAgent.post('/projects/').send({ name: 'Test Team Project 6' }),
			]);
			await expect(
				di_1.Container.get(db_1.ProjectRepository).count({ where: { type: 'team' } }),
			).resolves.toBeLessThanOrEqual(maxTeamProjects);
		});
	}
});
describe('PATCH /projects/:projectId', () => {
	test('should update a team project name', async () => {
		const ownerUser = await (0, users_1.createOwner)();
		const ownerAgent = testServer.authAgentFor(ownerUser);
		const teamProject = await (0, backend_test_utils_1.createTeamProject)();
		const resp = await ownerAgent.patch(`/projects/${teamProject.id}`).send({ name: 'New Name' });
		expect(resp.status).toBe(200);
		const updatedProject = await (0, backend_test_utils_1.findProject)(teamProject.id);
		expect(updatedProject.name).toEqual('New Name');
	});
	test('should not allow viewers to edit team project name', async () => {
		const testUser = await (0, users_1.createUser)();
		const teamProject = await (0, backend_test_utils_1.createTeamProject)();
		await (0, backend_test_utils_1.linkUserToProject)(testUser, teamProject, 'project:viewer');
		const memberAgent = testServer.authAgentFor(testUser);
		const resp = await memberAgent.patch(`/projects/${teamProject.id}`).send({ name: 'New Name' });
		expect(resp.status).toBe(403);
		const updatedProject = await (0, backend_test_utils_1.findProject)(teamProject.id);
		expect(updatedProject.name).not.toEqual('New Name');
	});
	test('should not allow owners to edit personal project name', async () => {
		const user = await (0, users_1.createUser)();
		const personalProject = await (0, backend_test_utils_1.getPersonalProject)(user);
		const ownerUser = await (0, users_1.createOwner)();
		const ownerAgent = testServer.authAgentFor(ownerUser);
		const resp = await ownerAgent
			.patch(`/projects/${personalProject.id}`)
			.send({ name: 'New Name' });
		expect(resp.status).toBe(404);
		const updatedProject = await (0, backend_test_utils_1.findProject)(personalProject.id);
		expect(updatedProject.name).not.toEqual('New Name');
	});
	describe('member management', () => {
		test('should add or remove users from a project', async () => {
			const [ownerUser, testUser1, testUser2, testUser3] = await Promise.all([
				(0, users_1.createOwner)(),
				(0, users_1.createUser)(),
				(0, users_1.createUser)(),
				(0, users_1.createUser)(),
			]);
			const [teamProject1, teamProject2] = await Promise.all([
				(0, backend_test_utils_1.createTeamProject)(undefined, testUser1),
				(0, backend_test_utils_1.createTeamProject)(undefined, testUser2),
			]);
			const [credential1, credential2] = await Promise.all([
				(0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
					role: 'credential:owner',
					project: teamProject1,
				}),
				(0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
					role: 'credential:owner',
					project: teamProject2,
				}),
				(0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
					role: 'credential:owner',
					project: teamProject2,
				}),
			]);
			await (0, credentials_1.shareCredentialWithProjects)(credential2, [teamProject1]);
			await (0, backend_test_utils_1.linkUserToProject)(ownerUser, teamProject2, 'project:editor');
			await (0, backend_test_utils_1.linkUserToProject)(testUser2, teamProject2, 'project:editor');
			const memberAgent = testServer.authAgentFor(testUser1);
			const deleteSpy = jest.spyOn(di_1.Container.get(cache_service_1.CacheService), 'deleteMany');
			const resp = await memberAgent.patch(`/projects/${teamProject1.id}`).send({
				name: teamProject1.name,
				relations: [
					{ userId: testUser1.id, role: 'project:admin' },
					{ userId: testUser3.id, role: 'project:editor' },
					{ userId: ownerUser.id, role: 'project:viewer' },
				],
			});
			expect(resp.status).toBe(200);
			expect(deleteSpy).toBeCalledWith([`credential-can-use-secrets:${credential1.id}`]);
			deleteSpy.mockClear();
			const [tp1Relations, tp2Relations] = await Promise.all([
				(0, backend_test_utils_1.getProjectRelations)({ projectId: teamProject1.id }),
				(0, backend_test_utils_1.getProjectRelations)({ projectId: teamProject2.id }),
			]);
			expect(tp1Relations.length).toBe(3);
			expect(tp2Relations.length).toBe(2);
			expect(tp1Relations.find((p) => p.userId === testUser1.id)).not.toBeUndefined();
			expect(tp1Relations.find((p) => p.userId === testUser2.id)).toBeUndefined();
			expect(tp1Relations.find((p) => p.userId === testUser1.id)?.role).toBe('project:admin');
			expect(tp1Relations.find((p) => p.userId === testUser3.id)?.role).toBe('project:editor');
			expect(tp1Relations.find((p) => p.userId === ownerUser.id)?.role).toBe('project:viewer');
			expect(tp2Relations.find((p) => p.userId === testUser2.id)).not.toBeUndefined();
			expect(tp2Relations.find((p) => p.userId === testUser1.id)).toBeUndefined();
			expect(tp2Relations.find((p) => p.userId === testUser2.id)?.role).toBe('project:editor');
			expect(tp2Relations.find((p) => p.userId === ownerUser.id)?.role).toBe('project:editor');
		});
		test.each([['project:viewer'], ['project:editor']])(
			'`%s`s should not be able to add, update or remove users from a project',
			async (role) => {
				const [actor, projectEditor, userToBeInvited] = await Promise.all([
					(0, users_1.createUser)(),
					(0, users_1.createUser)(),
					(0, users_1.createUser)(),
				]);
				const teamProject1 = await (0, backend_test_utils_1.createTeamProject)();
				await (0, backend_test_utils_1.linkUserToProject)(actor, teamProject1, role);
				await (0, backend_test_utils_1.linkUserToProject)(
					projectEditor,
					teamProject1,
					'project:editor',
				);
				const response = await testServer
					.authAgentFor(actor)
					.patch(`/projects/${teamProject1.id}`)
					.send({
						name: teamProject1.name,
						relations: [
							{ userId: actor.id, role: 'project:admin' },
							{ userId: userToBeInvited.id, role: 'project:editor' },
						],
					});
				expect(response.status).toBe(403);
				expect(response.body).toMatchObject({
					message: 'User is missing a scope required to perform this action',
				});
				const tp1Relations = await (0, backend_test_utils_1.getProjectRelations)({
					projectId: teamProject1.id,
				});
				expect(tp1Relations.length).toBe(2);
				expect(tp1Relations).toMatchObject(
					expect.arrayContaining([
						expect.objectContaining({ userId: actor.id, role }),
						expect.objectContaining({ userId: projectEditor.id, role: 'project:editor' }),
					]),
				);
			},
		);
		test.each([
			['project:viewer', 'feat:projectRole:viewer'],
			['project:editor', 'feat:projectRole:editor'],
		])(
			"should not be able to add a user with the role %s if it's not licensed",
			async (role, feature) => {
				testServer.license.disable(feature);
				const [projectAdmin, userToBeInvited] = await Promise.all([
					(0, users_1.createUser)(),
					(0, users_1.createUser)(),
				]);
				const teamProject = await (0, backend_test_utils_1.createTeamProject)(
					'Team Project',
					projectAdmin,
				);
				await testServer
					.authAgentFor(projectAdmin)
					.patch(`/projects/${teamProject.id}`)
					.send({
						name: teamProject.name,
						relations: [
							{ userId: projectAdmin.id, role: 'project:admin' },
							{ userId: userToBeInvited.id, role },
						],
					})
					.expect(400);
				const tpRelations = await (0, backend_test_utils_1.getProjectRelations)({
					projectId: teamProject.id,
				});
				expect(tpRelations.length).toBe(1);
				expect(tpRelations).toMatchObject(
					expect.arrayContaining([
						expect.objectContaining({ userId: projectAdmin.id, role: 'project:admin' }),
					]),
				);
			},
		);
		test("should not edit a relation of a project when changing a user's role to an unlicensed role", async () => {
			testServer.license.disable('feat:projectRole:editor');
			const [testUser1, testUser2, testUser3] = await Promise.all([
				(0, users_1.createUser)(),
				(0, users_1.createUser)(),
				(0, users_1.createUser)(),
			]);
			const teamProject = await (0, backend_test_utils_1.createTeamProject)(undefined, testUser2);
			await (0, backend_test_utils_1.linkUserToProject)(testUser1, teamProject, 'project:admin');
			await (0, backend_test_utils_1.linkUserToProject)(testUser3, teamProject, 'project:admin');
			const memberAgent = testServer.authAgentFor(testUser2);
			const resp = await memberAgent.patch(`/projects/${teamProject.id}`).send({
				name: teamProject.name,
				relations: [
					{ userId: testUser2.id, role: 'project:admin' },
					{ userId: testUser1.id, role: 'project:editor' },
					{ userId: testUser3.id, role: 'project:editor' },
				],
			});
			expect(resp.status).toBe(400);
			const tpRelations = await (0, backend_test_utils_1.getProjectRelations)({
				projectId: teamProject.id,
			});
			expect(tpRelations.length).toBe(3);
			expect(tpRelations.find((p) => p.userId === testUser1.id)).not.toBeUndefined();
			expect(tpRelations.find((p) => p.userId === testUser2.id)).not.toBeUndefined();
			expect(tpRelations.find((p) => p.userId === testUser1.id)?.role).toBe('project:admin');
			expect(tpRelations.find((p) => p.userId === testUser2.id)?.role).toBe('project:admin');
			expect(tpRelations.find((p) => p.userId === testUser3.id)?.role).toBe('project:admin');
		});
		test("should  edit a relation of a project when changing a user's role to an licensed role but unlicensed roles are present", async () => {
			testServer.license.disable('feat:projectRole:viewer');
			const [testUser1, testUser2, testUser3] = await Promise.all([
				(0, users_1.createUser)(),
				(0, users_1.createUser)(),
				(0, users_1.createUser)(),
			]);
			const teamProject = await (0, backend_test_utils_1.createTeamProject)(undefined, testUser2);
			await (0, backend_test_utils_1.linkUserToProject)(testUser1, teamProject, 'project:viewer');
			await (0, backend_test_utils_1.linkUserToProject)(testUser3, teamProject, 'project:editor');
			const memberAgent = testServer.authAgentFor(testUser2);
			const resp = await memberAgent.patch(`/projects/${teamProject.id}`).send({
				name: teamProject.name,
				relations: [
					{ userId: testUser1.id, role: 'project:viewer' },
					{ userId: testUser2.id, role: 'project:admin' },
					{ userId: testUser3.id, role: 'project:admin' },
				],
			});
			expect(resp.status).toBe(200);
			const tpRelations = await (0, backend_test_utils_1.getProjectRelations)({
				projectId: teamProject.id,
			});
			expect(tpRelations.length).toBe(3);
			expect(tpRelations.find((p) => p.userId === testUser1.id)).not.toBeUndefined();
			expect(tpRelations.find((p) => p.userId === testUser2.id)).not.toBeUndefined();
			expect(tpRelations.find((p) => p.userId === testUser3.id)).not.toBeUndefined();
			expect(tpRelations.find((p) => p.userId === testUser1.id)?.role).toBe('project:viewer');
			expect(tpRelations.find((p) => p.userId === testUser2.id)?.role).toBe('project:admin');
			expect(tpRelations.find((p) => p.userId === testUser3.id)?.role).toBe('project:admin');
		});
		test('should not add or remove users from a personal project', async () => {
			const [testUser1, testUser2] = await Promise.all([
				(0, users_1.createUser)(),
				(0, users_1.createUser)(),
			]);
			const personalProject = await (0, backend_test_utils_1.getPersonalProject)(testUser1);
			const memberAgent = testServer.authAgentFor(testUser1);
			const resp = await memberAgent.patch(`/projects/${personalProject.id}`).send({
				relations: [
					{ userId: testUser1.id, role: 'project:personalOwner' },
					{ userId: testUser2.id, role: 'project:admin' },
				],
			});
			expect(resp.status).toBe(403);
			const p1Relations = await (0, backend_test_utils_1.getProjectRelations)({
				projectId: personalProject.id,
			});
			expect(p1Relations.length).toBe(1);
		});
	});
});
describe('GET /project/:projectId', () => {
	test('should get project details and relations', async () => {
		const [ownerUser, testUser1, testUser2, _testUser3] = await Promise.all([
			(0, users_1.createOwner)(),
			(0, users_1.createUser)(),
			(0, users_1.createUser)(),
			(0, users_1.createUser)(),
		]);
		const [teamProject1, teamProject2] = await Promise.all([
			(0, backend_test_utils_1.createTeamProject)(undefined, testUser2),
			(0, backend_test_utils_1.createTeamProject)(),
		]);
		await (0, backend_test_utils_1.linkUserToProject)(testUser1, teamProject1, 'project:editor');
		await (0, backend_test_utils_1.linkUserToProject)(ownerUser, teamProject2, 'project:editor');
		await (0, backend_test_utils_1.linkUserToProject)(testUser2, teamProject2, 'project:editor');
		const memberAgent = testServer.authAgentFor(testUser1);
		const resp = await memberAgent.get(`/projects/${teamProject1.id}`);
		expect(resp.status).toBe(200);
		expect(resp.body.data.id).toBe(teamProject1.id);
		expect(resp.body.data.name).toBe(teamProject1.name);
		expect(resp.body.data.relations.length).toBe(2);
		expect(resp.body.data.relations).toContainEqual({
			id: testUser1.id,
			email: testUser1.email,
			firstName: testUser1.firstName,
			lastName: testUser1.lastName,
			role: 'project:editor',
		});
		expect(resp.body.data.relations).toContainEqual({
			id: testUser2.id,
			email: testUser2.email,
			firstName: testUser2.firstName,
			lastName: testUser2.lastName,
			role: 'project:admin',
		});
	});
});
describe('DELETE /project/:projectId', () => {
	test('allows the project:owner to delete a project', async () => {
		const member = await (0, users_1.createMember)();
		const project = await (0, backend_test_utils_1.createTeamProject)(undefined, member);
		await testServer.authAgentFor(member).delete(`/projects/${project.id}`).expect(200);
		const projectInDB = (0, backend_test_utils_1.findProject)(project.id);
		await expect(projectInDB).rejects.toThrowError(typeorm_1.EntityNotFoundError);
	});
	test('allows the instance owner to delete a team project their are not related to', async () => {
		const owner = await (0, users_1.createOwner)();
		const member = await (0, users_1.createMember)();
		const project = await (0, backend_test_utils_1.createTeamProject)(undefined, member);
		await testServer.authAgentFor(owner).delete(`/projects/${project.id}`).expect(200);
		await expect((0, backend_test_utils_1.findProject)(project.id)).rejects.toThrowError(
			typeorm_1.EntityNotFoundError,
		);
	});
	test('does not allow instance members to delete their personal project', async () => {
		const member = await (0, users_1.createMember)();
		const project = await (0, backend_test_utils_1.getPersonalProject)(member);
		await testServer.authAgentFor(member).delete(`/projects/${project.id}`).expect(403);
		const projectInDB = await (0, backend_test_utils_1.findProject)(project.id);
		expect(projectInDB).toHaveProperty('id', project.id);
	});
	test('does not allow instance owners to delete their personal projects', async () => {
		const owner = await (0, users_1.createOwner)();
		const project = await (0, backend_test_utils_1.getPersonalProject)(owner);
		await testServer.authAgentFor(owner).delete(`/projects/${project.id}`).expect(403);
		const projectInDB = await (0, backend_test_utils_1.findProject)(project.id);
		expect(projectInDB).toHaveProperty('id', project.id);
	});
	test.each(['project:editor', 'project:viewer'])(
		'does not allow users with the role %s to delete a project',
		async (role) => {
			const member = await (0, users_1.createMember)();
			const project = await (0, backend_test_utils_1.createTeamProject)();
			await (0, backend_test_utils_1.linkUserToProject)(member, project, role);
			await testServer.authAgentFor(member).delete(`/projects/${project.id}`).expect(403);
			const projectInDB = await (0, backend_test_utils_1.findProject)(project.id);
			expect(projectInDB).toHaveProperty('id', project.id);
		},
	);
	test('deletes all workflows and credentials it owns as well as the sharings into other projects', async () => {
		const member = await (0, users_1.createMember)();
		const otherProject = await (0, backend_test_utils_1.createTeamProject)(undefined, member);
		const sharedWorkflow1 = await (0, backend_test_utils_1.createWorkflow)({}, otherProject);
		const sharedWorkflow2 = await (0, backend_test_utils_1.createWorkflow)({}, otherProject);
		const sharedCredential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				project: otherProject,
				role: 'credential:owner',
			},
		);
		const projectToBeDeleted = await (0, backend_test_utils_1.createTeamProject)(undefined, member);
		const ownedWorkflow = await (0, backend_test_utils_1.createWorkflow)({}, projectToBeDeleted);
		const ownedCredential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				project: projectToBeDeleted,
				role: 'credential:owner',
			},
		);
		await (0, credentials_1.shareCredentialWithProjects)(sharedCredential, [otherProject]);
		await (0, backend_test_utils_1.shareWorkflowWithProjects)(sharedWorkflow1, [
			{ project: otherProject, role: 'workflow:editor' },
		]);
		await (0, backend_test_utils_1.shareWorkflowWithProjects)(sharedWorkflow2, [
			{ project: otherProject, role: 'workflow:editor' },
		]);
		await testServer.authAgentFor(member).delete(`/projects/${projectToBeDeleted.id}`).expect(200);
		await expect((0, workflows_service_1.getWorkflowById)(ownedWorkflow.id)).resolves.toBeNull();
		await expect((0, credentials_1.getCredentialById)(ownedCredential.id)).resolves.toBeNull();
		await expect((0, backend_test_utils_1.findProject)(projectToBeDeleted.id)).rejects.toThrowError(
			typeorm_1.EntityNotFoundError,
		);
		await expect(
			(0, workflows_service_1.getWorkflowById)(sharedWorkflow1.id),
		).resolves.not.toBeNull();
		await expect((0, credentials_1.getCredentialById)(sharedCredential.id)).resolves.not.toBeNull();
		await expect(
			di_1.Container.get(db_1.SharedWorkflowRepository).findOneByOrFail({
				projectId: projectToBeDeleted.id,
				workflowId: sharedWorkflow1.id,
			}),
		).rejects.toThrowError(typeorm_1.EntityNotFoundError);
		await expect(
			di_1.Container.get(db_1.SharedCredentialsRepository).findOneByOrFail({
				projectId: projectToBeDeleted.id,
				credentialsId: sharedCredential.id,
			}),
		).rejects.toThrowError(typeorm_1.EntityNotFoundError);
	});
	test('unshares all workflows and credentials that were shared with the project', async () => {
		const member = await (0, users_1.createMember)();
		const projectToBeDeleted = await (0, backend_test_utils_1.createTeamProject)(undefined, member);
		const ownedWorkflow1 = await (0, backend_test_utils_1.createWorkflow)({}, projectToBeDeleted);
		const ownedWorkflow2 = await (0, backend_test_utils_1.createWorkflow)({}, projectToBeDeleted);
		const ownedCredential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				project: projectToBeDeleted,
				role: 'credential:owner',
			},
		);
		const otherProject = await (0, backend_test_utils_1.createTeamProject)(undefined, member);
		await (0, credentials_1.shareCredentialWithProjects)(ownedCredential, [otherProject]);
		await (0, backend_test_utils_1.shareWorkflowWithProjects)(ownedWorkflow1, [
			{ project: otherProject, role: 'workflow:editor' },
		]);
		await (0, backend_test_utils_1.shareWorkflowWithProjects)(ownedWorkflow2, [
			{ project: otherProject, role: 'workflow:editor' },
		]);
		await testServer.authAgentFor(member).delete(`/projects/${projectToBeDeleted.id}`).expect(200);
		await expect((0, workflows_service_1.getWorkflowById)(ownedWorkflow1.id)).resolves.toBeNull();
		await expect((0, workflows_service_1.getWorkflowById)(ownedWorkflow2.id)).resolves.toBeNull();
		await expect((0, credentials_1.getCredentialById)(ownedCredential.id)).resolves.toBeNull();
		await expect((0, backend_test_utils_1.findProject)(projectToBeDeleted.id)).rejects.toThrowError(
			typeorm_1.EntityNotFoundError,
		);
		await expect(
			di_1.Container.get(db_1.SharedWorkflowRepository).findOneByOrFail({
				projectId: projectToBeDeleted.id,
				workflowId: ownedWorkflow1.id,
			}),
		).rejects.toThrowError(typeorm_1.EntityNotFoundError);
		await expect(
			di_1.Container.get(db_1.SharedWorkflowRepository).findOneByOrFail({
				projectId: projectToBeDeleted.id,
				workflowId: ownedWorkflow2.id,
			}),
		).rejects.toThrowError(typeorm_1.EntityNotFoundError);
		await expect(
			di_1.Container.get(db_1.SharedCredentialsRepository).findOneByOrFail({
				projectId: projectToBeDeleted.id,
				credentialsId: ownedCredential.id,
			}),
		).rejects.toThrowError(typeorm_1.EntityNotFoundError);
	});
	test('deletes the project relations', async () => {
		const member = await (0, users_1.createMember)();
		const editor = await (0, users_1.createMember)();
		const viewer = await (0, users_1.createMember)();
		const project = await (0, backend_test_utils_1.createTeamProject)(undefined, member);
		await (0, backend_test_utils_1.linkUserToProject)(editor, project, 'project:editor');
		await (0, backend_test_utils_1.linkUserToProject)(viewer, project, 'project:viewer');
		await testServer.authAgentFor(member).delete(`/projects/${project.id}`).expect(200);
		await expect(
			di_1.Container.get(db_1.ProjectRelationRepository).findOneByOrFail({
				projectId: project.id,
				userId: member.id,
			}),
		).rejects.toThrowError(typeorm_1.EntityNotFoundError);
		await expect(
			di_1.Container.get(db_1.ProjectRelationRepository).findOneByOrFail({
				projectId: project.id,
				userId: editor.id,
			}),
		).rejects.toThrowError(typeorm_1.EntityNotFoundError);
		await expect(
			di_1.Container.get(db_1.ProjectRelationRepository).findOneByOrFail({
				projectId: project.id,
				userId: viewer.id,
			}),
		).rejects.toThrowError(typeorm_1.EntityNotFoundError);
	});
	test('should fail if the project to delete does not exist', async () => {
		const member = await (0, users_1.createMember)();
		await testServer.authAgentFor(member).delete('/projects/1234').expect(403);
	});
	test('should fail to delete if project to migrate to and the project to delete are the same', async () => {
		const member = await (0, users_1.createMember)();
		const project = await (0, backend_test_utils_1.createTeamProject)(undefined, member);
		await testServer
			.authAgentFor(member)
			.delete(`/projects/${project.id}`)
			.query({ transferId: project.id })
			.expect(400);
	});
	test('does not migrate credentials and projects if the user does not have the permissions to create workflows or credentials in the target project', async () => {
		const member = await (0, users_1.createMember)();
		const projectToBeDeleted = await (0, backend_test_utils_1.createTeamProject)(undefined, member);
		const targetProject = await (0, backend_test_utils_1.createTeamProject)();
		await (0, backend_test_utils_1.linkUserToProject)(member, targetProject, 'project:viewer');
		await testServer
			.authAgentFor(member)
			.delete(`/projects/${projectToBeDeleted.id}`)
			.query({ transferId: targetProject.id })
			.expect(404);
	});
	test('migrates folders, workflows and credentials to another project if `migrateToProject` is passed', async () => {
		const member = await (0, users_1.createMember)();
		const projectToBeDeleted = await (0, backend_test_utils_1.createTeamProject)(undefined, member);
		const targetProject = await (0, backend_test_utils_1.createTeamProject)(undefined, member);
		const otherProject = await (0, backend_test_utils_1.createTeamProject)(undefined, member);
		const ownedCredential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				project: projectToBeDeleted,
				role: 'credential:owner',
			},
		);
		const ownedWorkflow = await (0, backend_test_utils_1.createWorkflow)({}, projectToBeDeleted);
		await (0, credentials_1.shareCredentialWithProjects)(ownedCredential, [otherProject]);
		await (0, backend_test_utils_1.shareWorkflowWithProjects)(ownedWorkflow, [
			{ project: otherProject, role: 'workflow:editor' },
		]);
		await (0, folders_1.createFolder)(projectToBeDeleted, { name: 'folder1' });
		await (0, folders_1.createFolder)(projectToBeDeleted, { name: 'folder2' });
		await (0, folders_1.createFolder)(targetProject, { name: 'folder1' });
		await (0, folders_1.createFolder)(otherProject, { name: 'folder3' });
		await testServer
			.authAgentFor(member)
			.delete(`/projects/${projectToBeDeleted.id}`)
			.query({ transferId: targetProject.id })
			.expect(200);
		await expect((0, backend_test_utils_1.findProject)(projectToBeDeleted.id)).rejects.toThrowError(
			typeorm_1.EntityNotFoundError,
		);
		await expect((0, workflows_service_1.getWorkflowById)(ownedWorkflow.id)).resolves.toBeDefined();
		await expect((0, credentials_1.getCredentialById)(ownedCredential.id)).resolves.toBeDefined();
		await expect(
			di_1.Container.get(db_1.SharedCredentialsRepository).findOneByOrFail({
				credentialsId: ownedCredential.id,
				projectId: targetProject.id,
				role: 'credential:owner',
			}),
		).resolves.toBeDefined();
		await expect(
			di_1.Container.get(db_1.SharedWorkflowRepository).findOneByOrFail({
				workflowId: ownedWorkflow.id,
				projectId: targetProject.id,
				role: 'workflow:owner',
			}),
		).resolves.toBeDefined();
		await expect(
			di_1.Container.get(db_1.SharedWorkflowRepository).findOneByOrFail({
				workflowId: ownedWorkflow.id,
				projectId: otherProject.id,
				role: 'workflow:editor',
			}),
		).resolves.toBeDefined();
		await expect(
			di_1.Container.get(db_1.SharedCredentialsRepository).findOneByOrFail({
				credentialsId: ownedCredential.id,
				projectId: otherProject.id,
				role: 'credential:user',
			}),
		).resolves.toBeDefined();
		const foldersInTargetProject = await di_1.Container.get(db_1.FolderRepository).findBy({
			homeProject: { id: targetProject.id },
		});
		const foldersInDeletedProject = await di_1.Container.get(db_1.FolderRepository).findBy({
			homeProject: { id: projectToBeDeleted.id },
		});
		expect(foldersInDeletedProject).toHaveLength(0);
		expect(foldersInTargetProject).toHaveLength(3);
		expect(foldersInTargetProject.map((f) => f.name)).toEqual(
			expect.arrayContaining(['folder1', 'folder1', 'folder2']),
		);
	});
	test('should upgrade a projects role if the workflow/credential is already shared with it', async () => {
		const member = await (0, users_1.createMember)();
		const project = await (0, backend_test_utils_1.createTeamProject)(undefined, member);
		const credential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				project,
				role: 'credential:owner',
			},
		);
		const workflow = await (0, backend_test_utils_1.createWorkflow)({}, project);
		const projectToMigrateTo = await (0, backend_test_utils_1.createTeamProject)(undefined, member);
		await (0, backend_test_utils_1.shareWorkflowWithProjects)(workflow, [
			{ project: projectToMigrateTo, role: 'workflow:editor' },
		]);
		await (0, credentials_1.shareCredentialWithProjects)(credential, [projectToMigrateTo]);
		await testServer
			.authAgentFor(member)
			.delete(`/projects/${project.id}`)
			.query({ transferId: projectToMigrateTo.id })
			.expect(200);
		await expect(
			di_1.Container.get(db_1.SharedCredentialsRepository).findOneByOrFail({
				credentialsId: credential.id,
				projectId: projectToMigrateTo.id,
				role: 'credential:owner',
			}),
		).resolves.toBeDefined();
		await expect(
			di_1.Container.get(db_1.SharedWorkflowRepository).findOneByOrFail({
				workflowId: workflow.id,
				projectId: projectToMigrateTo.id,
				role: 'workflow:owner',
			}),
		).resolves.toBeDefined();
	});
});
//# sourceMappingURL=project.api.test.js.map
