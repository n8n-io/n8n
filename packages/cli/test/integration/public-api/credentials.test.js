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
const n8n_workflow_1 = require('n8n-workflow');
const credentials_1 = require('../shared/db/credentials');
const users_1 = require('../shared/db/users');
const utils = __importStar(require('../shared/utils/'));
let owner;
let member;
let authOwnerAgent;
let authMemberAgent;
let saveCredential;
const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });
beforeAll(async () => {
	owner = await (0, users_1.createOwnerWithApiKey)();
	member = await (0, users_1.createMemberWithApiKey)();
	authOwnerAgent = testServer.publicApiAgentFor(owner);
	authMemberAgent = testServer.publicApiAgentFor(member);
	saveCredential = (0, credentials_1.affixRoleToSaveCredential)('credential:owner');
	await utils.initCredentialsTypes();
});
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate(['SharedCredentials', 'CredentialsEntity']);
});
describe('POST /credentials', () => {
	test('should create credentials', async () => {
		const payload = {
			name: 'test credential',
			type: 'githubApi',
			data: {
				accessToken: 'abcdefghijklmnopqrstuvwxyz',
				user: 'test',
				server: 'testServer',
			},
		};
		const response = await authOwnerAgent.post('/credentials').send(payload);
		expect(response.statusCode).toBe(200);
		const { id, name, type } = response.body;
		expect(name).toBe(payload.name);
		expect(type).toBe(payload.type);
		const credential = await di_1.Container.get(db_1.CredentialsRepository).findOneByOrFail({ id });
		expect(credential.name).toBe(payload.name);
		expect(credential.type).toBe(payload.type);
		expect(credential.data).not.toBe(payload.data);
		const sharedCredential = await di_1.Container.get(
			db_1.SharedCredentialsRepository,
		).findOneOrFail({
			relations: { credentials: true },
			where: {
				credentialsId: credential.id,
				project: {
					type: 'personal',
					projectRelations: {
						userId: owner.id,
					},
				},
			},
		});
		expect(sharedCredential.role).toEqual('credential:owner');
		expect(sharedCredential.credentials.name).toBe(payload.name);
	});
	test('should fail with invalid inputs', async () => {
		for (const invalidPayload of INVALID_PAYLOADS) {
			const response = await authOwnerAgent.post('/credentials').send(invalidPayload);
			expect(response.statusCode === 400 || response.statusCode === 415).toBe(true);
		}
	});
});
describe('DELETE /credentials/:id', () => {
	test('should delete owned cred for owner', async () => {
		const savedCredential = await saveCredential(dbCredential(), { user: owner });
		const response = await authOwnerAgent.delete(`/credentials/${savedCredential.id}`);
		expect(response.statusCode).toBe(200);
		const { name, type } = response.body;
		expect(name).toBe(savedCredential.name);
		expect(type).toBe(savedCredential.type);
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
		const savedCredential = await saveCredential(dbCredential(), { user: member });
		const response = await authOwnerAgent.delete(`/credentials/${savedCredential.id}`);
		expect(response.statusCode).toBe(200);
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
		const savedCredential = await saveCredential(dbCredential(), { user: member });
		const response = await authMemberAgent.delete(`/credentials/${savedCredential.id}`);
		expect(response.statusCode).toBe(200);
		const { name, type } = response.body;
		expect(name).toBe(savedCredential.name);
		expect(type).toBe(savedCredential.type);
		const deletedCredential = await di_1.Container.get(db_1.CredentialsRepository).findOneBy({
			id: savedCredential.id,
		});
		expect(deletedCredential).toBeNull();
		const deletedSharedCredential = await di_1.Container.get(
			db_1.SharedCredentialsRepository,
		).findOneBy({});
		expect(deletedSharedCredential).toBeNull();
	});
	test('should delete owned cred for member but leave others untouched', async () => {
		const anotherMember = await (0, users_1.createMemberWithApiKey)();
		const savedCredential = await saveCredential(dbCredential(), { user: member });
		const notToBeChangedCredential = await saveCredential(dbCredential(), { user: member });
		const notToBeChangedCredential2 = await saveCredential(dbCredential(), {
			user: anotherMember,
		});
		const response = await authMemberAgent.delete(`/credentials/${savedCredential.id}`);
		expect(response.statusCode).toBe(200);
		const { name, type } = response.body;
		expect(name).toBe(savedCredential.name);
		expect(type).toBe(savedCredential.type);
		const deletedCredential = await di_1.Container.get(db_1.CredentialsRepository).findOneBy({
			id: savedCredential.id,
		});
		expect(deletedCredential).toBeNull();
		const deletedSharedCredential = await di_1.Container.get(
			db_1.SharedCredentialsRepository,
		).findOne({
			where: {
				credentialsId: savedCredential.id,
			},
		});
		expect(deletedSharedCredential).toBeNull();
		await Promise.all(
			[notToBeChangedCredential, notToBeChangedCredential2].map(async (credential) => {
				const untouchedCredential = await di_1.Container.get(db_1.CredentialsRepository).findOneBy({
					id: credential.id,
				});
				expect(untouchedCredential).toEqual(credential);
				const untouchedSharedCredential = await di_1.Container.get(
					db_1.SharedCredentialsRepository,
				).findOne({
					where: {
						credentialsId: credential.id,
					},
				});
				expect(untouchedSharedCredential).toBeDefined();
			}),
		);
	});
	test('should not delete non-owned cred for member', async () => {
		const savedCredential = await saveCredential(dbCredential(), { user: owner });
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
describe('GET /credentials/schema/:credentialType', () => {
	test('should fail due to not found type', async () => {
		const response = await authOwnerAgent.get('/credentials/schema/testing');
		expect(response.statusCode).toBe(404);
	});
	test('should retrieve credential type', async () => {
		const response = await authOwnerAgent.get('/credentials/schema/ftp');
		const { additionalProperties, type, properties, required } = response.body;
		expect(additionalProperties).toBe(false);
		expect(type).toBe('object');
		expect(properties.host.type).toBe('string');
		expect(properties.port.type).toBe('number');
		expect(properties.username.type).toBe('string');
		expect(properties.password.type).toBe('string');
		expect(required).toEqual(expect.arrayContaining(['host', 'port']));
		expect(response.statusCode).toBe(200);
	});
});
describe('PUT /credentials/:id/transfer', () => {
	test('should transfer credential to project', async () => {
		const [firstProject, secondProject] = await Promise.all([
			(0, backend_test_utils_1.createTeamProject)('first-project', owner),
			(0, backend_test_utils_1.createTeamProject)('second-project', owner),
		]);
		const credentials = await (0, credentials_1.createCredentials)(
			{ name: 'Test', type: 'test', data: '' },
			firstProject,
		);
		const response = await authOwnerAgent.put(`/credentials/${credentials.id}/transfer`).send({
			destinationProjectId: secondProject.id,
		});
		expect(response.statusCode).toBe(204);
	});
	test('should transfer the right credential, not the first one it finds', async () => {
		const [firstProject, secondProject] = await Promise.all([
			(0, backend_test_utils_1.createTeamProject)('first-project', owner),
			(0, backend_test_utils_1.createTeamProject)('second-project', owner),
		]);
		const [firstCredential, secondCredential] = await Promise.all([
			(0, credentials_1.createCredentials)({ name: 'Test', type: 'test', data: '' }, firstProject),
			(0, credentials_1.createCredentials)({ name: 'Test', type: 'test', data: '' }, firstProject),
		]);
		const response = await authOwnerAgent.put(`/credentials/${secondCredential.id}/transfer`).send({
			destinationProjectId: secondProject.id,
		});
		expect(response.statusCode).toBe(204);
		{
			const sharings = await (0, credentials_1.getCredentialSharings)(secondCredential);
			expect(sharings).toHaveLength(1);
			expect(sharings[0]).toMatchObject({ projectId: secondProject.id });
		}
		{
			const sharings = await (0, credentials_1.getCredentialSharings)(firstCredential);
			expect(sharings).toHaveLength(1);
			expect(sharings[0]).toMatchObject({ projectId: firstProject.id });
		}
	});
	test('if no destination project, should reject', async () => {
		const project = await (0, backend_test_utils_1.createTeamProject)('first-project', member);
		const credentials = await (0, credentials_1.createCredentials)(
			{ name: 'Test', type: 'test', data: '' },
			project,
		);
		const response = await authOwnerAgent.put(`/credentials/${credentials.id}/transfer`).send({});
		expect(response.statusCode).toBe(400);
	});
});
const credentialPayload = () => ({
	name: (0, backend_test_utils_1.randomName)(),
	type: 'githubApi',
	data: {
		accessToken: (0, n8n_workflow_1.randomString)(6, 16),
		server: (0, n8n_workflow_1.randomString)(1, 10),
		user: (0, n8n_workflow_1.randomString)(1, 10),
	},
});
const dbCredential = () => {
	const credential = credentialPayload();
	return credential;
};
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
	[],
	undefined,
];
//# sourceMappingURL=credentials.test.js.map
