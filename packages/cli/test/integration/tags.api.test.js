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
const users_1 = require('./shared/db/users');
const utils = __importStar(require('./shared/utils/'));
let authOwnerAgent;
const testServer = utils.setupTestServer({ endpointGroups: ['tags'] });
beforeAll(async () => {
	const ownerShell = await (0, users_1.createUserShell)('global:owner');
	authOwnerAgent = testServer.authAgentFor(ownerShell);
});
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate(['TagEntity']);
});
describe('POST /tags', () => {
	test('should create tag', async () => {
		const resp = await authOwnerAgent.post('/tags').send({ name: 'test' });
		expect(resp.statusCode).toBe(200);
		const dbTag = await di_1.Container.get(db_1.TagRepository).findBy({ name: 'test' });
		expect(dbTag.length === 1);
	});
	test('should not create duplicate tag', async () => {
		const newTag = di_1.Container.get(db_1.TagRepository).create({ name: 'test' });
		await di_1.Container.get(db_1.TagRepository).save(newTag);
		const resp = await authOwnerAgent.post('/tags').send({ name: 'test' });
		expect(resp.status).toBe(500);
		const dbTag = await di_1.Container.get(db_1.TagRepository).findBy({ name: 'test' });
		expect(dbTag.length).toBe(1);
	});
	test('should delete tag', async () => {
		const newTag = di_1.Container.get(db_1.TagRepository).create({ name: 'test' });
		await di_1.Container.get(db_1.TagRepository).save(newTag);
		const resp = await authOwnerAgent.delete(`/tags/${newTag.id}`);
		expect(resp.status).toBe(200);
		const dbTag = await di_1.Container.get(db_1.TagRepository).findBy({ name: 'test' });
		expect(dbTag.length).toBe(0);
	});
	test('should update tag name', async () => {
		const newTag = di_1.Container.get(db_1.TagRepository).create({ name: 'test' });
		await di_1.Container.get(db_1.TagRepository).save(newTag);
		const resp = await authOwnerAgent.patch(`/tags/${newTag.id}`).send({ name: 'updated' });
		expect(resp.status).toBe(200);
		const dbTag = await di_1.Container.get(db_1.TagRepository).findBy({ name: 'updated' });
		expect(dbTag.length).toBe(1);
	});
	test('should retrieve all tags', async () => {
		const newTag = di_1.Container.get(db_1.TagRepository).create({ name: 'test' });
		const savedTag = await di_1.Container.get(db_1.TagRepository).save(newTag);
		const resp = await authOwnerAgent.get('/tags');
		expect(resp.status).toBe(200);
		expect(resp.body.data.length).toBe(1);
		expect(resp.body.data[0]).toMatchObject({
			id: savedTag.id,
			name: savedTag.name,
			createdAt: savedTag.createdAt.toISOString(),
			updatedAt: savedTag.updatedAt.toISOString(),
		});
	});
	test('should retrieve all tags with with usage count', async () => {
		const newTag = di_1.Container.get(db_1.TagRepository).create({ name: 'test' });
		const savedTag = await di_1.Container.get(db_1.TagRepository).save(newTag);
		const resp = await authOwnerAgent.get('/tags').query({ withUsageCount: 'true' });
		expect(resp.status).toBe(200);
		expect(resp.body.data.length).toBe(1);
		expect(resp.body.data[0]).toMatchObject({
			id: savedTag.id,
			name: savedTag.name,
			createdAt: savedTag.createdAt.toISOString(),
			updatedAt: savedTag.updatedAt.toISOString(),
			usageCount: 0,
		});
	});
});
//# sourceMappingURL=tags.api.test.js.map
