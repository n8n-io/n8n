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
const di_1 = require('@n8n/di');
const source_control_preferences_service_ee_1 = require('@/environments.ee/source-control/source-control-preferences.service.ee');
const source_control_service_ee_1 = require('@/environments.ee/source-control/source-control.service.ee');
const telemetry_1 = require('@/telemetry');
const users_1 = require('../shared/db/users');
const utils = __importStar(require('../shared/utils'));
let authOwnerAgent;
let owner;
(0, backend_test_utils_1.mockInstance)(telemetry_1.Telemetry);
const testServer = utils.setupTestServer({
	endpointGroups: ['sourceControl', 'license', 'auth'],
	enabledFeatures: ['feat:sourceControl', 'feat:sharing'],
});
let sourceControlPreferencesService;
beforeAll(async () => {
	owner = await (0, users_1.createUser)({ role: 'global:owner' });
	authOwnerAgent = testServer.authAgentFor(owner);
	sourceControlPreferencesService = di_1.Container.get(
		source_control_preferences_service_ee_1.SourceControlPreferencesService,
	);
	await sourceControlPreferencesService.setPreferences({
		connected: true,
		keyGeneratorType: 'rsa',
	});
});
describe('GET /sourceControl/preferences', () => {
	test('should return Source Control preferences', async () => {
		await authOwnerAgent
			.get('/source-control/preferences')
			.expect(200)
			.expect((res) => {
				return 'repositoryUrl' in res.body && 'branchName' in res.body;
			});
	});
	test('should return repo sync status', async () => {
		di_1.Container.get(source_control_service_ee_1.SourceControlService).getStatus = async () => {
			return [
				{
					id: 'haQetoXq9GxHSkft',
					name: 'My workflow 6 edit',
					type: 'workflow',
					status: 'modified',
					location: 'local',
					conflict: true,
					file: '/Users/michael/.n8n/git/workflows/haQetoXq9GxHSkft.json',
					updatedAt: '2023-07-14T11:24:41.000Z',
				},
			];
		};
		await authOwnerAgent
			.get('/source-control/get-status')
			.query({ direction: 'push', preferLocalVersion: 'true', verbose: 'false' })
			.expect(200)
			.expect((res) => {
				const data = res.body.data;
				expect(data.length).toBe(1);
				expect(data[0].id).toBe('haQetoXq9GxHSkft');
			});
	});
	test('refreshing key pairsshould return new rsa key', async () => {
		const res = await authOwnerAgent.post('/source-control/generate-key-pair').send().expect(200);
		expect(res.body.data).toHaveProperty('publicKey');
		expect(res.body.data).toHaveProperty('keyGeneratorType');
		expect(res.body.data.keyGeneratorType).toBe('rsa');
		expect(res.body.data.publicKey).toContain('ssh-rsa');
	});
});
//# sourceMappingURL=source-control.api.test.js.map
