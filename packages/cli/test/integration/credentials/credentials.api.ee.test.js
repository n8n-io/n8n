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
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const typeorm_1 = require('@n8n/typeorm');
const config_1 = __importDefault(require('@/config'));
const credentials_service_1 = require('@/credentials/credentials.service');
const project_service_ee_1 = require('@/services/project.service.ee');
const email_1 = require('@/user-management/email');
const credentials_1 = require('../shared/db/credentials');
const users_1 = require('../shared/db/users');
const utils = __importStar(require('../shared/utils'));
const testServer = utils.setupTestServer({
	endpointGroups: ['credentials'],
	enabledFeatures: ['feat:sharing'],
	quotas: {
		'quota:maxTeamProjects': -1,
	},
});
let owner;
let admin;
let ownerPersonalProject;
let member;
let memberPersonalProject;
let anotherMember;
let anotherMemberPersonalProject;
let authOwnerAgent;
let authMemberAgent;
let authAnotherMemberAgent;
let saveCredential;
const mailer = (0, backend_test_utils_1.mockInstance)(email_1.UserManagementMailer);
let projectService;
let projectRepository;
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate([
		'SharedCredentials',
		'CredentialsEntity',
		'Project',
		'ProjectRelation',
	]);
	projectRepository = di_1.Container.get(db_1.ProjectRepository);
	projectService = di_1.Container.get(project_service_ee_1.ProjectService);
	owner = await (0, users_1.createOwner)();
	admin = await (0, users_1.createAdmin)();
	ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
	member = await (0, users_1.createUser)({ role: 'global:member' });
	memberPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(member.id);
	anotherMember = await (0, users_1.createUser)({ role: 'global:member' });
	anotherMemberPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
		anotherMember.id,
	);
	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);
	authAnotherMemberAgent = testServer.authAgentFor(anotherMember);
	saveCredential = (0, credentials_1.affixRoleToSaveCredential)('credential:owner');
});
afterEach(() => {
	jest.clearAllMocks();
});
describe('POST /credentials', () => {
	test('project viewers cannot create credentials', async () => {
		const teamProject = await (0, backend_test_utils_1.createTeamProject)();
		await (0, backend_test_utils_1.linkUserToProject)(member, teamProject, 'project:viewer');
		const response = await testServer
			.authAgentFor(member)
			.post('/credentials')
			.send({ ...(0, backend_test_utils_1.randomCredentialPayload)(), projectId: teamProject.id });
		expect(response.statusCode).toBe(400);
		expect(response.body.message).toBe(
			"You don't have the permissions to save the credential in this project.",
		);
	});
});
describe('GET /credentials', () => {
	test('should return all creds for owner', async () => {
		const [member1, member2, member3] = await (0, users_1.createManyUsers)(3, {
			role: 'global:member',
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
		const savedCredential = await saveCredential(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{ user: owner },
		);
		await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), { user: member1 });
		const sharedWith = [member1PersonalProject, member2PersonalProject, member3PersonalProject];
		await (0, credentials_1.shareCredentialWithProjects)(savedCredential, sharedWith);
		const response = await authOwnerAgent.get('/credentials');
		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(2);
		const ownerCredential = response.body.data.find(
			(e) => e.homeProject?.id === ownerPersonalProject.id,
		);
		const memberCredential = response.body.data.find(
			(e) => e.homeProject?.id === member1PersonalProject.id,
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
		const [member1, member2] = await (0, users_1.createManyUsers)(2, {
			role: 'global:member',
		});
		const member1PersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member1.id,
		);
		const member2PersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member2.id,
		);
		await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), { user: member2 });
		const savedMemberCredential = await saveCredential(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: member1,
			},
		);
		await (0, credentials_1.shareCredentialWithUsers)(savedMemberCredential, [member2]);
		const response = await testServer.authAgentFor(member1).get('/credentials');
		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(1);
		const [member1Credential] = response.body.data;
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
		const project1 = await projectService.createTeamProject(member, { name: 'Team Project' });
		await projectService.addUser(project1.id, { userId: anotherMember.id, role: 'project:editor' });
		const credential1 = await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), {
			project: project1,
		});
		const project2 = await projectService.createTeamProject(member, { name: 'Team Project' });
		await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), {
			project: project2,
		});
		const response = await testServer.authAgentFor(anotherMember).get('/credentials');
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
				await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), { user: actor });
				const teamProject = await (0, backend_test_utils_1.createTeamProject)();
				await (0, backend_test_utils_1.linkUserToProject)(actor, teamProject, 'project:viewer');
				const savedCredential = await saveCredential(
					(0, backend_test_utils_1.randomCredentialPayload)(),
					{
						project: teamProject,
					},
				);
				const savedWorkflow = await (0, backend_test_utils_1.createWorkflow)({}, teamProject);
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
				const savedWorkflow = await (0, backend_test_utils_1.createWorkflow)({}, member);
				await (0, backend_test_utils_1.shareWorkflowWithUsers)(savedWorkflow, [anotherMember]);
				const savedCredential = await saveCredential(
					(0, backend_test_utils_1.randomCredentialPayload)(),
					{ user: member },
				);
				const anotherSavedCredential = await saveCredential(
					(0, backend_test_utils_1.randomCredentialPayload)(),
					{
						user: anotherMember,
					},
				);
				await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), { user: owner });
				const teamProject = await (0, backend_test_utils_1.createTeamProject)();
				await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), {
					project: teamProject,
				});
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
			const memberWorkflow = await (0, backend_test_utils_1.createWorkflow)({}, member);
			await (0, backend_test_utils_1.shareWorkflowWithUsers)(memberWorkflow, [owner]);
			const memberCredential = await saveCredential(
				(0, backend_test_utils_1.randomCredentialPayload)(),
				{ user: member },
			);
			const ownerCredential = await saveCredential(
				(0, backend_test_utils_1.randomCredentialPayload)(),
				{ user: owner },
			);
			await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), {
				user: anotherMember,
			});
			const teamProject = await (0, backend_test_utils_1.createTeamProject)();
			await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), {
				project: teamProject,
			});
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
			const memberWorkflow = await (0, backend_test_utils_1.createWorkflow)({}, member);
			await (0, backend_test_utils_1.shareWorkflowWithUsers)(memberWorkflow, [anotherMember]);
			const memberCredential = await saveCredential(
				(0, backend_test_utils_1.randomCredentialPayload)(),
				{ user: member },
			);
			const anotherMemberCredential = await saveCredential(
				(0, backend_test_utils_1.randomCredentialPayload)(),
				{
					user: anotherMember,
				},
			);
			await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), { user: owner });
			const teamProject = await (0, backend_test_utils_1.createTeamProject)();
			await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), {
				project: teamProject,
			});
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
			const memberCredential = await saveCredential(
				(0, backend_test_utils_1.randomCredentialPayload)(),
				{ user: member },
			);
			await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), {
				user: anotherMember,
			});
			await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), { user: owner });
			const teamProject = await (0, backend_test_utils_1.createTeamProject)();
			await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), {
				project: teamProject,
			});
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
		test.each(['workflowId', 'projectId'])(
			'if the global owner owns the workflow it will return all credentials of all personal projects, when using "%s" as the query parameter',
			async (queryParam) => {
				const ownerWorkflow = await (0, backend_test_utils_1.createWorkflow)({}, owner);
				const memberCredential = await saveCredential(
					(0, backend_test_utils_1.randomCredentialPayload)(),
					{ user: member },
				);
				const anotherMemberCredential = await saveCredential(
					(0, backend_test_utils_1.randomCredentialPayload)(),
					{
						user: anotherMember,
					},
				);
				const ownerCredential = await saveCredential(
					(0, backend_test_utils_1.randomCredentialPayload)(),
					{ user: owner },
				);
				const teamProject = await (0, backend_test_utils_1.createTeamProject)();
				await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), {
					project: teamProject,
				});
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
describe('GET /credentials/:id', () => {
	test('project viewers can view credentials', async () => {
		const teamProject = await (0, backend_test_utils_1.createTeamProject)();
		await (0, backend_test_utils_1.linkUserToProject)(member, teamProject, 'project:viewer');
		const savedCredential = await saveCredential(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				project: teamProject,
			},
		);
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
		const savedCredential = await saveCredential(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{ user: owner },
		);
		const firstResponse = await authOwnerAgent.get(`/credentials/${savedCredential.id}`);
		expect(firstResponse.statusCode).toBe(200);
		const firstCredential = firstResponse.body.data;
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
		const credentialService = di_1.Container.get(credentials_service_1.CredentialsService);
		const redactSpy = jest.spyOn(credentialService, 'redact');
		const credential = (0, backend_test_utils_1.randomCredentialPayloadWithOauthTokenData)();
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
		const [member1, member2] = await (0, users_1.createManyUsers)(2, {
			role: 'global:member',
		});
		const member1PersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member1.id,
		);
		const member2PersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member2.id,
		);
		const savedCredential = await saveCredential(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{ user: member1 },
		);
		await (0, credentials_1.shareCredentialWithUsers)(savedCredential, [member2]);
		const response1 = await authOwnerAgent.get(`/credentials/${savedCredential.id}`).expect(200);
		const credential = response1.body.data;
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
		const credential2 = response2.body.data;
		validateMainCredentialData(credential);
		expect(credential2.data).toBeDefined();
		expect(credential2.sharedWithProjects).toHaveLength(1);
	});
	test('should retrieve owned cred for member', async () => {
		const [member1, member2, member3] = await (0, users_1.createManyUsers)(3, {
			role: 'global:member',
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
		const savedCredential = await saveCredential(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{ user: member1 },
		);
		await (0, credentials_1.shareCredentialWithUsers)(savedCredential, [member2, member3]);
		const firstResponse = await authMemberAgent
			.get(`/credentials/${savedCredential.id}`)
			.expect(200);
		const firstCredential = firstResponse.body.data;
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
		const secondCredential = secondResponse.body.data;
		validateMainCredentialData(secondCredential);
		expect(secondCredential.data).toBeDefined();
		expect(secondCredential.sharedWithProjects).toHaveLength(2);
	});
	test('should not retrieve non-owned cred for member', async () => {
		const savedCredential = await saveCredential(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{ user: owner },
		);
		const response = await testServer
			.authAgentFor(member)
			.get(`/credentials/${savedCredential.id}`);
		expect(response.statusCode).toBe(403);
		expect(response.body.data).toBeUndefined();
	});
	test('should return 404 if cred not found', async () => {
		const response = await authOwnerAgent.get('/credentials/789');
		expect(response.statusCode).toBe(404);
		const responseAbc = await authOwnerAgent.get('/credentials/abc');
		expect(responseAbc.statusCode).toBe(404);
		const responseNew = await authOwnerAgent.get('/credentials/new');
		expect(responseNew.statusCode).toBe(200);
	});
});
describe('PATCH /credentials/:id', () => {
	test('project viewer cannot update credentials', async () => {
		const teamProject = await (0, backend_test_utils_1.createTeamProject)('', member);
		await (0, backend_test_utils_1.linkUserToProject)(member, teamProject, 'project:viewer');
		const savedCredential = await saveCredential(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				project: teamProject,
			},
		);
		const response = await testServer
			.authAgentFor(member)
			.patch(`/credentials/${savedCredential.id}`)
			.send({ ...(0, backend_test_utils_1.randomCredentialPayload)() });
		expect(response.statusCode).toBe(403);
		expect(response.body.message).toBe('User is missing a scope required to perform this action');
	});
});
describe('PUT /credentials/:id/share', () => {
	test('should share the credential with the provided userIds and unshare it for missing ones', async () => {
		const savedCredential = await saveCredential(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{ user: owner },
		);
		const [member1, member2, member3, member4, member5] = await (0, users_1.createManyUsers)(5, {
			role: 'global:member',
		});
		const shareWithProjectIds = (
			await Promise.all([
				projectRepository.getPersonalProjectForUserOrFail(member1.id),
				projectRepository.getPersonalProjectForUserOrFail(member2.id),
				projectRepository.getPersonalProjectForUserOrFail(member3.id),
			])
		).map((project) => project.id);
		await (0, credentials_1.shareCredentialWithUsers)(savedCredential, [member4, member5]);
		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: shareWithProjectIds });
		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeUndefined();
		const sharedCredentials = await di_1.Container.get(db_1.SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});
		expect(sharedCredentials.length).toBe(shareWithProjectIds.length + 1);
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
		const [member1, member2, member3] = await (0, users_1.createManyUsers)(3, {
			role: 'global:member',
		});
		const projectIds = (
			await Promise.all([
				projectRepository.getPersonalProjectForUserOrFail(member1.id),
				projectRepository.getPersonalProjectForUserOrFail(member2.id),
				projectRepository.getPersonalProjectForUserOrFail(member3.id),
			])
		).map((project) => project.id);
		const savedCredential = await saveCredential(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{ user: owner },
		);
		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: projectIds });
		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeUndefined();
		const sharedCredentials = await di_1.Container.get(db_1.SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id, projectId: (0, typeorm_1.In)(projectIds) },
		});
		expect(sharedCredentials.length).toBe(projectIds.length);
		sharedCredentials.forEach((sharedCredential) => {
			expect(sharedCredential.role).toBe('credential:user');
		});
		const ownerSharedCredential = await di_1.Container.get(
			db_1.SharedCredentialsRepository,
		).findOneOrFail({
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
		const savedCredential = await saveCredential(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{ user: member },
		);
		await (0, credentials_1.shareCredentialWithUsers)(savedCredential, [anotherMember]);
		const response = await authAnotherMemberAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [ownerPersonalProject.id] });
		expect(response.statusCode).toBe(403);
		const sharedCredentials = await di_1.Container.get(db_1.SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});
		expect(sharedCredentials).toHaveLength(2);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(0);
	});
	test('should respond 403 for non-owned credentials for non-shared members sharing with self', async () => {
		const savedCredential = await saveCredential(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{ user: member },
		);
		const response = await authAnotherMemberAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [anotherMemberPersonalProject.id] });
		expect(response.statusCode).toBe(403);
		const sharedCredentials = await di_1.Container.get(db_1.SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});
		expect(sharedCredentials).toHaveLength(1);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(0);
	});
	test('should respond 403 for non-owned credentials for non-shared members sharing', async () => {
		const savedCredential = await saveCredential(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{ user: member },
		);
		const tempUser = await (0, users_1.createUser)({ role: 'global:member' });
		const tempUserPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			tempUser.id,
		);
		const response = await authAnotherMemberAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [tempUserPersonalProject.id] });
		expect(response.statusCode).toBe(403);
		const sharedCredentials = await di_1.Container.get(db_1.SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});
		expect(sharedCredentials).toHaveLength(1);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(0);
	});
	test('should respond 200 for non-owned credentials for owners', async () => {
		const savedCredential = await saveCredential(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{ user: member },
		);
		await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [anotherMemberPersonalProject.id] })
			.expect(200);
		const sharedCredentials = await di_1.Container.get(db_1.SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});
		expect(sharedCredentials).toHaveLength(2);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(1);
	});
	test('should not ignore pending sharee', async () => {
		const memberShell = await (0, users_1.createUserShell)('global:member');
		const memberShellPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			memberShell.id,
		);
		const savedCredential = await saveCredential(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{ user: owner },
		);
		await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [memberShellPersonalProject.id] })
			.expect(200);
		const sharedCredentials = await di_1.Container.get(db_1.SharedCredentialsRepository).find({
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
		const savedCredential = await saveCredential(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{ user: owner },
		);
		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: ['bce38a11-5e45-4d1c-a9ee-36e4a20ab0fc'] });
		expect(response.statusCode).toBe(200);
		const sharedCredentials = await di_1.Container.get(db_1.SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});
		expect(sharedCredentials).toHaveLength(1);
		expect(sharedCredentials[0].projectId).toBe(ownerPersonalProject.id);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(1);
	});
	test('should ignore sharing with owner project', async () => {
		const project = await projectService.createTeamProject(owner, { name: 'Team Project' });
		const credential = await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), {
			project,
		});
		const response = await authOwnerAgent
			.put(`/credentials/${credential.id}/share`)
			.send({ shareWithIds: [project.id] });
		const sharedCredentials = await di_1.Container.get(db_1.SharedCredentialsRepository).find({
			where: { credentialsId: credential.id },
		});
		expect(response.statusCode).toBe(200);
		expect(sharedCredentials).toHaveLength(1);
		expect(sharedCredentials[0].projectId).toBe(project.id);
		expect(sharedCredentials[0].role).toBe('credential:owner');
	});
	test('should ignore sharing with project that already has it shared', async () => {
		const project = await projectService.createTeamProject(owner, { name: 'Team Project' });
		const credential = await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), {
			project,
		});
		const project2 = await projectService.createTeamProject(owner, { name: 'Team Project 2' });
		await (0, credentials_1.shareCredentialWithProjects)(credential, [project2]);
		const response = await authOwnerAgent
			.put(`/credentials/${credential.id}/share`)
			.send({ shareWithIds: [project2.id] });
		const sharedCredentials = await di_1.Container.get(db_1.SharedCredentialsRepository).find({
			where: { credentialsId: credential.id },
		});
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
		const savedCredential = await saveCredential(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{ user: owner },
		);
		const responses = await Promise.all([
			authOwnerAgent.put(`/credentials/${savedCredential.id}/share`).send(),
			authOwnerAgent.put(`/credentials/${savedCredential.id}/share`).send({ shareWithIds: [1] }),
		]);
		responses.forEach((response) => expect(response.statusCode).toBe(400));
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(0);
	});
	test('should unshare the credential', async () => {
		const savedCredential = await saveCredential(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{ user: owner },
		);
		const [member1, member2] = await (0, users_1.createManyUsers)(2, {
			role: 'global:member',
		});
		await (0, credentials_1.shareCredentialWithUsers)(savedCredential, [member1, member2]);
		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [] });
		expect(response.statusCode).toBe(200);
		const sharedCredentials = await di_1.Container.get(db_1.SharedCredentialsRepository).find({
			where: { credentialsId: savedCredential.id },
		});
		expect(sharedCredentials).toHaveLength(1);
		expect(sharedCredentials[0].projectId).toBe(ownerPersonalProject.id);
		expect(mailer.notifyCredentialsShared).toHaveBeenCalledTimes(1);
	});
	test('should not call internal hooks listener for email sent if emailing is disabled', async () => {
		config_1.default.set('userManagement.emails.mode', '');
		const savedCredential = await saveCredential(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{ user: owner },
		);
		const [member1, member2] = await (0, users_1.createManyUsers)(2, {
			role: 'global:member',
		});
		await (0, credentials_1.shareCredentialWithUsers)(savedCredential, [member1, member2]);
		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [] });
		expect(response.statusCode).toBe(200);
		config_1.default.set('userManagement.emails.mode', 'smtp');
	});
	test('member should be able to share from personal project to team project that member has access to', async () => {
		const savedCredential = await saveCredential(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{ user: member },
		);
		const testProject = await (0, backend_test_utils_1.createTeamProject)();
		await (0, backend_test_utils_1.linkUserToProject)(member, testProject, 'project:editor');
		const response = await authMemberAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [testProject.id] });
		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeUndefined();
		const shares = await (0, credentials_1.getCredentialSharings)(savedCredential);
		const testShare = shares.find((s) => s.projectId === testProject.id);
		expect(testShare).not.toBeUndefined();
		expect(testShare?.role).toBe('credential:user');
	});
	test('member should be able to share from team project to personal project', async () => {
		const testProject = await (0, backend_test_utils_1.createTeamProject)(undefined, member);
		const savedCredential = await saveCredential(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				project: testProject,
			},
		);
		const response = await authMemberAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [anotherMemberPersonalProject.id] });
		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeUndefined();
		const shares = await (0, credentials_1.getCredentialSharings)(savedCredential);
		const testShare = shares.find((s) => s.projectId === anotherMemberPersonalProject.id);
		expect(testShare).not.toBeUndefined();
		expect(testShare?.role).toBe('credential:user');
	});
	test('member should be able to share from team project to team project that member has access to', async () => {
		const testProject = await (0, backend_test_utils_1.createTeamProject)(undefined, member);
		const testProject2 = await (0, backend_test_utils_1.createTeamProject)();
		await (0, backend_test_utils_1.linkUserToProject)(member, testProject2, 'project:editor');
		const savedCredential = await saveCredential(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				project: testProject,
			},
		);
		const response = await authMemberAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [testProject2.id] });
		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeUndefined();
		const shares = await (0, credentials_1.getCredentialSharings)(savedCredential);
		const testShare = shares.find((s) => s.projectId === testProject2.id);
		expect(testShare).not.toBeUndefined();
		expect(testShare?.role).toBe('credential:user');
	});
	test('admins should be able to share from any team project to any team project ', async () => {
		const testProject = await (0, backend_test_utils_1.createTeamProject)();
		const testProject2 = await (0, backend_test_utils_1.createTeamProject)();
		const savedCredential = await saveCredential(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				project: testProject,
			},
		);
		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [testProject2.id] });
		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeUndefined();
		const shares = await (0, credentials_1.getCredentialSharings)(savedCredential);
		const testShare = shares.find((s) => s.projectId === testProject2.id);
		expect(testShare).not.toBeUndefined();
		expect(testShare?.role).toBe('credential:user');
	});
	test("admins should be able to share from any team project to any user's personal project ", async () => {
		const testProject = await (0, backend_test_utils_1.createTeamProject)();
		const savedCredential = await saveCredential(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				project: testProject,
			},
		);
		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [memberPersonalProject.id] });
		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeUndefined();
		const shares = await (0, credentials_1.getCredentialSharings)(savedCredential);
		const testShare = shares.find((s) => s.projectId === memberPersonalProject.id);
		expect(testShare).not.toBeUndefined();
		expect(testShare?.role).toBe('credential:user');
	});
	test('admins should be able to share from any personal project to any team project ', async () => {
		const testProject = await (0, backend_test_utils_1.createTeamProject)();
		const savedCredential = await saveCredential(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: member,
			},
		);
		const response = await authOwnerAgent
			.put(`/credentials/${savedCredential.id}/share`)
			.send({ shareWithIds: [testProject.id] });
		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeUndefined();
		const shares = await (0, credentials_1.getCredentialSharings)(savedCredential);
		const testShare = shares.find((s) => s.projectId === testProject.id);
		expect(testShare).not.toBeUndefined();
		expect(testShare?.role).toBe('credential:user');
	});
});
describe('PUT /:credentialId/transfer', () => {
	test('cannot transfer into the same project', async () => {
		const destinationProject = await (0, backend_test_utils_1.createTeamProject)(
			'Destination Project',
			member,
		);
		const credential = await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), {
			project: destinationProject,
		});
		await testServer
			.authAgentFor(member)
			.put(`/credentials/${credential.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(400);
	});
	test('cannot transfer somebody elses credential', async () => {
		const destinationProject = await (0, backend_test_utils_1.createTeamProject)(
			'Destination Project',
			member,
		);
		const credential = await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), {
			user: anotherMember,
		});
		await testServer
			.authAgentFor(member)
			.put(`/credentials/${credential.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(403);
	});
	test("cannot transfer if you're not a member of the destination project", async () => {
		const credential = await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), {
			user: member,
		});
		const destinationProject = await (0, backend_test_utils_1.createTeamProject)('Team Project');
		await testServer
			.authAgentFor(member)
			.put(`/credentials/${credential.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(404);
	});
	test.each(['project:editor', 'project:viewer'])(
		'%ss cannot transfer credentials',
		async (projectRole) => {
			const sourceProject = await (0, backend_test_utils_1.createTeamProject)('Source Project');
			await (0, backend_test_utils_1.linkUserToProject)(member, sourceProject, projectRole);
			const credential = await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), {
				project: sourceProject,
			});
			const destinationProject = await (0, backend_test_utils_1.createTeamProject)(
				'Destination Project',
				member,
			);
			await testServer
				.authAgentFor(member)
				.put(`/credentials/${credential.id}/transfer`)
				.send({ destinationProjectId: destinationProject.id })
				.expect(403);
		},
	);
	test.each([
		[
			'owners',
			'team',
			'team',
			() => owner,
			async () => await (0, backend_test_utils_1.createTeamProject)('Source Project'),
			async () => await (0, backend_test_utils_1.createTeamProject)('Destination Project'),
		],
		[
			'owners',
			'team',
			'personal',
			() => owner,
			async () => await (0, backend_test_utils_1.createTeamProject)('Source Project'),
			() => memberPersonalProject,
		],
		[
			'owners',
			'personal',
			'team',
			() => owner,
			() => memberPersonalProject,
			async () => await (0, backend_test_utils_1.createTeamProject)('Destination Project'),
		],
		[
			'admins',
			'team',
			'team',
			() => admin,
			async () => await (0, backend_test_utils_1.createTeamProject)('Source Project'),
			async () => await (0, backend_test_utils_1.createTeamProject)('Destination Project'),
		],
		[
			'admins',
			'team',
			'personal',
			() => admin,
			async () => await (0, backend_test_utils_1.createTeamProject)('Source Project'),
			() => memberPersonalProject,
		],
		[
			'admins',
			'personal',
			'team',
			() => admin,
			() => memberPersonalProject,
			async () => await (0, backend_test_utils_1.createTeamProject)('Destination Project'),
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
			const user = getUser();
			const sourceProject = await getSourceProject();
			const destinationProject = await getDestinationProject();
			const credential = await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), {
				project: sourceProject,
			});
			const response = await testServer
				.authAgentFor(user)
				.put(`/credentials/${credential.id}/transfer`)
				.send({ destinationProjectId: destinationProject.id })
				.expect(200);
			expect(response.body).toEqual({});
			{
				const allSharings = await (0, credentials_1.getCredentialSharings)(credential);
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
function validateMainCredentialData(credential) {
	expect(typeof credential.name).toBe('string');
	expect(typeof credential.type).toBe('string');
	expect(credential.homeProject).toBeDefined();
	expect(Array.isArray(credential.sharedWithProjects)).toBe(true);
}
//# sourceMappingURL=credentials.api.ee.test.js.map
