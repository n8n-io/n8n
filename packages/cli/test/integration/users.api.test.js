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
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const uuid_1 = require('uuid');
const constants_1 = require('@/constants');
const users_controller_1 = require('@/controllers/users.controller');
const execution_service_1 = require('@/executions/execution.service');
const cache_service_1 = require('@/services/cache/cache.service');
const telemetry_1 = require('@/telemetry');
const folders_1 = require('@test-integration/db/folders');
const constants_2 = require('./shared/constants');
const credentials_1 = require('./shared/db/credentials');
const users_1 = require('./shared/db/users');
const utils = __importStar(require('./shared/utils/'));
const users_2 = require('./shared/utils/users');
(0, backend_test_utils_1.mockInstance)(telemetry_1.Telemetry);
(0, backend_test_utils_1.mockInstance)(execution_service_1.ExecutionService);
const testServer = utils.setupTestServer({
	endpointGroups: ['users'],
	enabledFeatures: ['feat:advancedPermissions'],
});
describe('GET /users', () => {
	let owner;
	let member1;
	let member2;
	let ownerAgent;
	let memberAgent;
	let userRepository;
	beforeAll(async () => {
		await backend_test_utils_1.testDb.truncate(['User']);
		userRepository = di_1.Container.get(db_1.UserRepository);
		owner = await (0, users_1.createUser)({
			role: 'global:owner',
			email: 'owner@n8n.io',
			firstName: 'OwnerFirstName',
			lastName: 'OwnerLastName',
		});
		member1 = await (0, users_1.createUser)({
			role: 'global:member',
			email: 'member1@n8n.io',
			firstName: 'Member1FirstName',
			lastName: 'Member1LastName',
			mfaEnabled: true,
		});
		member2 = await (0, users_1.createUser)({
			role: 'global:member',
			email: 'member2@n8n.io',
			firstName: 'Member2FirstName',
			lastName: 'Member2LastName',
		});
		await (0, users_1.createUser)({
			role: 'global:admin',
			email: 'admin@n8n.io',
			firstName: 'AdminFirstName',
			lastName: 'AdminLastName',
			mfaEnabled: true,
		});
		for (let i = 0; i < 10; i++) {
			await (0, backend_test_utils_1.createTeamProject)(`project${i}`, member1);
		}
		ownerAgent = testServer.authAgentFor(owner);
		memberAgent = testServer.authAgentFor(member1);
	});
	test('should return all users', async () => {
		const response = await ownerAgent.get('/users').expect(200);
		expect(response.body.data).toHaveProperty('count', 4);
		expect(response.body.data).toHaveProperty('items');
		expect(response.body.data.items).toHaveLength(4);
		response.body.data.items.forEach(users_2.validateUser);
	});
	describe('list query options', () => {
		describe('filter', () => {
			test('should filter users by field: email', async () => {
				const response = await ownerAgent
					.get('/users')
					.query(`filter={ "email": "${member1.email}" }`)
					.expect(200);
				expect(response.body.data).toEqual({
					count: 1,
					items: expect.arrayContaining([]),
				});
				expect(response.body.data.items).toHaveLength(1);
				const [user] = response.body.data.items;
				expect(user.email).toBe(member1.email);
				const _response = await ownerAgent
					.get('/users')
					.query('filter={ "email": "non@existing.com" }')
					.expect(200);
				expect(_response.body.data).toEqual({
					count: 0,
					items: expect.arrayContaining([]),
				});
				expect(_response.body.data.items).toHaveLength(0);
			});
			test('should filter users by field: firstName', async () => {
				const response = await ownerAgent
					.get('/users')
					.query(`filter={ "firstName": "${member1.firstName}" }`)
					.expect(200);
				expect(response.body.data).toEqual({
					count: 1,
					items: expect.arrayContaining([]),
				});
				expect(response.body.data.items).toHaveLength(1);
				const [user] = response.body.data.items;
				expect(user.email).toBe(member1.email);
				const _response = await ownerAgent
					.get('/users')
					.query('filter={ "firstName": "Non-Existing" }')
					.expect(200);
				expect(_response.body.data).toEqual({
					count: 0,
					items: expect.arrayContaining([]),
				});
				expect(_response.body.data.items).toHaveLength(0);
			});
			test('should filter users by field: lastName', async () => {
				const response = await ownerAgent
					.get('/users')
					.query(`filter={ "lastName": "${member1.lastName}" }`)
					.expect(200);
				expect(response.body.data).toEqual({
					count: 1,
					items: expect.arrayContaining([]),
				});
				expect(response.body.data.items).toHaveLength(1);
				const [user] = response.body.data.items;
				expect(user.email).toBe(member1.email);
				const _response = await ownerAgent
					.get('/users')
					.query('filter={ "lastName": "Non-Existing" }')
					.expect(200);
				expect(_response.body.data).toEqual({
					count: 0,
					items: expect.arrayContaining([]),
				});
				expect(_response.body.data.items).toHaveLength(0);
			});
			test('should filter users by computed field: isOwner', async () => {
				const response = await ownerAgent
					.get('/users')
					.query('filter={ "isOwner": true }')
					.expect(200);
				expect(response.body.data).toEqual({
					count: 1,
					items: expect.arrayContaining([]),
				});
				expect(response.body.data.items).toHaveLength(1);
				const [user] = response.body.data.items;
				expect(user.isOwner).toBe(true);
				const _response = await ownerAgent
					.get('/users')
					.query('filter={ "isOwner": false }')
					.expect(200);
				expect(_response.body.data).toEqual({
					count: 3,
					items: expect.arrayContaining([]),
				});
				expect(_response.body.data.items).toHaveLength(3);
				const [_user] = _response.body.data.items;
				expect(_user.isOwner).toBe(false);
			});
			test('should filter users by mfaEnabled field', async () => {
				const response = await ownerAgent
					.get('/users')
					.query('filter={ "mfaEnabled": true }')
					.expect(200);
				expect(response.body.data).toEqual({
					count: 2,
					items: expect.arrayContaining([]),
				});
				expect(response.body.data.items).toHaveLength(2);
				const [user] = response.body.data.items;
				expect(user.mfaEnabled).toBe(true);
				const _response = await ownerAgent
					.get('/users')
					.query('filter={ "mfaEnabled": false }')
					.expect(200);
				expect(_response.body.data).toEqual({
					count: 2,
					items: expect.arrayContaining([]),
				});
				expect(_response.body.data.items).toHaveLength(2);
				const [_user] = _response.body.data.items;
				expect(_user.mfaEnabled).toBe(false);
			});
			test('should filter users by field: fullText', async () => {
				const response = await ownerAgent
					.get('/users')
					.query('filter={ "fullText": "member1" }')
					.expect(200);
				expect(response.body.data).toEqual({
					count: 1,
					items: expect.arrayContaining([]),
				});
				expect(response.body.data.items).toHaveLength(1);
				const [user] = response.body.data.items;
				expect(user.email).toBe(member1.email);
				const _response = await ownerAgent
					.get('/users')
					.query('filter={ "fullText": "Non-Existing" }')
					.expect(200);
				expect(_response.body.data).toEqual({
					count: 0,
					items: expect.arrayContaining([]),
				});
				expect(_response.body.data.items).toHaveLength(0);
			});
		});
		describe('select', () => {
			test('should select user field: id', async () => {
				const response = await ownerAgent.get('/users').query('select[]=id').expect(200);
				expect(response.body).toEqual({
					data: {
						count: 4,
						items: [
							{ id: expect.any(String) },
							{ id: expect.any(String) },
							{ id: expect.any(String) },
							{ id: expect.any(String) },
						],
					},
				});
			});
			test('should select user field: email', async () => {
				const response = await ownerAgent.get('/users').query('select[]=email').expect(200);
				expect(response.body).toEqual({
					data: {
						count: 4,
						items: [
							{
								id: expect.any(String),
								email: expect.any(String),
							},
							{
								id: expect.any(String),
								email: expect.any(String),
							},
							{
								id: expect.any(String),
								email: expect.any(String),
							},
							{
								id: expect.any(String),
								email: expect.any(String),
							},
						],
					},
				});
			});
			test('should select user field: firstName', async () => {
				const response = await ownerAgent.get('/users').query('select[]=firstName').expect(200);
				expect(response.body).toEqual({
					data: {
						count: 4,
						items: [
							{
								id: expect.any(String),
								firstName: expect.any(String),
							},
							{
								id: expect.any(String),
								firstName: expect.any(String),
							},
							{
								id: expect.any(String),
								firstName: expect.any(String),
							},
							{
								id: expect.any(String),
								firstName: expect.any(String),
							},
						],
					},
				});
			});
			test('should select user field: lastName', async () => {
				const response = await ownerAgent.get('/users').query('select[]=lastName').expect(200);
				expect(response.body).toEqual({
					data: {
						count: 4,
						items: [
							{
								id: expect.any(String),
								lastName: expect.any(String),
							},
							{
								id: expect.any(String),
								lastName: expect.any(String),
							},
							{
								id: expect.any(String),
								lastName: expect.any(String),
							},
							{
								id: expect.any(String),
								lastName: expect.any(String),
							},
						],
					},
				});
			});
			test('should select multiple user fields: email, firstName, lastName', async () => {
				const response = await ownerAgent
					.get('/users')
					.query('select[]=email&select[]=firstName&select[]=lastName')
					.expect(200);
				expect(response.body).toEqual({
					data: {
						count: 4,
						items: [
							{
								id: expect.any(String),
								email: expect.any(String),
								firstName: expect.any(String),
								lastName: expect.any(String),
							},
							{
								id: expect.any(String),
								email: expect.any(String),
								firstName: expect.any(String),
								lastName: expect.any(String),
							},
							{
								id: expect.any(String),
								email: expect.any(String),
								firstName: expect.any(String),
								lastName: expect.any(String),
							},
							{
								id: expect.any(String),
								email: expect.any(String),
								firstName: expect.any(String),
								lastName: expect.any(String),
							},
						],
					},
				});
			});
		});
		describe('take', () => {
			test('should return n users or less, without skip', async () => {
				const response = await ownerAgent.get('/users').query('take=2').expect(200);
				expect(response.body.data.count).toBe(4);
				expect(response.body.data.items).toHaveLength(2);
				response.body.data.items.forEach(users_2.validateUser);
				const _response = await ownerAgent.get('/users').query('take=1').expect(200);
				expect(_response.body.data.items).toHaveLength(1);
				_response.body.data.items.forEach(users_2.validateUser);
			});
			test('should return n users or less, with skip', async () => {
				const response = await ownerAgent.get('/users').query('take=1&skip=1').expect(200);
				expect(response.body.data.count).toBe(4);
				expect(response.body.data.items).toHaveLength(1);
				response.body.data.items.forEach(users_2.validateUser);
			});
			test('should return all users with large enough take', async () => {
				const response = await ownerAgent
					.get('/users')
					.query('take=5&expand[]=projectRelations&sortBy[]=role:desc')
					.expect(200);
				expect(response.body.data.count).toBe(4);
				expect(response.body.data.items).toHaveLength(4);
				response.body.data.items.forEach(users_2.validateUser);
			});
			test('should return all users with negative take', async () => {
				const users = [];
				for (let i = 0; i < 100; i++) {
					users.push(await (0, users_1.createMember)());
				}
				const response = await ownerAgent.get('/users').query('take=-1').expect(200);
				expect(response.body.data.items).toHaveLength(104);
				response.body.data.items.forEach(users_2.validateUser);
				for (const user of users) {
					await userRepository.delete({ id: user.id });
				}
				const _response = await ownerAgent.get('/users').query('take=-1').expect(200);
				expect(_response.body.data.items).toHaveLength(4);
				_response.body.data.items.forEach(users_2.validateUser);
			});
		});
		describe('auxiliary fields', () => {
			test('should support options that require auxiliary fields', async () => {
				const response = await ownerAgent
					.get('/users')
					.query('filter={ "isOwner": true }&select[]=firstName&take=1')
					.expect(200);
				expect(response.body).toEqual({
					data: {
						count: 1,
						items: [
							{
								id: expect.any(String),
								firstName: expect.any(String),
							},
						],
					},
				});
			});
		});
		describe('expand', () => {
			test('should expand on team projects', async () => {
				const project = await (0, backend_test_utils_1.createTeamProject)('Test Project');
				await (0, backend_test_utils_1.linkUserToProject)(member2, project, 'project:admin');
				const response = await ownerAgent
					.get('/users')
					.query(
						`filter={ "email": "${member2.email}" }&select[]=firstName&take=1&expand[]=projectRelations&sortBy[]=role:asc`,
					)
					.expect(200);
				expect(response.body).toEqual({
					data: {
						count: 1,
						items: [
							{
								id: expect.any(String),
								firstName: expect.any(String),
								projectRelations: [
									{
										id: project.id,
										role: 'project:admin',
										name: project.name,
									},
								],
							},
						],
					},
				});
				expect(response.body.data.items[0].projectRelations).toHaveLength(1);
			});
			test('should expand on projects and hide personal projects', async () => {
				const response = await ownerAgent
					.get('/users')
					.query(
						'filter={ "isOwner": true }&select[]=firstName&take=1&expand[]=projectRelations&sortBy[]=role:asc',
					)
					.expect(200);
				expect(response.body).toEqual({
					data: {
						count: 1,
						items: [
							{
								id: expect.any(String),
								firstName: expect.any(String),
								projectRelations: expect.arrayContaining([]),
							},
						],
					},
				});
				expect(response.body.data.items[0].projectRelations).toHaveLength(0);
			});
		});
		describe('inviteAcceptUrl', () => {
			let pendingUser;
			beforeAll(async () => {
				pendingUser = await (0, users_1.createUser)({
					role: 'global:member',
					email: 'pending@n8n.io',
					firstName: 'PendingFirstName',
					lastName: 'PendingLastName',
					password: null,
				});
			});
			afterAll(async () => {
				await userRepository.delete({ id: pendingUser.id });
			});
			test('should include inviteAcceptUrl for pending users', async () => {
				const response = await ownerAgent.get('/users').expect(200);
				const responseData = response.body.data;
				const pendingUserInResponse = responseData.items.find((user) => user.id === pendingUser.id);
				expect(pendingUserInResponse).toBeDefined();
				expect(pendingUserInResponse.inviteAcceptUrl).toBeDefined();
				expect(pendingUserInResponse.inviteAcceptUrl).toMatch(
					new RegExp(`/signup\\?inviterId=${owner.id}&inviteeId=${pendingUser.id}`),
				);
				const nonPendingUser = responseData.items.find((user) => user.id === member1.id);
				expect(nonPendingUser).toBeDefined();
				expect(nonPendingUser.isPending).toBe(false);
				expect(nonPendingUser.inviteAcceptUrl).toBeUndefined();
			});
			test('should not include inviteAcceptUrl for pending users, if member requests it', async () => {
				const response = await memberAgent.get('/users').expect(200);
				const responseData = response.body.data;
				const pendingUserInResponse = responseData.items.find((user) => user.id === pendingUser.id);
				expect(pendingUserInResponse).toBeDefined();
				expect(pendingUserInResponse.inviteAcceptUrl).not.toBeDefined();
				const nonPendingUser = responseData.items.find((user) => user.id === member1.id);
				expect(nonPendingUser).toBeDefined();
				expect(nonPendingUser.isPending).toBe(false);
				expect(nonPendingUser.inviteAcceptUrl).toBeUndefined();
			});
		});
		describe('sortBy', () => {
			test('should sort by role:asc', async () => {
				const response = await ownerAgent.get('/users').query('sortBy[]=role:asc').expect(200);
				expect(response.body.data.items).toHaveLength(4);
				expect(response.body.data.items[0].role).toBe('global:owner');
				expect(response.body.data.items[1].role).toBe('global:admin');
				expect(response.body.data.items[2].role).toBe('global:member');
				expect(response.body.data.items[3].role).toBe('global:member');
			});
			test('should sort by role:desc', async () => {
				const response = await ownerAgent.get('/users').query('sortBy[]=role:desc').expect(200);
				expect(response.body.data.items).toHaveLength(4);
				expect(response.body.data.items[0].role).toBe('global:member');
				expect(response.body.data.items[1].role).toBe('global:member');
				expect(response.body.data.items[2].role).toBe('global:admin');
				expect(response.body.data.items[3].role).toBe('global:owner');
			});
			test('should sort by firstName:asc', async () => {
				const response = await ownerAgent.get('/users').query('sortBy[]=firstName:asc').expect(200);
				expect(response.body.data.items).toHaveLength(4);
				expect(response.body.data.items[0].firstName).toBe('AdminFirstName');
				expect(response.body.data.items[1].firstName).toBe('Member1FirstName');
				expect(response.body.data.items[2].firstName).toBe('Member2FirstName');
				expect(response.body.data.items[3].firstName).toBe('OwnerFirstName');
			});
			test('should sort by firstName:desc', async () => {
				const response = await ownerAgent
					.get('/users')
					.query('sortBy[]=firstName:desc')
					.expect(200);
				expect(response.body.data.items).toHaveLength(4);
				expect(response.body.data.items[0].firstName).toBe('OwnerFirstName');
				expect(response.body.data.items[1].firstName).toBe('Member2FirstName');
				expect(response.body.data.items[2].firstName).toBe('Member1FirstName');
				expect(response.body.data.items[3].firstName).toBe('AdminFirstName');
			});
			test('should sort by lastName:asc', async () => {
				const response = await ownerAgent.get('/users').query('sortBy[]=lastName:asc').expect(200);
				expect(response.body.data.items).toHaveLength(4);
				expect(response.body.data.items[0].lastName).toBe('AdminLastName');
				expect(response.body.data.items[1].lastName).toBe('Member1LastName');
				expect(response.body.data.items[2].lastName).toBe('Member2LastName');
				expect(response.body.data.items[3].lastName).toBe('OwnerLastName');
			});
			test('should sort by lastName:desc', async () => {
				const response = await ownerAgent.get('/users').query('sortBy[]=lastName:desc').expect(200);
				expect(response.body.data.items).toHaveLength(4);
				expect(response.body.data.items[0].lastName).toBe('OwnerLastName');
				expect(response.body.data.items[1].lastName).toBe('Member2LastName');
				expect(response.body.data.items[2].lastName).toBe('Member1LastName');
				expect(response.body.data.items[3].lastName).toBe('AdminLastName');
			});
			test('should sort by mfaEnabled:asc', async () => {
				const response = await ownerAgent
					.get('/users')
					.query('sortBy[]=mfaEnabled:asc')
					.expect(200);
				expect(response.body.data.items).toHaveLength(4);
				expect(response.body.data.items[0].mfaEnabled).toBe(false);
				expect(response.body.data.items[1].mfaEnabled).toBe(false);
				expect(response.body.data.items[2].mfaEnabled).toBe(true);
				expect(response.body.data.items[3].mfaEnabled).toBe(true);
			});
			test('should sort by mfaEnabled:desc', async () => {
				const response = await ownerAgent
					.get('/users')
					.query('sortBy[]=mfaEnabled:desc')
					.expect(200);
				expect(response.body.data.items).toHaveLength(4);
				expect(response.body.data.items[0].mfaEnabled).toBe(true);
				expect(response.body.data.items[1].mfaEnabled).toBe(true);
				expect(response.body.data.items[2].mfaEnabled).toBe(false);
				expect(response.body.data.items[3].mfaEnabled).toBe(false);
			});
			test('should sort by firstName and lastName combined', async () => {
				const user1 = await (0, users_1.createUser)({
					role: 'global:member',
					email: 'memberz1@n8n.io',
					firstName: 'ZZZFirstName',
					lastName: 'ZZZLastName',
				});
				const user2 = await (0, users_1.createUser)({
					role: 'global:member',
					email: 'memberz2@n8n.io',
					firstName: 'ZZZFirstName',
					lastName: 'ZZYLastName',
				});
				const response = await ownerAgent
					.get('/users')
					.query('sortBy[]=firstName:desc&sortBy[]=lastName:desc')
					.expect(200);
				expect(response.body.data.items).toHaveLength(6);
				expect(response.body.data.items[0].id).toBe(user1.id);
				expect(response.body.data.items[1].id).toBe(user2.id);
				expect(response.body.data.items[2].lastName).toBe('OwnerLastName');
				expect(response.body.data.items[3].lastName).toBe('Member2LastName');
				expect(response.body.data.items[4].lastName).toBe('Member1LastName');
				expect(response.body.data.items[5].lastName).toBe('AdminLastName');
				const response1 = await ownerAgent
					.get('/users')
					.query('sortBy[]=firstName:asc&sortBy[]=lastName:asc')
					.expect(200);
				expect(response1.body.data.items).toHaveLength(6);
				expect(response1.body.data.items[5].id).toBe(user1.id);
				expect(response1.body.data.items[4].id).toBe(user2.id);
				expect(response1.body.data.items[3].lastName).toBe('OwnerLastName');
				expect(response1.body.data.items[2].lastName).toBe('Member2LastName');
				expect(response1.body.data.items[1].lastName).toBe('Member1LastName');
				expect(response1.body.data.items[0].lastName).toBe('AdminLastName');
				await userRepository.delete({ id: user1.id });
				await userRepository.delete({ id: user2.id });
			});
		});
	});
});
describe('GET /users/:id/password-reset-link', () => {
	let owner;
	let admin;
	let member;
	beforeAll(async () => {
		await backend_test_utils_1.testDb.truncate(['User']);
		[owner, admin, member] = await Promise.all([
			(0, users_1.createOwner)(),
			(0, users_1.createAdmin)(),
			(0, users_1.createMember)(),
		]);
	});
	it('should allow owners to generate password reset links for admins and members', async () => {
		const ownerAgent = testServer.authAgentFor(owner);
		await ownerAgent.get(`/users/${owner.id}/password-reset-link`).expect(200);
		await ownerAgent.get(`/users/${admin.id}/password-reset-link`).expect(200);
		await ownerAgent.get(`/users/${member.id}/password-reset-link`).expect(200);
	});
	it('should allow admins to generate password reset links for admins and members, but not owners', async () => {
		const adminAgent = testServer.authAgentFor(admin);
		await adminAgent.get(`/users/${owner.id}/password-reset-link`).expect(403);
		await adminAgent.get(`/users/${admin.id}/password-reset-link`).expect(200);
		await adminAgent.get(`/users/${member.id}/password-reset-link`).expect(200);
	});
	it('should not allow members to generate password reset links for anyone', async () => {
		const memberAgent = testServer.authAgentFor(member);
		await memberAgent.get(`/users/${owner.id}/password-reset-link`).expect(403);
		await memberAgent.get(`/users/${admin.id}/password-reset-link`).expect(403);
		await memberAgent.get(`/users/${member.id}/password-reset-link`).expect(403);
	});
});
describe('DELETE /users/:id', () => {
	let owner;
	let ownerAgent;
	beforeAll(async () => {
		await backend_test_utils_1.testDb.truncate(['User']);
		owner = await (0, users_1.createOwner)();
		ownerAgent = testServer.authAgentFor(owner);
	});
	test('should delete user and their resources', async () => {
		const member = await (0, users_1.createMember)();
		const memberPersonalProject = await (0, backend_test_utils_1.getPersonalProject)(member);
		const teamProject = await (0, backend_test_utils_1.createTeamProject)();
		await (0, backend_test_utils_1.linkUserToProject)(member, teamProject, 'project:admin');
		const [savedWorkflow, savedCredential, teamWorkflow, teamCredential] = await Promise.all([
			(0, backend_test_utils_1.createWorkflow)({}, member),
			(0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				user: member,
				role: 'credential:owner',
			}),
			(0, backend_test_utils_1.createWorkflow)({}, teamProject),
			(0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				project: teamProject,
				role: 'credential:owner',
			}),
		]);
		await ownerAgent.delete(`/users/${member.id}`).expect(200, constants_2.SUCCESS_RESPONSE_BODY);
		const userRepository = di_1.Container.get(db_1.UserRepository);
		const projectRepository = di_1.Container.get(db_1.ProjectRepository);
		const projectRelationRepository = di_1.Container.get(db_1.ProjectRelationRepository);
		const sharedWorkflowRepository = di_1.Container.get(db_1.SharedWorkflowRepository);
		const sharedCredentialsRepository = di_1.Container.get(db_1.SharedCredentialsRepository);
		await Promise.all([
			expect(userRepository.findOneBy({ id: member.id })).resolves.toBeNull(),
			expect(projectRepository.findOneBy({ id: memberPersonalProject.id })).resolves.toBeNull(),
			expect(
				projectRelationRepository.findOneBy({ userId: member.id, projectId: teamProject.id }),
			).resolves.toBeNull(),
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
		const user = await di_1.Container.get(db_1.UserRepository).findOneBy({ id: member.id });
		const sharedWorkflow = await di_1.Container.get(db_1.SharedWorkflowRepository).findOne({
			where: { projectId: memberPersonalProject.id, role: 'workflow:owner' },
		});
		const sharedCredential = await di_1.Container.get(db_1.SharedCredentialsRepository).findOne({
			where: { projectId: memberPersonalProject.id, role: 'credential:owner' },
		});
		const workflow = await (0, backend_test_utils_1.getWorkflowById)(savedWorkflow.id);
		const credential = await (0, credentials_1.getCredentialById)(savedCredential.id);
		expect(user).toBeNull();
		expect(sharedWorkflow).toBeNull();
		expect(sharedCredential).toBeNull();
		expect(workflow).toBeNull();
		expect(credential).toBeNull();
	});
	test('should delete user and team relations and transfer their personal resources to user', async () => {
		const [member, transferee, otherMember] = await Promise.all([
			(0, users_1.createMember)(),
			(0, users_1.createMember)(),
			(0, users_1.createMember)(),
		]);
		const teamProject = await (0, backend_test_utils_1.createTeamProject)();
		await Promise.all([
			(0, backend_test_utils_1.linkUserToProject)(member, teamProject, 'project:admin'),
			(0, backend_test_utils_1.linkUserToProject)(transferee, teamProject, 'project:editor'),
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
			(0, backend_test_utils_1.createWorkflow)({}, member),
			(0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				user: member,
				role: 'credential:owner',
			}),
			(0, backend_test_utils_1.createWorkflow)({}, teamProject),
			(0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				project: teamProject,
				role: 'credential:owner',
			}),
			(0, backend_test_utils_1.createWorkflow)({}, otherMember),
			(0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				user: otherMember,
				role: 'credential:owner',
			}),
			(0, backend_test_utils_1.createWorkflow)({}, transferee),
			(0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				user: transferee,
				role: 'credential:owner',
			}),
		]);
		await Promise.all([
			(0, backend_test_utils_1.shareWorkflowWithUsers)(sharedByOtherMemberWorkflow, [member]),
			(0, credentials_1.shareCredentialWithUsers)(sharedByOtherMemberCredential, [member]),
			(0, backend_test_utils_1.shareWorkflowWithUsers)(sharedByTransfereeWorkflow, [member]),
			(0, credentials_1.shareCredentialWithUsers)(sharedByTransfereeCredential, [member]),
		]);
		const [memberPersonalProject, transfereePersonalProject] = await Promise.all([
			(0, backend_test_utils_1.getPersonalProject)(member),
			(0, backend_test_utils_1.getPersonalProject)(transferee),
		]);
		await Promise.all([
			(0, folders_1.createFolder)(memberPersonalProject, { name: 'folder1' }),
			(0, folders_1.createFolder)(memberPersonalProject, { name: 'folder2' }),
			(0, folders_1.createFolder)(transfereePersonalProject, { name: 'folder3' }),
			(0, folders_1.createFolder)(transfereePersonalProject, { name: 'folder1' }),
		]);
		const deleteSpy = jest.spyOn(di_1.Container.get(cache_service_1.CacheService), 'deleteMany');
		await ownerAgent
			.delete(`/users/${member.id}`)
			.query({ transferId: transfereePersonalProject.id })
			.expect(200);
		expect(deleteSpy).toBeCalledWith(
			expect.arrayContaining([
				`credential-can-use-secrets:${sharedByTransfereeCredential.id}`,
				`credential-can-use-secrets:${ownedCredential.id}`,
			]),
		);
		deleteSpy.mockClear();
		const userRepository = di_1.Container.get(db_1.UserRepository);
		const projectRepository = di_1.Container.get(db_1.ProjectRepository);
		const projectRelationRepository = di_1.Container.get(db_1.ProjectRelationRepository);
		const sharedWorkflowRepository = di_1.Container.get(db_1.SharedWorkflowRepository);
		const sharedCredentialsRepository = di_1.Container.get(db_1.SharedCredentialsRepository);
		const folderRepository = di_1.Container.get(db_1.FolderRepository);
		await Promise.all([
			expect(userRepository.findOneBy({ id: member.id })).resolves.toBeNull(),
			expect(projectRepository.findOneBy({ id: memberPersonalProject.id })).resolves.toBeNull(),
			expect(
				projectRelationRepository.findOneBy({
					projectId: teamProject.id,
					userId: member.id,
				}),
			).resolves.toBeNull(),
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
			expect(
				projectRepository.findOneBy({
					id: teamProject.id,
					projectRelations: {
						userId: transferee.id,
						role: 'project:editor',
					},
				}),
			).resolves.not.toBeNull(),
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
		const transfereeFolders = await folderRepository.findBy({
			homeProject: { id: transfereePersonalProject.id },
		});
		const deletedUserFolders = await folderRepository.findBy({
			homeProject: { id: memberPersonalProject.id },
		});
		expect(transfereeFolders).toHaveLength(4);
		expect(transfereeFolders.map((folder) => folder.name)).toEqual(
			expect.arrayContaining(['folder1', 'folder2', 'folder3', 'folder1']),
		);
		expect(deletedUserFolders).toHaveLength(0);
	});
	test('should delete user and transfer their personal resources to team project', async () => {
		const memberToDelete = await (0, users_1.createMember)();
		const teamProject = await (0, backend_test_utils_1.createTeamProject)('test project', owner);
		const memberPersonalProject = await (0, backend_test_utils_1.getPersonalProject)(
			memberToDelete,
		);
		const memberToDeleteWorkflow = await (0, backend_test_utils_1.createWorkflow)(
			{ name: 'workflow1' },
			memberToDelete,
		);
		const memberToDeleteCredential = await (0, credentials_1.saveCredential)(
			(0, backend_test_utils_1.randomCredentialPayload)(),
			{
				user: memberToDelete,
				role: 'credential:owner',
			},
		);
		await Promise.all([
			(0, folders_1.createFolder)(memberPersonalProject, { name: 'folder1' }),
			(0, folders_1.createFolder)(memberPersonalProject, { name: 'folder2' }),
			(0, folders_1.createFolder)(teamProject, { name: 'folder3' }),
			(0, folders_1.createFolder)(teamProject, { name: 'folder1' }),
		]);
		const deleteSpy = jest.spyOn(di_1.Container.get(cache_service_1.CacheService), 'deleteMany');
		await ownerAgent
			.delete(`/users/${memberToDelete.id}`)
			.query({ transferId: teamProject.id })
			.expect(200);
		deleteSpy.mockClear();
		const sharedWorkflowRepository = di_1.Container.get(db_1.SharedWorkflowRepository);
		const sharedCredentialRepository = di_1.Container.get(db_1.SharedCredentialsRepository);
		const folderRepository = di_1.Container.get(db_1.FolderRepository);
		const userRepository = di_1.Container.get(db_1.UserRepository);
		const user = await userRepository.findOneBy({ id: memberToDelete.id });
		expect(user).toBeNull();
		const memberToDeleteWorkflowProjectOwner =
			await sharedWorkflowRepository.getWorkflowOwningProject(memberToDeleteWorkflow.id);
		expect(memberToDeleteWorkflowProjectOwner?.id).toBe(teamProject.id);
		const memberToDeleteCredentialProjectOwner =
			await sharedCredentialRepository.findCredentialOwningProject(memberToDeleteCredential.id);
		expect(memberToDeleteCredentialProjectOwner?.id).toBe(teamProject.id);
		const transfereeFolders = await folderRepository.findBy({
			homeProject: { id: teamProject.id },
		});
		const deletedUserFolders = await folderRepository.findBy({
			homeProject: { id: memberPersonalProject.id },
		});
		expect(transfereeFolders).toHaveLength(4);
		expect(transfereeFolders.map((folder) => folder.name)).toEqual(
			expect.arrayContaining(['folder1', 'folder2', 'folder3', 'folder1']),
		);
		expect(deletedUserFolders).toHaveLength(0);
	});
	test('should fail to delete self', async () => {
		await ownerAgent.delete(`/users/${owner.id}`).expect(400);
		const user = await (0, users_1.getUserById)(owner.id);
		expect(user).toBeDefined();
	});
	test('should fail to delete the instance owner', async () => {
		const admin = await (0, users_1.createAdmin)();
		const adminAgent = testServer.authAgentFor(admin);
		await adminAgent.delete(`/users/${owner.id}`).expect(403);
		const user = await (0, users_1.getUserById)(owner.id);
		expect(user).toBeDefined();
	});
	test('should fail to delete a user that does not exist', async () => {
		await ownerAgent
			.delete(`/users/${(0, uuid_1.v4)()}`)
			.query({ transferId: '' })
			.expect(404);
	});
	test('should fail to transfer to a project that does not exist', async () => {
		const member = await (0, users_1.createMember)();
		await ownerAgent.delete(`/users/${member.id}`).query({ transferId: 'foobar' }).expect(404);
		const user = await di_1.Container.get(db_1.UserRepository).findOneBy({ id: member.id });
		expect(user).toBeDefined();
	});
	test('should fail to delete if user to delete is transferee', async () => {
		const member = await (0, users_1.createMember)();
		const personalProject = await (0, backend_test_utils_1.getPersonalProject)(member);
		await ownerAgent
			.delete(`/users/${member.id}`)
			.query({ transferId: personalProject.id })
			.expect(400);
		const user = await di_1.Container.get(db_1.UserRepository).findOneBy({ id: member.id });
		expect(user).toBeDefined();
	});
});
describe('PATCH /users/:id/role', () => {
	let owner;
	let admin;
	let otherAdmin;
	let member;
	let otherMember;
	let ownerAgent;
	let adminAgent;
	let memberAgent;
	let authlessAgent;
	const { NO_ADMIN_ON_OWNER, NO_USER, NO_OWNER_ON_OWNER } =
		users_controller_1.UsersController.ERROR_MESSAGES.CHANGE_ROLE;
	beforeAll(async () => {
		await backend_test_utils_1.testDb.truncate(['User']);
		[owner, admin, otherAdmin, member, otherMember] = await Promise.all([
			await (0, users_1.createOwner)(),
			await (0, users_1.createAdmin)(),
			await (0, users_1.createAdmin)(),
			await (0, users_1.createMember)(),
			await (0, users_1.createMember)(),
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
		});
	});
	describe('member', () => {
		test('should fail to demote owner to member', async () => {
			await memberAgent
				.patch(`/users/${owner.id}/role`)
				.send({
					newRoleName: 'global:member',
				})
				.expect(403, {
					status: 'error',
					message: constants_1.RESPONSE_ERROR_MESSAGES.MISSING_SCOPE,
				});
		});
		test('should fail to demote owner to admin', async () => {
			await memberAgent
				.patch(`/users/${owner.id}/role`)
				.send({
					newRoleName: 'global:admin',
				})
				.expect(403, {
					status: 'error',
					message: constants_1.RESPONSE_ERROR_MESSAGES.MISSING_SCOPE,
				});
		});
		test('should fail to demote admin to member', async () => {
			await memberAgent
				.patch(`/users/${admin.id}/role`)
				.send({
					newRoleName: 'global:member',
				})
				.expect(403, {
					status: 'error',
					message: constants_1.RESPONSE_ERROR_MESSAGES.MISSING_SCOPE,
				});
		});
		test('should fail to promote other member to owner', async () => {
			await memberAgent
				.patch(`/users/${otherMember.id}/role`)
				.send({
					newRoleName: 'global:owner',
				})
				.expect(403, {
					status: 'error',
					message: constants_1.RESPONSE_ERROR_MESSAGES.MISSING_SCOPE,
				});
		});
		test('should fail to promote other member to admin', async () => {
			await memberAgent
				.patch(`/users/${otherMember.id}/role`)
				.send({
					newRoleName: 'global:admin',
				})
				.expect(403, {
					status: 'error',
					message: constants_1.RESPONSE_ERROR_MESSAGES.MISSING_SCOPE,
				});
		});
		test('should fail to promote self to admin', async () => {
			await memberAgent
				.patch(`/users/${member.id}/role`)
				.send({
					newRoleName: 'global:admin',
				})
				.expect(403, {
					status: 'error',
					message: constants_1.RESPONSE_ERROR_MESSAGES.MISSING_SCOPE,
				});
		});
		test('should fail to promote self to owner', async () => {
			await memberAgent
				.patch(`/users/${member.id}/role`)
				.send({
					newRoleName: 'global:owner',
				})
				.expect(403, {
					status: 'error',
					message: constants_1.RESPONSE_ERROR_MESSAGES.MISSING_SCOPE,
				});
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
			const user = await (0, users_1.getUserById)(otherAdmin.id);
			expect(user.role).toBe('global:member');
			otherAdmin = await (0, users_1.createAdmin)();
			adminAgent = testServer.authAgentFor(otherAdmin);
		});
		test('should be able to demote self to member', async () => {
			const response = await adminAgent.patch(`/users/${admin.id}/role`).send({
				newRoleName: 'global:member',
			});
			expect(response.statusCode).toBe(200);
			expect(response.body.data).toStrictEqual({ success: true });
			const user = await (0, users_1.getUserById)(admin.id);
			expect(user.role).toBe('global:member');
			admin = await (0, users_1.createAdmin)();
			adminAgent = testServer.authAgentFor(admin);
		});
		test('should be able to promote member to admin if licensed', async () => {
			const response = await adminAgent.patch(`/users/${member.id}/role`).send({
				newRoleName: 'global:admin',
			});
			expect(response.statusCode).toBe(200);
			expect(response.body.data).toStrictEqual({ success: true });
			const user = await (0, users_1.getUserById)(admin.id);
			expect(user.role).toBe('global:admin');
			member = await (0, users_1.createMember)();
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
			const user = await (0, users_1.getUserById)(admin.id);
			expect(user.role).toBe('global:admin');
			member = await (0, users_1.createMember)();
			memberAgent = testServer.authAgentFor(member);
		});
		test('should be able to demote admin to member', async () => {
			const response = await ownerAgent.patch(`/users/${admin.id}/role`).send({
				newRoleName: 'global:member',
			});
			expect(response.statusCode).toBe(200);
			expect(response.body.data).toStrictEqual({ success: true });
			const user = await (0, users_1.getUserById)(admin.id);
			expect(user.role).toBe('global:member');
			admin = await (0, users_1.createAdmin)();
			adminAgent = testServer.authAgentFor(admin);
		});
	});
	test("should clear credential external secrets usability cache when changing a user's role", async () => {
		const user = await (0, users_1.createAdmin)();
		const [project1, project2] = await Promise.all([
			(0, backend_test_utils_1.createTeamProject)(undefined, user),
			(0, backend_test_utils_1.createTeamProject)(),
		]);
		await Promise.all([
			(0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				user,
				role: 'credential:owner',
			}),
			(0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				project: project1,
				role: 'credential:owner',
			}),
			(0, credentials_1.saveCredential)((0, backend_test_utils_1.randomCredentialPayload)(), {
				project: project2,
				role: 'credential:owner',
			}),
			(0, backend_test_utils_1.linkUserToProject)(user, project2, 'project:editor'),
		]);
		const deleteSpy = jest.spyOn(di_1.Container.get(cache_service_1.CacheService), 'deleteMany');
		const response = await ownerAgent.patch(`/users/${user.id}/role`).send({
			newRoleName: 'global:member',
		});
		expect(deleteSpy).toBeCalledTimes(2);
		deleteSpy.mockClear();
		expect(response.statusCode).toBe(200);
		expect(response.body.data).toStrictEqual({ success: true });
	});
});
//# sourceMappingURL=users.api.test.js.map
