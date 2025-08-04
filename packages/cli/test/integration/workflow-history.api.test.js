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
const users_1 = require('./shared/db/users');
const workflow_history_1 = require('./shared/db/workflow-history');
const utils = __importStar(require('./shared/utils/'));
let owner;
let authOwnerAgent;
let member;
let authMemberAgent;
const testServer = utils.setupTestServer({
	endpointGroups: ['workflowHistory'],
	enabledFeatures: ['feat:workflowHistory'],
});
beforeAll(async () => {
	owner = await (0, users_1.createOwner)();
	authOwnerAgent = testServer.authAgentFor(owner);
	member = await (0, users_1.createUser)();
	authMemberAgent = testServer.authAgentFor(member);
});
afterEach(async () => {
	await backend_test_utils_1.testDb.truncate([
		'WorkflowEntity',
		'SharedWorkflow',
		'WorkflowHistory',
	]);
});
describe('GET /workflow-history/:workflowId', () => {
	test('should not work when license is not available', async () => {
		testServer.license.disable('feat:workflowHistory');
		const resp = await authOwnerAgent.get('/workflow-history/workflow/badid');
		expect(resp.status).toBe(403);
		expect(resp.text).toBe('Workflow History license data not found');
	});
	test('should not return anything on an invalid workflow ID', async () => {
		await (0, backend_test_utils_1.createWorkflow)(undefined, owner);
		const resp = await authOwnerAgent.get('/workflow-history/workflow/badid');
		expect(resp.status).toBe(404);
	});
	test('should not return anything if not shared with user', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)(undefined, owner);
		const resp = await authMemberAgent.get('/workflow-history/workflow/' + workflow.id);
		expect(resp.status).toBe(404);
	});
	test('should return any empty list if no versions', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)(undefined, owner);
		const resp = await authOwnerAgent.get('/workflow-history/workflow/' + workflow.id);
		expect(resp.status).toBe(200);
		expect(resp.body).toEqual({ data: [] });
	});
	test('should return versions for workflow', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)(undefined, owner);
		const versions = await Promise.all(
			new Array(10)
				.fill(undefined)
				.map(
					async (_, i) =>
						await (0, workflow_history_1.createWorkflowHistoryItem)(workflow.id, {
							createdAt: new Date(Date.now() + i),
						}),
				),
		);
		const last = versions.sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf())[0];
		delete last.nodes;
		delete last.connections;
		last.createdAt = last.createdAt.toISOString();
		last.updatedAt = last.updatedAt.toISOString();
		const resp = await authOwnerAgent.get('/workflow-history/workflow/' + workflow.id);
		expect(resp.status).toBe(200);
		expect(resp.body.data).toHaveLength(10);
		expect(resp.body.data[0]).toEqual(last);
	});
	test('should return versions only for workflow id provided', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)(undefined, owner);
		const workflow2 = await (0, backend_test_utils_1.createWorkflow)(undefined, owner);
		const versions = await Promise.all(
			new Array(10)
				.fill(undefined)
				.map(
					async (_, i) =>
						await (0, workflow_history_1.createWorkflowHistoryItem)(workflow.id, {
							createdAt: new Date(Date.now() + i),
						}),
				),
		);
		await Promise.all(
			new Array(10)
				.fill(undefined)
				.map(async (_) => await (0, workflow_history_1.createWorkflowHistoryItem)(workflow2.id)),
		);
		const last = versions.sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf())[0];
		delete last.nodes;
		delete last.connections;
		last.createdAt = last.createdAt.toISOString();
		last.updatedAt = last.updatedAt.toISOString();
		const resp = await authOwnerAgent.get('/workflow-history/workflow/' + workflow.id);
		expect(resp.status).toBe(200);
		expect(resp.body.data).toHaveLength(10);
		expect(resp.body.data[0]).toEqual(last);
	});
	test('should work with take parameter', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)(undefined, owner);
		const versions = await Promise.all(
			new Array(10)
				.fill(undefined)
				.map(
					async (_, i) =>
						await (0, workflow_history_1.createWorkflowHistoryItem)(workflow.id, {
							createdAt: new Date(Date.now() + i),
						}),
				),
		);
		const last = versions.sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf())[0];
		delete last.nodes;
		delete last.connections;
		last.createdAt = last.createdAt.toISOString();
		last.updatedAt = last.updatedAt.toISOString();
		const resp = await authOwnerAgent.get(`/workflow-history/workflow/${workflow.id}?take=5`);
		expect(resp.status).toBe(200);
		expect(resp.body.data).toHaveLength(5);
		expect(resp.body.data[0]).toEqual(last);
	});
	test('should work with skip parameter', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)(undefined, owner);
		const versions = await Promise.all(
			new Array(10)
				.fill(undefined)
				.map(
					async (_, i) =>
						await (0, workflow_history_1.createWorkflowHistoryItem)(workflow.id, {
							createdAt: new Date(Date.now() + i),
						}),
				),
		);
		const last = versions.sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf())[5];
		delete last.nodes;
		delete last.connections;
		last.createdAt = last.createdAt.toISOString();
		last.updatedAt = last.updatedAt.toISOString();
		const resp = await authOwnerAgent.get(
			`/workflow-history/workflow/${workflow.id}?skip=5&take=20`,
		);
		expect(resp.status).toBe(200);
		expect(resp.body.data).toHaveLength(5);
		expect(resp.body.data[0]).toEqual(last);
	});
});
describe('GET /workflow-history/workflow/:workflowId/version/:versionId', () => {
	test('should not work when license is not available', async () => {
		testServer.license.disable('feat:workflowHistory');
		const resp = await authOwnerAgent.get('/workflow-history/workflow/badid/version/badid');
		expect(resp.status).toBe(403);
		expect(resp.text).toBe('Workflow History license data not found');
	});
	test('should not return anything on an invalid workflow ID', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)(undefined, owner);
		const version = await (0, workflow_history_1.createWorkflowHistoryItem)(workflow.id);
		const resp = await authOwnerAgent.get(
			`/workflow-history/workflow/badid/version/${version.versionId}`,
		);
		expect(resp.status).toBe(404);
	});
	test('should not return anything on an invalid version ID', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)(undefined, owner);
		await (0, workflow_history_1.createWorkflowHistoryItem)(workflow.id);
		const resp = await authOwnerAgent.get(
			`/workflow-history/workflow/${workflow.id}/version/badid`,
		);
		expect(resp.status).toBe(404);
	});
	test('should return version', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)(undefined, owner);
		const version = await (0, workflow_history_1.createWorkflowHistoryItem)(workflow.id);
		const resp = await authOwnerAgent.get(
			`/workflow-history/workflow/${workflow.id}/version/${version.versionId}`,
		);
		expect(resp.status).toBe(200);
		expect(resp.body.data).toEqual({
			...version,
			createdAt: version.createdAt.toISOString(),
			updatedAt: version.updatedAt.toISOString(),
		});
	});
	test('should not return anything if not shared with user', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)(undefined, owner);
		const version = await (0, workflow_history_1.createWorkflowHistoryItem)(workflow.id);
		const resp = await authMemberAgent.get(
			`/workflow-history/workflow/${workflow.id}/version/${version.versionId}`,
		);
		expect(resp.status).toBe(404);
	});
	test('should not return anything if not shared with user and using workflow owned by unshared user', async () => {
		const workflow = await (0, backend_test_utils_1.createWorkflow)(undefined, owner);
		const workflowMember = await (0, backend_test_utils_1.createWorkflow)(undefined, member);
		const version = await (0, workflow_history_1.createWorkflowHistoryItem)(workflow.id);
		const resp = await authMemberAgent.get(
			`/workflow-history/workflow/${workflowMember.id}/version/${version.versionId}`,
		);
		expect(resp.status).toBe(404);
	});
});
//# sourceMappingURL=workflow-history.api.test.js.map
