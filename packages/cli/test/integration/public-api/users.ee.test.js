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
const uuid_1 = require('uuid');
const validator_1 = __importDefault(require('validator'));
const license_1 = require('@/license');
const users_1 = require('../shared/db/users');
const utils = __importStar(require('../shared/utils/'));
(0, backend_test_utils_1.mockInstance)(license_1.License, {
	getUsersLimit: jest.fn().mockReturnValue(-1),
});
const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate([
		'SharedCredentials',
		'SharedWorkflow',
		'WorkflowEntity',
		'CredentialsEntity',
		'User',
	]);
});
describe('With license unlimited quota:users', () => {
	describe('GET /users', () => {
		test('should fail due to missing API Key', async () => {
			const authOwnerAgent = testServer.publicApiAgentWithoutApiKey();
			await authOwnerAgent.get('/users').expect(401);
		});
		test('should fail due to invalid API Key', async () => {
			const authOwnerAgent = testServer.publicApiAgentWithApiKey('invalid-key');
			await authOwnerAgent.get('/users').expect(401);
		});
		test('should return all users', async () => {
			const owner = await (0, users_1.createOwnerWithApiKey)();
			const authOwnerAgent = testServer.publicApiAgentFor(owner);
			await (0, users_1.createUser)();
			const response = await authOwnerAgent.get('/users').expect(200);
			expect(response.body.data.length).toBe(2);
			expect(response.body.nextCursor).toBeNull();
			for (const user of response.body.data) {
				const {
					id,
					email,
					firstName,
					lastName,
					personalizationAnswers,
					role,
					password,
					isPending,
					createdAt,
					updatedAt,
				} = user;
				expect(validator_1.default.isUUID(id)).toBe(true);
				expect(email).toBeDefined();
				expect(firstName).toBeDefined();
				expect(lastName).toBeDefined();
				expect(personalizationAnswers).toBeUndefined();
				expect(password).toBeUndefined();
				expect(isPending).toBe(false);
				expect(role).toBeUndefined();
				expect(createdAt).toBeDefined();
				expect(updatedAt).toBeDefined();
			}
		});
		it('should return users filtered by project ID', async () => {
			const [owner, firstMember, secondMember, thirdMember] = await Promise.all([
				(0, users_1.createOwnerWithApiKey)(),
				(0, users_1.createMember)(),
				(0, users_1.createMember)(),
				(0, users_1.createMember)(),
			]);
			const [firstProject, secondProject] = await Promise.all([
				(0, backend_test_utils_1.createTeamProject)(),
				(0, backend_test_utils_1.createTeamProject)(),
			]);
			await Promise.all([
				(0, backend_test_utils_1.linkUserToProject)(firstMember, firstProject, 'project:admin'),
				(0, backend_test_utils_1.linkUserToProject)(secondMember, firstProject, 'project:viewer'),
				(0, backend_test_utils_1.linkUserToProject)(thirdMember, secondProject, 'project:admin'),
			]);
			const response = await testServer.publicApiAgentFor(owner).get('/users').query({
				projectId: firstProject.id,
			});
			expect(response.status).toBe(200);
			expect(response.body.data.length).toBe(2);
			expect(response.body.nextCursor).toBeNull();
			expect(response.body.data.map((user) => user.id)).toEqual(
				expect.arrayContaining([firstMember.id, secondMember.id]),
			);
		});
	});
	describe('GET /users/:id', () => {
		test('should fail due to missing API Key', async () => {
			const owner = await (0, users_1.createOwnerWithApiKey)();
			const authOwnerAgent = testServer.publicApiAgentWithoutApiKey();
			await authOwnerAgent.get(`/users/${owner.id}`).expect(401);
		});
		test('should fail due to invalid API Key', async () => {
			const owner = await (0, users_1.createOwnerWithApiKey)();
			const authOwnerAgent = testServer.publicApiAgentWithApiKey('invalid-key');
			await authOwnerAgent.get(`/users/${owner.id}`).expect(401);
		});
		test('should fail due to member trying to access owner only endpoint', async () => {
			const member = await (0, users_1.createMemberWithApiKey)();
			const authMemberAgent = testServer.publicApiAgentFor(member);
			await authMemberAgent.get(`/users/${member.id}`).expect(403);
		});
		test('should return 404 for non-existing id ', async () => {
			const owner = await (0, users_1.createOwnerWithApiKey)();
			const authOwnerAgent = testServer.publicApiAgentFor(owner);
			await authOwnerAgent.get(`/users/${(0, uuid_1.v4)()}`).expect(404);
		});
		test('should return a pending user', async () => {
			const owner = await (0, users_1.createOwnerWithApiKey)();
			const { id: memberId } = await (0, users_1.createUserShell)('global:member');
			const authOwnerAgent = testServer.publicApiAgentFor(owner);
			const response = await authOwnerAgent.get(`/users/${memberId}`).expect(200);
			const {
				id,
				email,
				firstName,
				lastName,
				personalizationAnswers,
				role,
				password,
				isPending,
				createdAt,
				updatedAt,
			} = response.body;
			expect(validator_1.default.isUUID(id)).toBe(true);
			expect(email).toBeDefined();
			expect(firstName).toBeDefined();
			expect(lastName).toBeDefined();
			expect(personalizationAnswers).toBeUndefined();
			expect(password).toBeUndefined();
			expect(role).toBeUndefined();
			expect(createdAt).toBeDefined();
			expect(isPending).toBeDefined();
			expect(isPending).toBeTruthy();
			expect(updatedAt).toBeDefined();
		});
	});
	describe('GET /users/:email', () => {
		test('with non-existing email should return 404', async () => {
			const owner = await (0, users_1.createOwnerWithApiKey)();
			const authOwnerAgent = testServer.publicApiAgentFor(owner);
			await authOwnerAgent.get('/users/jhondoe@gmail.com').expect(404);
		});
		test('should return a user', async () => {
			const owner = await (0, users_1.createOwnerWithApiKey)();
			const authOwnerAgent = testServer.publicApiAgentFor(owner);
			const response = await authOwnerAgent.get(`/users/${owner.email}`).expect(200);
			const {
				id,
				email,
				firstName,
				lastName,
				personalizationAnswers,
				role,
				password,
				isPending,
				createdAt,
				updatedAt,
			} = response.body;
			expect(validator_1.default.isUUID(id)).toBe(true);
			expect(email).toBeDefined();
			expect(firstName).toBeDefined();
			expect(lastName).toBeDefined();
			expect(personalizationAnswers).toBeUndefined();
			expect(password).toBeUndefined();
			expect(isPending).toBe(false);
			expect(role).toBeUndefined();
			expect(createdAt).toBeDefined();
			expect(updatedAt).toBeDefined();
		});
	});
});
describe('With license without quota:users', () => {
	let authOwnerAgent;
	beforeEach(async () => {
		(0, backend_test_utils_1.mockInstance)(license_1.License, {
			getUsersLimit: jest.fn().mockReturnValue(null),
		});
		const owner = await (0, users_1.createOwnerWithApiKey)();
		authOwnerAgent = testServer.publicApiAgentFor(owner);
	});
	test('GET /users should fail due to invalid license', async () => {
		await authOwnerAgent.get('/users').expect(403);
	});
	test('GET /users/:id should fail due to invalid license', async () => {
		await authOwnerAgent.get(`/users/${(0, uuid_1.v4)()}`).expect(403);
	});
});
//# sourceMappingURL=users.ee.test.js.map
