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
const message_event_bus_1 = require('@/eventbus/message-event-bus/message-event-bus');
const execution_recovery_service_1 = require('@/executions/execution-recovery.service');
const users_1 = require('./shared/db/users');
const utils = __importStar(require('./shared/utils/'));
let owner;
let authOwnerAgent;
(0, backend_test_utils_1.mockInstance)(message_event_bus_1.MessageEventBus);
(0, backend_test_utils_1.mockInstance)(execution_recovery_service_1.ExecutionRecoveryService);
const testServer = utils.setupTestServer({
	endpointGroups: ['eventBus'],
	enabledFeatures: [],
});
beforeAll(async () => {
	owner = await (0, users_1.createUser)({ role: 'global:owner' });
	authOwnerAgent = testServer.authAgentFor(owner);
});
describe('GET /eventbus/destination', () => {
	test('should fail due to missing authentication', async () => {
		const response = await testServer.authlessAgent.get('/eventbus/destination');
		expect(response.statusCode).toBe(401);
	});
	test('should fail due to missing license when authenticated', async () => {
		const response = await authOwnerAgent.get('/eventbus/destination');
		expect(response.statusCode).toBe(403);
	});
});
describe('POST /eventbus/destination', () => {
	test('should fail due to missing authentication', async () => {
		const response = await testServer.authlessAgent.post('/eventbus/destination');
		expect(response.statusCode).toBe(401);
	});
	test('should fail due to missing license when authenticated', async () => {
		const response = await authOwnerAgent.post('/eventbus/destination');
		expect(response.statusCode).toBe(403);
	});
});
describe('DELETE /eventbus/destination', () => {
	test('should fail due to missing authentication', async () => {
		const response = await testServer.authlessAgent.del('/eventbus/destination');
		expect(response.statusCode).toBe(401);
	});
	test('should fail due to missing license when authenticated', async () => {
		const response = await authOwnerAgent.del('/eventbus/destination');
		expect(response.statusCode).toBe(403);
	});
});
//# sourceMappingURL=eventbus.test.js.map
