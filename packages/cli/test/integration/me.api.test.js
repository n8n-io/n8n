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
const config_1 = require('@n8n/config');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const validator_1 = __importDefault(require('validator'));
const constants_1 = require('./shared/constants');
const users_1 = require('./shared/db/users');
const utils = __importStar(require('./shared/utils/'));
const testServer = utils.setupTestServer({ endpointGroups: ['me'] });
beforeEach(async () => {
	await backend_test_utils_1.testDb.truncate(['User']);
	(0, backend_test_utils_1.mockInstance)(config_1.GlobalConfig, {
		publicApi: { disabled: false },
		sso: { saml: { loginEnabled: true } },
	});
});
describe('Owner shell', () => {
	let ownerShell;
	let authOwnerShellAgent;
	beforeEach(async () => {
		ownerShell = await (0, users_1.createUserShell)('global:owner');
		authOwnerShellAgent = testServer.authAgentFor(ownerShell);
	});
	test('PATCH /me should succeed with valid inputs', async () => {
		for (const validPayload of VALID_PATCH_ME_PAYLOADS) {
			const response = await authOwnerShellAgent.patch('/me').send(validPayload);
			expect(response.statusCode).toBe(200);
			const { id, email, firstName, lastName, personalizationAnswers, role, password, isPending } =
				response.body.data;
			expect(validator_1.default.isUUID(id)).toBe(true);
			expect(email).toBe(validPayload.email.toLowerCase());
			expect(firstName).toBe(validPayload.firstName);
			expect(lastName).toBe(validPayload.lastName);
			expect(personalizationAnswers).toBeNull();
			expect(password).toBeUndefined();
			expect(isPending).toBe(false);
			expect(role).toBe('global:owner');
			const storedOwnerShell = await di_1.Container.get(db_1.UserRepository).findOneByOrFail({
				id,
			});
			expect(storedOwnerShell.email).toBe(validPayload.email.toLowerCase());
			expect(storedOwnerShell.firstName).toBe(validPayload.firstName);
			expect(storedOwnerShell.lastName).toBe(validPayload.lastName);
			const storedPersonalProject = await di_1.Container.get(
				db_1.ProjectRepository,
			).getPersonalProjectForUserOrFail(storedOwnerShell.id);
			expect(storedPersonalProject.name).toBe(storedOwnerShell.createPersonalProjectName());
		}
	});
	test('PATCH /me should fail with invalid inputs', async () => {
		for (const invalidPayload of INVALID_PATCH_ME_PAYLOADS) {
			const response = await authOwnerShellAgent.patch('/me').send(invalidPayload);
			expect(response.statusCode).toBe(400);
			const storedOwnerShell = await di_1.Container.get(db_1.UserRepository).findOneByOrFail({});
			expect(storedOwnerShell.email).toBeNull();
			expect(storedOwnerShell.firstName).toBeNull();
			expect(storedOwnerShell.lastName).toBeNull();
			const storedPersonalProject = await di_1.Container.get(
				db_1.ProjectRepository,
			).getPersonalProjectForUserOrFail(storedOwnerShell.id);
			expect(storedPersonalProject.name).toBe(storedOwnerShell.createPersonalProjectName());
		}
	});
	test('PATCH /me/password should fail for shell', async () => {
		const validPasswordPayload = {
			currentPassword: (0, backend_test_utils_1.randomValidPassword)(),
			newPassword: (0, backend_test_utils_1.randomValidPassword)(),
		};
		const validPayloads = [validPasswordPayload, ...INVALID_PASSWORD_PAYLOADS];
		for (const payload of validPayloads) {
			const response = await authOwnerShellAgent.patch('/me/password').send(payload);
			expect([400, 500].includes(response.statusCode)).toBe(true);
			const storedMember = await di_1.Container.get(db_1.UserRepository).findOneByOrFail({});
			if (payload.newPassword) {
				expect(storedMember.password).not.toBe(payload.newPassword);
			}
			if (payload.currentPassword) {
				expect(storedMember.password).not.toBe(payload.currentPassword);
			}
		}
		const storedOwnerShell = await di_1.Container.get(db_1.UserRepository).findOneByOrFail({});
		expect(storedOwnerShell.password).toBeNull();
	});
	test('POST /me/survey should succeed with valid inputs', async () => {
		const validPayloads = [SURVEY, EMPTY_SURVEY];
		for (const validPayload of validPayloads) {
			const response = await authOwnerShellAgent.post('/me/survey').send(validPayload);
			expect(response.body).toEqual(constants_1.SUCCESS_RESPONSE_BODY);
			expect(response.statusCode).toBe(200);
			const storedShellOwner = await di_1.Container.get(db_1.UserRepository).findOneOrFail({
				where: { id: ownerShell.id },
			});
			expect(storedShellOwner.personalizationAnswers).toEqual(validPayload);
		}
	});
});
describe('Member', () => {
	const memberPassword = (0, backend_test_utils_1.randomValidPassword)();
	let member;
	let authMemberAgent;
	beforeEach(async () => {
		member = await (0, users_1.createUser)({
			password: memberPassword,
			role: 'global:member',
		});
		authMemberAgent = testServer.authAgentFor(member);
		await utils.setInstanceOwnerSetUp(true);
	});
	test('PATCH /me should succeed with valid inputs', async () => {
		for (const validPayload of VALID_PATCH_ME_PAYLOADS) {
			const response = await authMemberAgent.patch('/me').send(validPayload).expect(200);
			const { id, email, firstName, lastName, personalizationAnswers, role, password, isPending } =
				response.body.data;
			expect(validator_1.default.isUUID(id)).toBe(true);
			expect(email).toBe(validPayload.email.toLowerCase());
			expect(firstName).toBe(validPayload.firstName);
			expect(lastName).toBe(validPayload.lastName);
			expect(personalizationAnswers).toBeNull();
			expect(password).toBeUndefined();
			expect(isPending).toBe(false);
			expect(role).toBe('global:member');
			const storedMember = await di_1.Container.get(db_1.UserRepository).findOneByOrFail({ id });
			expect(storedMember.email).toBe(validPayload.email.toLowerCase());
			expect(storedMember.firstName).toBe(validPayload.firstName);
			expect(storedMember.lastName).toBe(validPayload.lastName);
			const storedPersonalProject = await di_1.Container.get(
				db_1.ProjectRepository,
			).getPersonalProjectForUserOrFail(id);
			expect(storedPersonalProject.name).toBe(storedMember.createPersonalProjectName());
		}
	});
	test('PATCH /me should fail with invalid inputs', async () => {
		for (const invalidPayload of INVALID_PATCH_ME_PAYLOADS) {
			const response = await authMemberAgent.patch('/me').send(invalidPayload);
			expect(response.statusCode).toBe(400);
			const storedMember = await di_1.Container.get(db_1.UserRepository).findOneByOrFail({});
			expect(storedMember.email).toBe(member.email);
			expect(storedMember.firstName).toBe(member.firstName);
			expect(storedMember.lastName).toBe(member.lastName);
			const storedPersonalProject = await di_1.Container.get(
				db_1.ProjectRepository,
			).getPersonalProjectForUserOrFail(storedMember.id);
			expect(storedPersonalProject.name).toBe(storedMember.createPersonalProjectName());
		}
	});
	test('PATCH /me/password should succeed with valid inputs', async () => {
		const validPayload = {
			currentPassword: memberPassword,
			newPassword: (0, backend_test_utils_1.randomValidPassword)(),
		};
		const response = await authMemberAgent.patch('/me/password').send(validPayload);
		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual(constants_1.SUCCESS_RESPONSE_BODY);
		const storedMember = await di_1.Container.get(db_1.UserRepository).findOneByOrFail({});
		expect(storedMember.password).not.toBe(member.password);
		expect(storedMember.password).not.toBe(validPayload.newPassword);
	});
	test('PATCH /me/password should fail with invalid inputs', async () => {
		for (const payload of INVALID_PASSWORD_PAYLOADS) {
			const response = await authMemberAgent.patch('/me/password').send(payload);
			expect([400, 500].includes(response.statusCode)).toBe(true);
			const storedMember = await di_1.Container.get(db_1.UserRepository).findOneByOrFail({});
			if (payload.newPassword) {
				expect(storedMember.password).not.toBe(payload.newPassword);
			}
			if (payload.currentPassword) {
				expect(storedMember.password).not.toBe(payload.currentPassword);
			}
		}
	});
	test('POST /me/survey should succeed with valid inputs', async () => {
		const validPayloads = [SURVEY, EMPTY_SURVEY];
		for (const validPayload of validPayloads) {
			const response = await authMemberAgent.post('/me/survey').send(validPayload);
			expect(response.statusCode).toBe(200);
			expect(response.body).toEqual(constants_1.SUCCESS_RESPONSE_BODY);
			const { personalizationAnswers: storedAnswers } = await di_1.Container.get(
				db_1.UserRepository,
			).findOneByOrFail({});
			expect(storedAnswers).toEqual(validPayload);
		}
	});
});
describe('Owner', () => {
	test('PATCH /me should succeed with valid inputs', async () => {
		const owner = await (0, users_1.createUser)({ role: 'global:owner' });
		const authOwnerAgent = testServer.authAgentFor(owner);
		for (const validPayload of VALID_PATCH_ME_PAYLOADS) {
			const response = await authOwnerAgent.patch('/me').send(validPayload);
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
			} = response.body.data;
			expect(validator_1.default.isUUID(id)).toBe(true);
			expect(email).toBe(validPayload.email.toLowerCase());
			expect(firstName).toBe(validPayload.firstName);
			expect(lastName).toBe(validPayload.lastName);
			expect(personalizationAnswers).toBeNull();
			expect(password).toBeUndefined();
			expect(isPending).toBe(false);
			expect(role).toBe('global:owner');
			expect(apiKey).toBeUndefined();
			const storedOwner = await di_1.Container.get(db_1.UserRepository).findOneByOrFail({ id });
			expect(storedOwner.email).toBe(validPayload.email.toLowerCase());
			expect(storedOwner.firstName).toBe(validPayload.firstName);
			expect(storedOwner.lastName).toBe(validPayload.lastName);
			const storedPersonalProject = await di_1.Container.get(
				db_1.ProjectRepository,
			).getPersonalProjectForUserOrFail(storedOwner.id);
			expect(storedPersonalProject.name).toBe(storedOwner.createPersonalProjectName());
		}
	});
});
const SURVEY = {
	version: 'v4',
	personalization_survey_submitted_at: '2024-08-21T13:05:51.709Z',
	personalization_survey_n8n_version: '1.0.0',
	automationGoalDevops: ['test'],
	automationGoalDevopsOther: 'test',
	companyIndustryExtended: ['test'],
	otherCompanyIndustryExtended: ['test'],
	companySize: '20-99',
	companyType: 'test',
	automationGoalSm: ['test'],
	automationGoalSmOther: 'test',
	usageModes: ['test'],
	email: 'test@email.com',
	role: 'test',
	roleOther: 'test',
	reportedSource: 'test',
	reportedSourceOther: 'test',
};
const EMPTY_SURVEY = {
	version: 'v4',
	personalization_survey_submitted_at: '2024-08-21T13:05:51.709Z',
	personalization_survey_n8n_version: '1.0.0',
};
const VALID_PATCH_ME_PAYLOADS = [
	{
		email: (0, backend_test_utils_1.randomEmail)(),
		firstName: (0, backend_test_utils_1.randomName)(),
		lastName: (0, backend_test_utils_1.randomName)(),
	},
];
const INVALID_PATCH_ME_PAYLOADS = [
	{
		email: 'invalid',
		firstName: (0, backend_test_utils_1.randomName)(),
		lastName: (0, backend_test_utils_1.randomName)(),
	},
	{
		email: (0, backend_test_utils_1.randomEmail)(),
		firstName: '',
		lastName: (0, backend_test_utils_1.randomName)(),
	},
	{
		email: (0, backend_test_utils_1.randomEmail)(),
		firstName: (0, backend_test_utils_1.randomName)(),
		lastName: '',
	},
	{
		email: (0, backend_test_utils_1.randomEmail)(),
		firstName: 123,
		lastName: (0, backend_test_utils_1.randomName)(),
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
const INVALID_PASSWORD_PAYLOADS = [
	{
		currentPassword: null,
		newPassword: (0, backend_test_utils_1.randomValidPassword)(),
	},
	{
		currentPassword: '',
		newPassword: (0, backend_test_utils_1.randomValidPassword)(),
	},
	{
		currentPassword: {},
		newPassword: (0, backend_test_utils_1.randomValidPassword)(),
	},
	{
		currentPassword: [],
		newPassword: (0, backend_test_utils_1.randomValidPassword)(),
	},
	{
		currentPassword: (0, backend_test_utils_1.randomValidPassword)(),
	},
	{
		newPassword: (0, backend_test_utils_1.randomValidPassword)(),
	},
	{
		currentPassword: (0, backend_test_utils_1.randomValidPassword)(),
		newPassword: null,
	},
	{
		currentPassword: (0, backend_test_utils_1.randomValidPassword)(),
		newPassword: '',
	},
	{
		currentPassword: (0, backend_test_utils_1.randomValidPassword)(),
		newPassword: {},
	},
	{
		currentPassword: (0, backend_test_utils_1.randomValidPassword)(),
		newPassword: [],
	},
];
//# sourceMappingURL=me.api.test.js.map
