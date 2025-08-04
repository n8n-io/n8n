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
const telemetry_1 = require('@/telemetry');
const users_1 = require('../shared/db/users');
const utils = __importStar(require('../shared/utils/'));
(0, backend_test_utils_1.mockInstance)(telemetry_1.Telemetry);
let member;
const testServer = utils.setupTestServer({
	endpointGroups: ['workflows'],
	enabledFeatures: ['feat:sharing', 'feat:advancedPermissions'],
});
beforeAll(async () => {
	member = await (0, users_1.createUser)({ role: 'global:member' });
	await utils.initNodeTypes();
});
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate(['WorkflowEntity', 'SharedWorkflow']);
});
describe('PUT /:workflowId/transfer', () => {
	test('can transfer an active workflow', async () => {
		const destinationProject = await (0, backend_test_utils_1.createTeamProject)(
			'Team Project',
			member,
		);
		const workflow = await (0, backend_test_utils_1.createWorkflowWithTrigger)(
			{ active: true },
			member,
		);
		const response = await testServer
			.authAgentFor(member)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(200);
		expect(response.body).toEqual({});
	});
});
//# sourceMappingURL=workflows.controller-with-active-workflow-manager.ee.test.js.map
