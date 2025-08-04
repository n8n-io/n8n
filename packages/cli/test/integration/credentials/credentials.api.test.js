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
const a = __importStar(require('assert'));
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const constants_1 = require('@/constants');
const credentials_service_1 = require('@/credentials/credentials.service');
const credentials_tester_service_1 = require('@/services/credentials-tester.service');
const credentials_1 = require('../shared/db/credentials');
const users_1 = require('../shared/db/users');
const utils_1 = require('../shared/utils');
const { any } = expect;
const testServer = (0, utils_1.setupTestServer)({ endpointGroups: ['credentials'] });
let owner;
let member;
let admin;
let secondMember;
let ownerPersonalProject;
let memberPersonalProject;
let authOwnerAgent;
let authMemberAgent;
let authAdminAgent;
let projectRepository;
let sharedCredentialsRepository;
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate(['SharedCredentials', 'CredentialsEntity']);
	owner = await (0, users_1.createOwner)();
	member = await (0, users_1.createMember)();
	admin = await (0, users_1.createAdmin)();
	secondMember = await (0, users_1.createMember)();
	ownerPersonalProject = await di_1.Container.get(
		db_1.ProjectRepository,
	).getPersonalProjectForUserOrFail(owner.id);
	memberPersonalProject = await di_1.Container.get(
		db_1.ProjectRepository,
	).getPersonalProjectForUserOrFail(member.id);
	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);
	authAdminAgent = testServer.authAgentFor(admin);
	projectRepository = di_1.Container.get(db_1.ProjectRepository);
	sharedCredentialsRepository = di_1.Container.get(db_1.SharedCredentialsRepository);
});
describe('GET /credentials', () => {
	test('should return all creds for owner', async () => {
		const [{ id: savedOwnerCredentialId }, { id: savedMemberCredentialId }] = await Promise.all([
			(0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				user: owner,
				role: 'credential:owner',
			}),
			(0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				user: member,
				role: 'credential:owner',
			}),
		]);
		const response = await authOwnerAgent.get('/credentials');
		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(2);
		const savedCredentialsIds = [savedOwnerCredentialId, savedMemberCredentialId];
		response.body.data.forEach((credential) => {
			validateMainCredentialData(credential);
			expect('data' in credential).toBe(false);
			expect(savedCredentialsIds).toContain(credential.id);
			expect('isManaged' in credential).toBe(true);
		});
	});
	test('should return only own creds for member', async () => {
		const [member1, member2] = await (0, users_1.createManyUsers)(2, {
			role: 'global:member',
		});
		const [savedCredential1] = await Promise.all([
			(0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				user: member1,
				role: 'credential:owner',
			}),
			(0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				user: member2,
				role: 'credential:owner',
			}),
		]);
		const response = await testServer.authAgentFor(member1).get('/credentials');
		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(1);
		const [member1Credential] = response.body.data;
		validateMainCredentialData(member1Credential);
		expect(member1Credential.data).toBeUndefined();
		expect(member1Credential.id).toBe(savedCredential1.id);
	});
	test('should return scopes when ?includeScopes=true', async () => {
		const [member1, member2] = await (0, users_1.createManyUsers)(2, {
			role: 'global:member',
		});
		const teamProject = await (0, backend_test_utils_1.createTeamProject)(undefined, member1);
		await (0, backend_test_utils_1.linkUserToProject)(member2, teamProject, 'project:editor');
		const [savedCredential1, savedCredential2] = await Promise.all([
			(0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				project: teamProject,
				role: 'credential:owner',
			}),
			(0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				user: member2,
				role: 'credential:owner',
			}),
		]);
		await (0, credentials_1.shareCredentialWithProjects)(savedCredential2, [teamProject]);
		{
			const response = await testServer
				.authAgentFor(member1)
				.get('/credentials?includeScopes=true');
			expect(response.statusCode).toBe(200);
			expect(response.body.data.length).toBe(2);
			const creds = response.body.data;
			const cred1 = creds.find((c) => c.id === savedCredential1.id);
			const cred2 = creds.find((c) => c.id === savedCredential2.id);
			expect(cred1.id).toBe(savedCredential1.id);
			expect(cred1.scopes).toEqual(
				[
					'credential:move',
					'credential:read',
					'credential:update',
					'credential:share',
					'credential:delete',
				].sort(),
			);
			expect(cred2.id).toBe(savedCredential2.id);
			expect(cred2.scopes).toEqual(['credential:read']);
		}
		{
			const response = await testServer
				.authAgentFor(member2)
				.get('/credentials?includeScopes=true');
			expect(response.statusCode).toBe(200);
			expect(response.body.data.length).toBe(2);
			const creds = response.body.data;
			const cred1 = creds.find((c) => c.id === savedCredential1.id);
			const cred2 = creds.find((c) => c.id === savedCredential2.id);
			expect(cred1.id).toBe(savedCredential1.id);
			expect(cred1.scopes).toEqual(['credential:delete', 'credential:read', 'credential:update']);
			expect(cred2.id).toBe(savedCredential2.id);
			expect(cred2.scopes).toEqual(
				[
					'credential:delete',
					'credential:move',
					'credential:read',
					'credential:share',
					'credential:update',
				].sort(),
			);
		}
		{
			const response = await testServer.authAgentFor(owner).get('/credentials?includeScopes=true');
			expect(response.statusCode).toBe(200);
			expect(response.body.data.length).toBe(2);
			const creds = response.body.data;
			const cred1 = creds.find((c) => c.id === savedCredential1.id);
			const cred2 = creds.find((c) => c.id === savedCredential2.id);
			expect(cred1.id).toBe(savedCredential1.id);
			expect(cred1.scopes).toEqual(
				[
					'credential:create',
					'credential:delete',
					'credential:list',
					'credential:move',
					'credential:read',
					'credential:share',
					'credential:update',
				].sort(),
			);
			expect(cred2.id).toBe(savedCredential2.id);
			expect(cred2.scopes).toEqual(
				[
					'credential:create',
					'credential:delete',
					'credential:list',
					'credential:move',
					'credential:read',
					'credential:share',
					'credential:update',
				].sort(),
			);
		}
	});
	test('should return data when ?includeData=true', async () => {
		const [actor, otherMember] = await (0, users_1.createManyUsers)(2, {
			role: 'global:member',
		});
		const teamProjectViewer = await (0, backend_test_utils_1.createTeamProject)(undefined);
		await (0, backend_test_utils_1.linkUserToProject)(actor, teamProjectViewer, 'project:viewer');
		const teamProjectEditor = await (0, backend_test_utils_1.createTeamProject)(undefined);
		await (0, backend_test_utils_1.linkUserToProject)(actor, teamProjectEditor, 'project:editor');
		const [ownedCredential, sharedCredential, teamCredentialAsViewer, teamCredentialAsEditor] =
			await Promise.all([
				(0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
					user: actor,
					role: 'credential:owner',
				}),
				(0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
					user: otherMember,
					role: 'credential:owner',
				}),
				(0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
					project: teamProjectViewer,
					role: 'credential:owner',
				}),
				(0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
					project: teamProjectEditor,
					role: 'credential:owner',
				}),
			]);
		await (0, credentials_1.shareCredentialWithUsers)(sharedCredential, [actor]);
		const response = await testServer
			.authAgentFor(actor)
			.get('/credentials')
			.query({ includeData: true });
		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(4);
		const creds = response.body.data;
		const ownedCred = creds.find((c) => c.id === ownedCredential.id);
		const sharedCred = creds.find((c) => c.id === sharedCredential.id);
		const teamCredAsViewer = creds.find((c) => c.id === teamCredentialAsViewer.id);
		const teamCredAsEditor = creds.find((c) => c.id === teamCredentialAsEditor.id);
		expect(ownedCred.id).toBe(ownedCredential.id);
		expect(ownedCred.data).toBeDefined();
		expect(ownedCred.scopes).toEqual(
			[
				'credential:move',
				'credential:read',
				'credential:update',
				'credential:share',
				'credential:delete',
			].sort(),
		);
		expect(sharedCred.id).toBe(sharedCredential.id);
		expect(sharedCred.data).not.toBeDefined();
		expect(sharedCred.scopes).toEqual(['credential:read'].sort());
		expect(teamCredAsViewer.id).toBe(teamCredentialAsViewer.id);
		expect(teamCredAsViewer.data).not.toBeDefined();
		expect(teamCredAsViewer.scopes).toEqual(['credential:read'].sort());
		expect(teamCredAsEditor.id).toBe(teamCredentialAsEditor.id);
		expect(teamCredAsEditor.data).toBeDefined();
		expect(teamCredAsEditor.scopes).toEqual(
			['credential:read', 'credential:update', 'credential:delete'].sort(),
		);
	});
	test('should return data when ?includeData=true for owners', async () => {
		const teamProjectViewer = await (0, backend_test_utils_1.createTeamProject)(undefined);
		const [ownedCredential, sharedCredential, teamCredentialAsViewer] = await Promise.all([
			(0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				user: owner,
				role: 'credential:owner',
			}),
			(0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				user: member,
				role: 'credential:owner',
			}),
			(0, credentials_1.saveCredential)(
				(0, backend_test_utils_1.randomCredentialPayloadWithOauthTokenData)(),
				{
					project: teamProjectViewer,
					role: 'credential:owner',
				},
			),
		]);
		const response = await testServer
			.authAgentFor(owner)
			.get('/credentials')
			.query({ includeData: true });
		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(3);
		const creds = response.body.data;
		const ownedCred = creds.find((c) => c.id === ownedCredential.id);
		const sharedCred = creds.find((c) => c.id === sharedCredential.id);
		const teamCredAsViewer = creds.find((c) => c.id === teamCredentialAsViewer.id);
		expect(ownedCred.id).toBe(ownedCredential.id);
		expect(ownedCred.data).toBeDefined();
		expect(ownedCred.scopes).toEqual(
			[
				'credential:move',
				'credential:read',
				'credential:update',
				'credential:share',
				'credential:delete',
				'credential:create',
				'credential:list',
			].sort(),
		);
		expect(sharedCred.id).toBe(sharedCredential.id);
		expect(sharedCred.data).toBeDefined();
		expect(sharedCred.scopes).toEqual(
			[
				'credential:move',
				'credential:read',
				'credential:update',
				'credential:share',
				'credential:delete',
				'credential:create',
				'credential:list',
			].sort(),
		);
		expect(teamCredAsViewer.id).toBe(teamCredentialAsViewer.id);
		expect(teamCredAsViewer.data).toBeDefined();
		expect(teamCredAsViewer.data.oauthTokenData).toBe(true);
		expect(teamCredAsViewer.scopes).toEqual(
			[
				'credential:move',
				'credential:read',
				'credential:update',
				'credential:share',
				'credential:delete',
				'credential:create',
				'credential:list',
			].sort(),
		);
	});
	describe('should return', () => {
		test('all credentials for owner', async () => {
			const { id: id1 } = await (0, credentials_1.saveCredential)(
				(0, backend_test_utils_1.randomCredentialPayload)(),
				{
					user: owner,
					role: 'credential:owner',
				},
			);
			const { id: id2 } = await (0, credentials_1.saveCredential)(
				(0, backend_test_utils_1.randomCredentialPayload)(),
				{
					user: member,
					role: 'credential:owner',
				},
			);
			const response = await testServer.authAgentFor(owner).get('/credentials').expect(200);
			expect(response.body.data).toHaveLength(2);
			response.body.data.forEach(validateCredentialWithNoData);
			const savedIds = [id1, id2].sort();
			const returnedIds = response.body.data.map((c) => c.id).sort();
			expect(savedIds).toEqual(returnedIds);
		});
		test('only own credentials for member', async () => {
			const firstMember = member;
			const secondMember = await (0, users_1.createMember)();
			const c1 = await (0, credentials_1.saveCredential)(
				(0, backend_test_utils_1.randomCredentialPayload)(),
				{ user: firstMember, role: 'credential:owner' },
			);
			const c2 = await (0, credentials_1.saveCredential)(
				(0, backend_test_utils_1.randomCredentialPayload)(),
				{ user: secondMember, role: 'credential:owner' },
			);
			const response = await testServer.authAgentFor(firstMember).get('/credentials').expect(200);
			expect(response.body.data).toHaveLength(1);
			const [firstMemberCred] = response.body.data;
			validateCredentialWithNoData(firstMemberCred);
			expect(firstMemberCred.id).toBe(c1.id);
			expect(firstMemberCred.id).not.toBe(c2.id);
		});
	});
	describe('filter', () => {
		test('should filter credentials by field: name - full match', async () => {
			const savedCred = await (0, credentials_1.saveCredential)(
				(0, backend_test_utils_1.randomCredentialPayload)(),
				{ user: owner, role: 'credential:owner' },
			);
			const response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query(`filter={ "name": "${savedCred.name}" }`)
				.expect(200);
			expect(response.body.data).toHaveLength(1);
			const [returnedCred] = response.body.data;
			expect(returnedCred.name).toBe(savedCred.name);
			const _response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('filter={ "name": "Non-Existing Credential" }')
				.expect(200);
			expect(_response.body.data).toHaveLength(0);
		});
		test('should filter credentials by field: name - partial match', async () => {
			const savedCred = await (0, credentials_1.saveCredential)(
				(0, backend_test_utils_1.randomCredentialPayload)(),
				{ user: owner, role: 'credential:owner' },
			);
			const partialName = savedCred.name.slice(3);
			const response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query(`filter={ "name": "${partialName}" }`)
				.expect(200);
			expect(response.body.data).toHaveLength(1);
			const [returnedCred] = response.body.data;
			expect(returnedCred.name).toBe(savedCred.name);
			const _response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('filter={ "name": "Non-Existing Credential" }')
				.expect(200);
			expect(_response.body.data).toHaveLength(0);
		});
		test('should filter credentials by field: type - full match', async () => {
			const savedCred = await (0, credentials_1.saveCredential)(
				(0, backend_test_utils_1.randomCredentialPayload)(),
				{ user: owner, role: 'credential:owner' },
			);
			const response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query(`filter={ "type": "${savedCred.type}" }`)
				.expect(200);
			expect(response.body.data).toHaveLength(1);
			const [returnedCred] = response.body.data;
			expect(returnedCred.type).toBe(savedCred.type);
			const _response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('filter={ "type": "Non-Existing Credential" }')
				.expect(200);
			expect(_response.body.data).toHaveLength(0);
		});
		test('should filter credentials by field: type - partial match', async () => {
			const savedCred = await (0, credentials_1.saveCredential)(
				(0, backend_test_utils_1.randomCredentialPayload)(),
				{ user: owner, role: 'credential:owner' },
			);
			const partialType = savedCred.type.slice(3);
			const response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query(`filter={ "type": "${partialType}" }`)
				.expect(200);
			expect(response.body.data).toHaveLength(1);
			const [returnedCred] = response.body.data;
			expect(returnedCred.type).toBe(savedCred.type);
			const _response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('filter={ "type": "Non-Existing Credential" }')
				.expect(200);
			expect(_response.body.data).toHaveLength(0);
		});
		test('should filter credentials by projectId', async () => {
			const credential = await (0, credentials_1.saveCredential)(
				(0, backend_test_utils_1.randomCredentialPayload)(),
				{ user: owner, role: 'credential:owner' },
			);
			const response1 = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query(`filter={ "projectId": "${ownerPersonalProject.id}" }`)
				.expect(200);
			expect(response1.body.data).toHaveLength(1);
			expect(response1.body.data[0].id).toBe(credential.id);
			const response2 = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('filter={ "projectId": "Non-Existing Project ID" }')
				.expect(200);
			expect(response2.body.data).toHaveLength(0);
		});
		test('should return homeProject when filtering credentials by projectId', async () => {
			const project = await (0, backend_test_utils_1.createTeamProject)(undefined, member);
			const credential = await (0, credentials_1.saveCredential)(
				(0, backend_test_utils_1.randomCredentialPayload)(),
				{ user: owner, role: 'credential:owner' },
			);
			await (0, credentials_1.shareCredentialWithProjects)(credential, [project]);
			const response = await testServer
				.authAgentFor(member)
				.get('/credentials')
				.query(`filter={ "projectId": "${project.id}" }`)
				.expect(200);
			expect(response.body.data).toHaveLength(1);
			expect(response.body.data[0].homeProject).not.toBeNull();
		});
		test('should return all credentials in a team project that member is part of', async () => {
			const teamProjectWithMember = await (0, backend_test_utils_1.createTeamProject)(
				'Team Project With member',
				owner,
			);
			void (await (0, backend_test_utils_1.linkUserToProject)(
				member,
				teamProjectWithMember,
				'project:editor',
			));
			await (0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				project: teamProjectWithMember,
				role: 'credential:owner',
			});
			await (0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				project: teamProjectWithMember,
				role: 'credential:owner',
			});
			const response = await testServer
				.authAgentFor(member)
				.get('/credentials')
				.query(`filter={ "projectId": "${teamProjectWithMember.id}" }`)
				.expect(200);
			expect(response.body.data).toHaveLength(2);
		});
		test('should return no credentials in a team project that member not is part of', async () => {
			const teamProjectWithoutMember = await (0, backend_test_utils_1.createTeamProject)(
				'Team Project Without member',
				owner,
			);
			await (0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				project: teamProjectWithoutMember,
				role: 'credential:owner',
			});
			const response = await testServer
				.authAgentFor(member)
				.get('/credentials')
				.query(`filter={ "projectId": "${teamProjectWithoutMember.id}" }`)
				.expect(200);
			expect(response.body.data).toHaveLength(0);
		});
		test('should return only owned credentials when filtering by owner personal project id', async () => {
			const ownerCredential = await (0, credentials_1.saveCredential)(
				(0, backend_test_utils_1.randomCredentialPayload)(),
				{
					user: owner,
					role: 'credential:owner',
				},
			);
			const memberCredential = await (0, credentials_1.saveCredential)(
				(0, backend_test_utils_1.randomCredentialPayload)(),
				{
					user: member,
					role: 'credential:owner',
				},
			);
			await (0, credentials_1.shareCredentialWithUsers)(memberCredential, [owner]);
			const response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query(`filter={ "projectId": "${ownerPersonalProject.id}" }`)
				.expect(200);
			expect(response.body.data).toHaveLength(1);
			expect(response.body.data.map((credential) => credential.id)).toContain(ownerCredential.id);
		});
		test('should return only owned credentials when filtering by member personal project id', async () => {
			const memberCredential = await (0, credentials_1.saveCredential)(
				(0, backend_test_utils_1.randomCredentialPayload)(),
				{
					user: member,
					role: 'credential:owner',
				},
			);
			const ownerCredential = await (0, credentials_1.saveCredential)(
				(0, backend_test_utils_1.randomCredentialPayload)(),
				{
					user: owner,
					role: 'credential:owner',
				},
			);
			await (0, credentials_1.shareCredentialWithUsers)(ownerCredential, [member]);
			const response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query(`filter={ "projectId": "${memberPersonalProject.id}" }`)
				.expect(200);
			expect(response.body.data).toHaveLength(1);
			expect(response.body.data.map((credential) => credential.id)).toContain(memberCredential.id);
		});
		test('should not ignore the project filter when the request is done by an owner and also includes the scopes', async () => {
			const ownerCredential = await (0, credentials_1.saveCredential)(
				(0, backend_test_utils_1.randomCredentialPayload)(),
				{
					user: owner,
					role: 'credential:owner',
				},
			);
			await (0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				user: member,
				role: 'credential:owner',
			});
			const response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query({
					filter: JSON.stringify({ projectId: ownerPersonalProject.id }),
					includeScopes: true,
				})
				.expect(200);
			expect(response.body.data).toHaveLength(1);
			expect(response.body.data[0].id).toBe(ownerCredential.id);
		});
	});
	describe('select', () => {
		test('should select credential field: id', async () => {
			await (0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				user: owner,
				role: 'credential:owner',
			});
			await (0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				user: owner,
				role: 'credential:owner',
			});
			const response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('select=["id"]')
				.expect(200);
			expect(response.body).toEqual({
				data: [{ id: any(String) }, { id: any(String) }],
			});
		});
		test('should select credential field: name', async () => {
			await (0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				user: owner,
				role: 'credential:owner',
			});
			await (0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				user: owner,
				role: 'credential:owner',
			});
			const response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('select=["name"]')
				.expect(200);
			expect(response.body).toEqual({
				data: [{ name: any(String) }, { name: any(String) }],
			});
		});
		test('should select credential field: type', async () => {
			await (0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				user: owner,
				role: 'credential:owner',
			});
			await (0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				user: owner,
				role: 'credential:owner',
			});
			const response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('select=["type"]')
				.expect(200);
			expect(response.body).toEqual({
				data: [{ type: any(String) }, { type: any(String) }],
			});
		});
	});
	describe('take', () => {
		test('should return n credentials or less, without skip', async () => {
			await (0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				user: owner,
				role: 'credential:owner',
			});
			await (0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				user: owner,
				role: 'credential:owner',
			});
			const response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('take=2')
				.expect(200);
			expect(response.body.data).toHaveLength(2);
			response.body.data.forEach(validateCredentialWithNoData);
			const _response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('take=1')
				.expect(200);
			expect(_response.body.data).toHaveLength(1);
			_response.body.data.forEach(validateCredentialWithNoData);
		});
		test('should return n credentials or less, with skip', async () => {
			await (0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				user: owner,
				role: 'credential:owner',
			});
			await (0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				user: owner,
				role: 'credential:owner',
			});
			const response = await testServer
				.authAgentFor(owner)
				.get('/credentials')
				.query('take=1&skip=1')
				.expect(200);
			expect(response.body.data).toHaveLength(1);
			response.body.data.forEach(validateCredentialWithNoData);
		});
	});
});
describe('POST /credentials', () => {
	test('should create cred', async () => {
		const payload = (0, backend_test_utils_1.randomCredentialPayload)();
		const response = await authMemberAgent.post('/credentials').send(payload);
		expect(response.statusCode).toBe(200);
		const { id, name, type, data: encryptedData, scopes } = response.body.data;
		expect(name).toBe(payload.name);
		expect(type).toBe(payload.type);
		expect(encryptedData).not.toBe(payload.data);
		expect(scopes).toEqual(
			[
				'credential:delete',
				'credential:move',
				'credential:read',
				'credential:share',
				'credential:update',
			].sort(),
		);
		const credential = await (0, credentials_1.getCredentialById)(id);
		a.ok(credential);
		expect(credential.name).toBe(payload.name);
		expect(credential.type).toBe(payload.type);
		expect(await (0, credentials_1.decryptCredentialData)(credential)).toStrictEqual(payload.data);
		const sharedCredential = await di_1.Container.get(
			db_1.SharedCredentialsRepository,
		).findOneOrFail({
			relations: { project: true, credentials: true },
			where: { credentialsId: credential.id },
		});
		expect(sharedCredential.project.id).toBe(memberPersonalProject.id);
		expect(sharedCredential.credentials.name).toBe(payload.name);
	});
	test('should fail with invalid inputs', async () => {
		for (const invalidPayload of INVALID_PAYLOADS) {
			const response = await authOwnerAgent.post('/credentials').send(invalidPayload);
			expect(response.statusCode).toBe(400);
		}
	});
	test('should ignore ID in payload', async () => {
		const firstResponse = await authOwnerAgent
			.post('/credentials')
			.send({ id: '8', ...(0, backend_test_utils_1.randomCredentialPayload)() });
		expect(firstResponse.body.data.id).not.toBe('8');
		const secondResponse = await authOwnerAgent
			.post('/credentials')
			.send({ id: 8, ...(0, backend_test_utils_1.randomCredentialPayload)() });
		expect(secondResponse.body.data.id).not.toBe(8);
	});
	test('creates credential in personal project by default', async () => {
		const response = await authOwnerAgent
			.post('/credentials')
			.send((0, backend_test_utils_1.randomCredentialPayload)());
		await sharedCredentialsRepository.findOneByOrFail({
			projectId: ownerPersonalProject.id,
			credentialsId: response.body.data.id,
		});
	});
	test('creates credential in a specific project if the projectId is passed', async () => {
		const project = await (0, backend_test_utils_1.createTeamProject)('Team Project', owner);
		const response = await authOwnerAgent
			.post('/credentials')
			.send({ ...(0, backend_test_utils_1.randomCredentialPayload)(), projectId: project.id });
		await sharedCredentialsRepository.findOneByOrFail({
			projectId: project.id,
			credentialsId: response.body.data.id,
		});
	});
	test('does not create the credential in a specific project if the user is not part of the project', async () => {
		const project = await projectRepository.save(
			projectRepository.create({
				name: 'Team Project',
				type: 'team',
			}),
		);
		await authMemberAgent
			.post('/credentials')
			.send({ ...(0, backend_test_utils_1.randomCredentialPayload)(), projectId: project.id })
			.expect(400, {
				code: 400,
				message: "You don't have the permissions to save the credential in this project.",
			});
	});
});
describe('DELETE /credentials/:id', () => {
	test('should delete owned cred for owner', async () => {
		const savedCredential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: owner,
				role: 'credential:owner',
			},
		);
		const response = await authOwnerAgent.delete(`/credentials/${savedCredential.id}`);
		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ data: true });
		const deletedCredential = await di_1.Container.get(db_1.CredentialsRepository).findOneBy({
			id: savedCredential.id,
		});
		expect(deletedCredential).toBeNull();
		const deletedSharedCredential = await di_1.Container.get(
			db_1.SharedCredentialsRepository,
		).findOneBy({});
		expect(deletedSharedCredential).toBeNull();
	});
	test('should delete non-owned cred for owner', async () => {
		const savedCredential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: member,
				role: 'credential:owner',
			},
		);
		const response = await authOwnerAgent.delete(`/credentials/${savedCredential.id}`);
		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ data: true });
		const deletedCredential = await di_1.Container.get(db_1.CredentialsRepository).findOneBy({
			id: savedCredential.id,
		});
		expect(deletedCredential).toBeNull();
		const deletedSharedCredential = await di_1.Container.get(
			db_1.SharedCredentialsRepository,
		).findOneBy({});
		expect(deletedSharedCredential).toBeNull();
	});
	test('should delete owned cred for member', async () => {
		const savedCredential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: member,
				role: 'credential:owner',
			},
		);
		const response = await authMemberAgent.delete(`/credentials/${savedCredential.id}`);
		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual({ data: true });
		const deletedCredential = await di_1.Container.get(db_1.CredentialsRepository).findOneBy({
			id: savedCredential.id,
		});
		expect(deletedCredential).toBeNull();
		const deletedSharedCredential = await di_1.Container.get(
			db_1.SharedCredentialsRepository,
		).findOneBy({});
		expect(deletedSharedCredential).toBeNull();
	});
	test('should not delete non-owned cred for member', async () => {
		const savedCredential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: owner,
				role: 'credential:owner',
			},
		);
		const response = await authMemberAgent.delete(`/credentials/${savedCredential.id}`);
		expect(response.statusCode).toBe(403);
		const shellCredential = await di_1.Container.get(db_1.CredentialsRepository).findOneBy({
			id: savedCredential.id,
		});
		expect(shellCredential).toBeDefined();
		const deletedSharedCredential = await di_1.Container.get(
			db_1.SharedCredentialsRepository,
		).findOneBy({});
		expect(deletedSharedCredential).toBeDefined();
	});
	test('should not delete non-owned but shared cred for member', async () => {
		const savedCredential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: secondMember,
				role: 'credential:owner',
			},
		);
		await (0, credentials_1.shareCredentialWithUsers)(savedCredential, [member]);
		const response = await authMemberAgent.delete(`/credentials/${savedCredential.id}`);
		expect(response.statusCode).toBe(403);
		const shellCredential = await di_1.Container.get(db_1.CredentialsRepository).findOneBy({
			id: savedCredential.id,
		});
		expect(shellCredential).toBeDefined();
		const deletedSharedCredential = await di_1.Container.get(
			db_1.SharedCredentialsRepository,
		).findOneBy({});
		expect(deletedSharedCredential).toBeDefined();
	});
	test('should fail if cred not found', async () => {
		const response = await authOwnerAgent.delete('/credentials/123');
		expect(response.statusCode).toBe(404);
	});
});
describe('PATCH /credentials/:id', () => {
	test('should update owned cred for owner', async () => {
		const savedCredential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: owner,
				role: 'credential:owner',
			},
		);
		const patchPayload = (0, backend_test_utils_1.randomCredentialPayload)();
		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(patchPayload);
		expect(response.statusCode).toBe(200);
		const { id, name, type, data: encryptedData, scopes } = response.body.data;
		expect(name).toBe(patchPayload.name);
		expect(type).toBe(patchPayload.type);
		expect(scopes).toEqual(
			[
				'credential:create',
				'credential:delete',
				'credential:list',
				'credential:move',
				'credential:read',
				'credential:share',
				'credential:update',
			].sort(),
		);
		expect(encryptedData).not.toBe(patchPayload.data);
		const credential = await di_1.Container.get(db_1.CredentialsRepository).findOneByOrFail({ id });
		expect(credential.name).toBe(patchPayload.name);
		expect(credential.type).toBe(patchPayload.type);
		expect(credential.data).not.toBe(patchPayload.data);
		const sharedCredential = await di_1.Container.get(
			db_1.SharedCredentialsRepository,
		).findOneOrFail({
			relations: ['credentials'],
			where: { credentialsId: credential.id },
		});
		expect(sharedCredential.credentials.name).toBe(patchPayload.name);
	});
	test('should update non-owned cred for owner', async () => {
		const savedCredential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: member,
				role: 'credential:owner',
			},
		);
		const patchPayload = (0, backend_test_utils_1.randomCredentialPayload)();
		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(patchPayload);
		expect(response.statusCode).toBe(200);
		const credential = await di_1.Container.get(db_1.CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});
		expect(credential.name).toBe(patchPayload.name);
		expect(credential.type).toBe(patchPayload.type);
		const credentialObject = new n8n_core_1.Credentials(
			{ id: credential.id, name: credential.name },
			credential.type,
			credential.data,
		);
		expect(credentialObject.getData()).toStrictEqual(patchPayload.data);
		const sharedCredential = await di_1.Container.get(
			db_1.SharedCredentialsRepository,
		).findOneOrFail({
			relations: ['credentials'],
			where: { credentialsId: credential.id },
		});
		expect(sharedCredential.credentials.name).toBe(patchPayload.name);
	});
	test('should update owned cred for member', async () => {
		const savedCredential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: member,
				role: 'credential:owner',
			},
		);
		const patchPayload = (0, backend_test_utils_1.randomCredentialPayload)();
		const response = await authMemberAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(patchPayload);
		expect(response.statusCode).toBe(200);
		const { id, name, type, data: encryptedData } = response.body.data;
		expect(name).toBe(patchPayload.name);
		expect(type).toBe(patchPayload.type);
		expect(encryptedData).not.toBe(patchPayload.data);
		const credential = await di_1.Container.get(db_1.CredentialsRepository).findOneByOrFail({ id });
		expect(credential.name).toBe(patchPayload.name);
		expect(credential.type).toBe(patchPayload.type);
		expect(credential.data).not.toBe(patchPayload.data);
		const sharedCredential = await di_1.Container.get(
			db_1.SharedCredentialsRepository,
		).findOneOrFail({
			relations: ['credentials'],
			where: { credentialsId: credential.id },
		});
		expect(sharedCredential.credentials.name).toBe(patchPayload.name);
	});
	test('should not update non-owned cred for member', async () => {
		const savedCredential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: owner,
				role: 'credential:owner',
			},
		);
		const patchPayload = (0, backend_test_utils_1.randomCredentialPayload)();
		const response = await authMemberAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(patchPayload);
		expect(response.statusCode).toBe(403);
		const shellCredential = await di_1.Container.get(db_1.CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});
		expect(shellCredential.name).not.toBe(patchPayload.name);
	});
	test('should not update non-owned but shared cred for member', async () => {
		const savedCredential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: secondMember,
				role: 'credential:owner',
			},
		);
		await (0, credentials_1.shareCredentialWithUsers)(savedCredential, [member]);
		const patchPayload = (0, backend_test_utils_1.randomCredentialPayload)();
		const response = await authMemberAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(patchPayload);
		expect(response.statusCode).toBe(403);
		const shellCredential = await di_1.Container.get(db_1.CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});
		expect(shellCredential.name).not.toBe(patchPayload.name);
	});
	test('should update non-owned but shared cred for instance owner', async () => {
		const savedCredential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: secondMember,
				role: 'credential:owner',
			},
		);
		await (0, credentials_1.shareCredentialWithUsers)(savedCredential, [owner]);
		const patchPayload = (0, backend_test_utils_1.randomCredentialPayload)();
		const response = await authOwnerAgent
			.patch(`/credentials/${savedCredential.id}`)
			.send(patchPayload);
		expect(response.statusCode).toBe(200);
		const shellCredential = await di_1.Container.get(db_1.CredentialsRepository).findOneByOrFail({
			id: savedCredential.id,
		});
		expect(shellCredential.name).toBe(patchPayload.name);
	});
	test('should not allow to overwrite oauthTokenData', async () => {
		const credential = (0, backend_test_utils_1.randomCredentialPayload)();
		credential.data.oauthTokenData = { access_token: 'foo' };
		const savedCredential = await (0, credentials_1.saveCredential)(credential, {
			user: owner,
			role: 'credential:owner',
		});
		const patchPayload = {
			...credential,
			data: { accessToken: 'new', oauthTokenData: { access_token: 'bar' } },
		};
		await authOwnerAgent.patch(`/credentials/${savedCredential.id}`).send(patchPayload).expect(200);
		const response = await authOwnerAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true })
			.expect(200);
		const { id, data } = response.body.data;
		expect(id).toBe(savedCredential.id);
		expect(data.accessToken).toBe(patchPayload.data.accessToken);
		const dbCredential = await (0, credentials_1.getCredentialById)(savedCredential.id);
		const unencryptedData = di_1.Container.get(credentials_service_1.CredentialsService).decrypt(
			dbCredential,
		);
		expect(unencryptedData.oauthTokenData).toEqual(credential.data.oauthTokenData);
	});
	test('should fail with invalid inputs', async () => {
		const savedCredential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: owner,
				role: 'credential:owner',
			},
		);
		for (const invalidPayload of INVALID_PAYLOADS) {
			const response = await authOwnerAgent
				.patch(`/credentials/${savedCredential.id}`)
				.send(invalidPayload);
			expect(response.statusCode).toBe(400);
		}
	});
	test('should fail with a 404 if the credential does not exist and the actor has the global credential:update scope', async () => {
		const response = await authOwnerAgent
			.patch('/credentials/123')
			.send((0, backend_test_utils_1.randomCredentialPayload)());
		expect(response.statusCode).toBe(404);
	});
	test('should fail with a 404 if the credential does not exist and the actor does not have the global credential:update scope', async () => {
		const response = await authMemberAgent
			.patch('/credentials/123')
			.send((0, backend_test_utils_1.randomCredentialPayload)());
		expect(response.statusCode).toBe(404);
	});
	test('should fail with a 400 is credential is managed', async () => {
		const { id } = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)({ isManaged: true }),
			{
				user: owner,
				role: 'credential:owner',
			},
		);
		const response = await authOwnerAgent
			.patch(`/credentials/${id}`)
			.send((0, backend_test_utils_1.randomCredentialPayload)());
		expect(response.statusCode).toBe(400);
	});
});
describe('GET /credentials/new', () => {
	test('should return default name for new credential or its increment', async () => {
		const name = di_1.Container.get(config_1.GlobalConfig).credentials.defaultName;
		let tempName = name;
		for (let i = 0; i < 4; i++) {
			const response = await authOwnerAgent.get(`/credentials/new?name=${name}`);
			expect(response.statusCode).toBe(200);
			if (i === 0) {
				expect(response.body.data.name).toBe(name);
			} else {
				tempName = name + ' ' + (i + 1);
				expect(response.body.data.name).toBe(tempName);
			}
			await (0, credentials_1.saveCredential)(
				{ ...(0, backend_test_utils_1.randomCredentialPayload)(), name: tempName },
				{ user: owner, role: 'credential:owner' },
			);
		}
	});
	test('should return name from query for new credential or its increment', async () => {
		const name = 'special credential name';
		let tempName = name;
		for (let i = 0; i < 4; i++) {
			const response = await authOwnerAgent.get(`/credentials/new?name=${name}`);
			expect(response.statusCode).toBe(200);
			if (i === 0) {
				expect(response.body.data.name).toBe(name);
			} else {
				tempName = name + ' ' + (i + 1);
				expect(response.body.data.name).toBe(tempName);
			}
			await (0, credentials_1.saveCredential)(
				{ ...(0, backend_test_utils_1.randomCredentialPayload)(), name: tempName },
				{ user: owner, role: 'credential:owner' },
			);
		}
	});
});
describe('GET /credentials/:id', () => {
	test('should retrieve owned cred for owner', async () => {
		const savedCredential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: owner,
				role: 'credential:owner',
			},
		);
		const firstResponse = await authOwnerAgent.get(`/credentials/${savedCredential.id}`);
		expect(firstResponse.statusCode).toBe(200);
		validateMainCredentialData(firstResponse.body.data);
		expect(firstResponse.body.data.data).toBeUndefined();
		const secondResponse = await authOwnerAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true });
		validateMainCredentialData(secondResponse.body.data);
		expect(secondResponse.body.data.data).toBeDefined();
	});
	test('should redact the data when `includeData:true` is passed', async () => {
		const credentialService = di_1.Container.get(credentials_service_1.CredentialsService);
		const redactSpy = jest.spyOn(credentialService, 'redact');
		const savedCredential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: owner,
				role: 'credential:owner',
			},
		);
		const response = await authOwnerAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true });
		validateMainCredentialData(response.body.data);
		expect(response.body.data.data).toBeDefined();
		expect(redactSpy).toHaveBeenCalled();
	});
	test('should omit oauth data when `includeData:true` is passed', async () => {
		const credential = (0, backend_test_utils_1.randomCredentialPayloadWithOauthTokenData)();
		const savedCredential = await (0, credentials_1.saveCredential)(credential, {
			user: owner,
			role: 'credential:owner',
		});
		const response = await authOwnerAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true });
		validateMainCredentialData(response.body.data);
		expect(response.body.data.data).toBeDefined();
		expect(response.body.data.data.oauthTokenData).toBe(true);
	});
	test('should retrieve owned cred for member', async () => {
		const savedCredential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: member,
				role: 'credential:owner',
			},
		);
		const firstResponse = await authMemberAgent.get(`/credentials/${savedCredential.id}`);
		expect(firstResponse.statusCode).toBe(200);
		validateMainCredentialData(firstResponse.body.data);
		expect(firstResponse.body.data.data).toBeUndefined();
		const secondResponse = await authMemberAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true });
		expect(secondResponse.statusCode).toBe(200);
		validateMainCredentialData(secondResponse.body.data);
		expect(secondResponse.body.data.data).toBeDefined();
	});
	test('should retrieve non-owned cred for owner', async () => {
		const savedCredential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: member,
				role: 'credential:owner',
			},
		);
		const response1 = await authOwnerAgent.get(`/credentials/${savedCredential.id}`);
		expect(response1.statusCode).toBe(200);
		validateMainCredentialData(response1.body.data);
		expect(response1.body.data.data).toBeUndefined();
		const response2 = await authOwnerAgent
			.get(`/credentials/${savedCredential.id}`)
			.query({ includeData: true });
		expect(response2.statusCode).toBe(200);
		validateMainCredentialData(response2.body.data);
		expect(response2.body.data.data).toBeDefined();
	});
	test('should not retrieve non-owned cred for member', async () => {
		const savedCredential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: owner,
				role: 'credential:owner',
			},
		);
		const response = await authMemberAgent.get(`/credentials/${savedCredential.id}`);
		expect(response.statusCode).toBe(403);
		expect(response.body.data).toBeUndefined();
	});
	test('should return 404 if cred not found', async () => {
		const response = await authOwnerAgent.get('/credentials/789');
		expect(response.statusCode).toBe(404);
		const responseAbc = await authOwnerAgent.get('/credentials/abc');
		expect(responseAbc.statusCode).toBe(404);
	});
});
describe('POST /credentials/test', () => {
	const mockCredentialsTester = (0, jest_mock_extended_1.mock)();
	di_1.Container.set(credentials_tester_service_1.CredentialsTester, mockCredentialsTester);
	afterEach(() => {
		mockCredentialsTester.testCredentials.mockClear();
	});
	test('should test a credential with unredacted data', async () => {
		mockCredentialsTester.testCredentials.mockResolvedValue({
			status: 'OK',
			message: 'Credential tested successfully',
		});
		const credential = (0, backend_test_utils_1.randomCredentialPayload)();
		const savedCredential = await (0, credentials_1.saveCredential)(credential, {
			user: owner,
			role: 'credential:owner',
		});
		const response = await authOwnerAgent.post('/credentials/test').send({
			credentials: {
				id: savedCredential.id,
				type: savedCredential.type,
				data: credential.data,
			},
		});
		expect(response.statusCode).toBe(200);
		expect(mockCredentialsTester.testCredentials.mock.calls[0][0]).toEqual(owner.id);
		expect(mockCredentialsTester.testCredentials.mock.calls[0][1]).toBe(savedCredential.type);
		expect(mockCredentialsTester.testCredentials.mock.calls[0][2]).toEqual({
			id: savedCredential.id,
			type: savedCredential.type,
			data: credential.data,
		});
	});
	test('should test a credential with redacted data', async () => {
		mockCredentialsTester.testCredentials.mockResolvedValue({
			status: 'OK',
			message: 'Credential tested successfully',
		});
		const credential = (0, backend_test_utils_1.randomCredentialPayload)();
		const savedCredential = await (0, credentials_1.saveCredential)(credential, {
			user: owner,
			role: 'credential:owner',
		});
		const response = await authOwnerAgent.post('/credentials/test').send({
			credentials: {
				id: savedCredential.id,
				type: savedCredential.type,
				data: {
					accessToken: constants_1.CREDENTIAL_BLANKING_VALUE,
				},
			},
		});
		expect(response.statusCode).toBe(200);
		expect(mockCredentialsTester.testCredentials.mock.calls[0][0]).toEqual(owner.id);
		expect(mockCredentialsTester.testCredentials.mock.calls[0][1]).toBe(savedCredential.type);
		expect(mockCredentialsTester.testCredentials.mock.calls[0][2]).toEqual({
			id: savedCredential.id,
			type: savedCredential.type,
			data: credential.data,
		});
	});
	test('should return only credentials shared with me when ?onlySharedWithMe=true (owner)', async () => {
		await (0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
			user: owner,
			role: 'credential:owner',
		});
		await (0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
			user: owner,
			role: 'credential:owner',
		});
		const memberCredential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: member,
				role: 'credential:owner',
			},
		);
		await (0, credentials_1.shareCredentialWithUsers)(memberCredential, [owner]);
		let response;
		response = await authOwnerAgent.get('/credentials').query({ onlySharedWithMe: true });
		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].id).toBe(memberCredential.id);
		expect(response.body.data[0].homeProject).not.toBeNull();
		response = await authMemberAgent.get('/credentials').query({ onlySharedWithMe: true });
		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(0);
	});
	test('should return only credentials shared with me when ?onlySharedWithMe=true (admin)', async () => {
		await (0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
			user: admin,
			role: 'credential:owner',
		});
		await (0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
			user: admin,
			role: 'credential:owner',
		});
		const memberCredential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: member,
				role: 'credential:owner',
			},
		);
		await (0, credentials_1.shareCredentialWithUsers)(memberCredential, [admin]);
		let response;
		response = await authAdminAgent.get('/credentials').query({ onlySharedWithMe: true });
		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].id).toBe(memberCredential.id);
		expect(response.body.data[0].homeProject).not.toBeNull();
		response = await authMemberAgent.get('/credentials').query({ onlySharedWithMe: true });
		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(0);
	});
	test('should return only credentials shared with me when ?onlySharedWithMe=true (member)', async () => {
		await (0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
			user: member,
			role: 'credential:owner',
		});
		await (0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
			user: member,
			role: 'credential:owner',
		});
		const ownerCredential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: owner,
				role: 'credential:owner',
			},
		);
		await (0, credentials_1.shareCredentialWithUsers)(ownerCredential, [member]);
		let response;
		response = await authMemberAgent.get('/credentials').query({ onlySharedWithMe: true });
		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(1);
		expect(response.body.data[0].id).toBe(ownerCredential.id);
		expect(response.body.data[0].homeProject).not.toBeNull();
		response = await authOwnerAgent.get('/credentials').query({ onlySharedWithMe: true });
		expect(response.statusCode).toBe(200);
		expect(response.body.data).toHaveLength(0);
	});
});
const INVALID_PAYLOADS = [
	{
		type: (0, backend_test_utils_1.randomName)(),
		data: { accessToken: (0, n8n_workflow_1.randomString)(6, 16) },
	},
	{
		name: (0, backend_test_utils_1.randomName)(),
		data: { accessToken: (0, n8n_workflow_1.randomString)(6, 16) },
	},
	{
		name: (0, backend_test_utils_1.randomName)(),
		type: (0, backend_test_utils_1.randomName)(),
	},
	{},
	undefined,
];
function validateMainCredentialData(credential) {
	const { name, type, sharedWithProjects, homeProject, isManaged } = credential;
	expect(typeof name).toBe('string');
	expect(typeof type).toBe('string');
	expect(typeof isManaged).toBe('boolean');
	if (sharedWithProjects) {
		expect(Array.isArray(sharedWithProjects)).toBe(true);
	}
	if (homeProject) {
		const { id, type, name } = homeProject;
		expect(typeof id).toBe('string');
		expect(typeof name).toBe('string');
		expect(type).toBe('personal');
	}
}
function validateCredentialWithNoData(credential) {
	validateMainCredentialData(credential);
	expect('data' in credential).toBe(false);
}
//# sourceMappingURL=credentials.api.test.js.map
