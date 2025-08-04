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
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const validator_1 = __importDefault(require('validator'));
const config_1 = __importDefault(require('@/config'));
const users_1 = require('./shared/db/users');
const utils = __importStar(require('./shared/utils/'));
const testServer = utils.setupTestServer({ endpointGroups: ['owner'] });
let ownerShell;
beforeEach(async () => {
	ownerShell = await (0, users_1.createUserShell)('global:owner');
	config_1.default.set('userManagement.isInstanceOwnerSetUp', false);
});
afterEach(async () => {
	await backend_test_utils_1.testDb.truncate(['User']);
});
describe('POST /owner/setup', () => {
	test('should create owner and enable isInstanceOwnerSetUp', async () => {
		const newOwnerData = {
			email: (0, backend_test_utils_1.randomEmail)(),
			firstName: (0, backend_test_utils_1.randomName)(),
			lastName: (0, backend_test_utils_1.randomName)(),
			password: (0, backend_test_utils_1.randomValidPassword)(),
		};
		const response = await testServer.authlessAgent.post('/owner/setup').send(newOwnerData);
		expect(response.statusCode).toBe(200);
		const {
			id,
			email,
			firstName,
			lastName,
			personalizationAnswers,
			role,
			password,
			isPending,
			apiKey,
			globalScopes,
		} = response.body.data;
		expect(validator_1.default.isUUID(id)).toBe(true);
		expect(email).toBe(newOwnerData.email);
		expect(firstName).toBe(newOwnerData.firstName);
		expect(lastName).toBe(newOwnerData.lastName);
		expect(personalizationAnswers).toBeNull();
		expect(password).toBeUndefined();
		expect(isPending).toBe(false);
		expect(role).toBe('global:owner');
		expect(apiKey).toBeUndefined();
		expect(globalScopes).not.toHaveLength(0);
		const storedOwner = await di_1.Container.get(db_1.UserRepository).findOneByOrFail({ id });
		expect(storedOwner.password).not.toBe(newOwnerData.password);
		expect(storedOwner.email).toBe(newOwnerData.email);
		expect(storedOwner.firstName).toBe(newOwnerData.firstName);
		expect(storedOwner.lastName).toBe(newOwnerData.lastName);
		const isInstanceOwnerSetUpConfig = config_1.default.getEnv(
			'userManagement.isInstanceOwnerSetUp',
		);
		expect(isInstanceOwnerSetUpConfig).toBe(true);
		const isInstanceOwnerSetUpSetting = await utils.isInstanceOwnerSetUp();
		expect(isInstanceOwnerSetUpSetting).toBe(true);
	});
	test('should create owner with lowercased email', async () => {
		const newOwnerData = {
			email: (0, backend_test_utils_1.randomEmail)().toUpperCase(),
			firstName: (0, backend_test_utils_1.randomName)(),
			lastName: (0, backend_test_utils_1.randomName)(),
			password: (0, backend_test_utils_1.randomValidPassword)(),
		};
		const response = await testServer.authlessAgent.post('/owner/setup').send(newOwnerData);
		expect(response.statusCode).toBe(200);
		const { id, email } = response.body.data;
		expect(id).toBe(ownerShell.id);
		expect(email).toBe(newOwnerData.email.toLowerCase());
		const storedOwner = await di_1.Container.get(db_1.UserRepository).findOneByOrFail({ id });
		expect(storedOwner.email).toBe(newOwnerData.email.toLowerCase());
	});
	const INVALID_POST_OWNER_PAYLOADS = [
		{
			email: '',
			firstName: (0, backend_test_utils_1.randomName)(),
			lastName: (0, backend_test_utils_1.randomName)(),
			password: (0, backend_test_utils_1.randomValidPassword)(),
		},
		{
			email: (0, backend_test_utils_1.randomEmail)(),
			firstName: '',
			lastName: (0, backend_test_utils_1.randomName)(),
			password: (0, backend_test_utils_1.randomValidPassword)(),
		},
		{
			email: (0, backend_test_utils_1.randomEmail)(),
			firstName: (0, backend_test_utils_1.randomName)(),
			lastName: '',
			password: (0, backend_test_utils_1.randomValidPassword)(),
		},
		{
			email: (0, backend_test_utils_1.randomEmail)(),
			firstName: (0, backend_test_utils_1.randomName)(),
			lastName: (0, backend_test_utils_1.randomName)(),
			password: (0, backend_test_utils_1.randomInvalidPassword)(),
		},
		{
			firstName: (0, backend_test_utils_1.randomName)(),
			lastName: (0, backend_test_utils_1.randomName)(),
		},
		{
			firstName: (0, backend_test_utils_1.randomName)(),
		},
		{
			lastName: (0, backend_test_utils_1.randomName)(),
		},
		{
			email: (0, backend_test_utils_1.randomEmail)(),
			firstName: 'John <script',
			lastName: (0, backend_test_utils_1.randomName)(),
		},
		{
			email: (0, backend_test_utils_1.randomEmail)(),
			firstName: 'John <a',
			lastName: (0, backend_test_utils_1.randomName)(),
		},
	];
	test('should fail with invalid inputs', async () => {
		for (const invalidPayload of INVALID_POST_OWNER_PAYLOADS) {
			const response = await testServer.authlessAgent.post('/owner/setup').send(invalidPayload);
			expect(response.statusCode).toBe(400);
		}
	});
});
//# sourceMappingURL=owner.api.test.js.map
