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
const permissions_1 = require('@n8n/permissions');
const users_1 = require('./shared/db/users');
const utils = __importStar(require('./shared/utils/'));
const testServer = utils.setupTestServer({
	endpointGroups: ['role'],
});
let memberAgent;
const expectedCategories = ['global', 'project', 'credential', 'workflow'];
let expectedGlobalRoles;
let expectedProjectRoles;
let expectedCredentialRoles;
let expectedWorkflowRoles;
beforeAll(async () => {
	memberAgent = testServer.authAgentFor(await (0, users_1.createMember)());
	expectedGlobalRoles = [
		{
			name: 'Owner',
			role: 'global:owner',
			scopes: (0, permissions_1.getRoleScopes)('global:owner'),
			licensed: true,
		},
		{
			name: 'Admin',
			role: 'global:admin',
			scopes: (0, permissions_1.getRoleScopes)('global:admin'),
			licensed: false,
		},
		{
			name: 'Member',
			role: 'global:member',
			scopes: (0, permissions_1.getRoleScopes)('global:member'),
			licensed: true,
		},
	];
	expectedProjectRoles = [
		{
			name: 'Project Owner',
			role: 'project:personalOwner',
			scopes: (0, permissions_1.getRoleScopes)('project:personalOwner'),
			licensed: true,
		},
		{
			name: 'Project Admin',
			role: 'project:admin',
			scopes: (0, permissions_1.getRoleScopes)('project:admin'),
			licensed: false,
		},
		{
			name: 'Project Editor',
			role: 'project:editor',
			scopes: (0, permissions_1.getRoleScopes)('project:editor'),
			licensed: false,
		},
	];
	expectedCredentialRoles = [
		{
			name: 'Credential Owner',
			role: 'credential:owner',
			scopes: (0, permissions_1.getRoleScopes)('credential:owner'),
			licensed: true,
		},
		{
			name: 'Credential User',
			role: 'credential:user',
			scopes: (0, permissions_1.getRoleScopes)('credential:user'),
			licensed: true,
		},
	];
	expectedWorkflowRoles = [
		{
			name: 'Workflow Owner',
			role: 'workflow:owner',
			scopes: (0, permissions_1.getRoleScopes)('workflow:owner'),
			licensed: true,
		},
		{
			name: 'Workflow Editor',
			role: 'workflow:editor',
			scopes: (0, permissions_1.getRoleScopes)('workflow:editor'),
			licensed: true,
		},
	];
});
describe('GET /roles/', () => {
	test('should return all role categories', async () => {
		const resp = await memberAgent.get('/roles/');
		expect(resp.status).toBe(200);
		const data = resp.body.data;
		const categories = [...Object.keys(data)];
		expect(categories.length).toBe(expectedCategories.length);
		expect(expectedCategories.every((c) => categories.includes(c))).toBe(true);
	});
	test('should return fixed global roles', async () => {
		const resp = await memberAgent.get('/roles/');
		expect(resp.status).toBe(200);
		for (const role of expectedGlobalRoles) {
			expect(resp.body.data.global).toContainEqual(role);
		}
	});
	test('should return fixed project roles', async () => {
		const resp = await memberAgent.get('/roles/');
		expect(resp.status).toBe(200);
		for (const role of expectedProjectRoles) {
			expect(resp.body.data.project).toContainEqual(role);
		}
	});
	test('should return fixed credential sharing roles', async () => {
		const resp = await memberAgent.get('/roles/');
		expect(resp.status).toBe(200);
		for (const role of expectedCredentialRoles) {
			expect(resp.body.data.credential).toContainEqual(role);
		}
	});
	test('should return fixed workflow sharing roles', async () => {
		const resp = await memberAgent.get('/roles/');
		expect(resp.status).toBe(200);
		for (const role of expectedWorkflowRoles) {
			expect(resp.body.data.workflow).toContainEqual(role);
		}
	});
});
//# sourceMappingURL=role.api.test.js.map
