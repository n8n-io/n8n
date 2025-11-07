import {
	randomEmail,
	randomName,
	randomValidPassword,
	testDb,
	mockInstance,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { GLOBAL_OWNER_ROLE, ProjectRepository, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { IPersonalizationSurveyAnswersV4 } from 'n8n-workflow';
import validator from 'validator';

import { SUCCESS_RESPONSE_BODY } from './shared/constants';
import { createUser, createUserShell } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';

const testServer = utils.setupTestServer({ endpointGroups: ['me'] });

beforeEach(async () => {
	await testDb.truncate(['User']);
	mockInstance(GlobalConfig, {
		publicApi: { disabled: false },
		sso: { saml: { loginEnabled: true } },
	});
});

const ownerPassword = randomValidPassword();
const memberPassword = randomValidPassword();

describe('Owner shell', () => {
	let ownerShell: User;
	let authOwnerShellAgent: SuperAgentTest;

	beforeEach(async () => {
		ownerShell = await createUserShell(GLOBAL_OWNER_ROLE);
		authOwnerShellAgent = testServer.authAgentFor(ownerShell);
	});

	test('PATCH /me should succeed with valid inputs', async () => {
		for (const validPayload of VALID_PATCH_ME_PAYLOADS) {
			const response = await authOwnerShellAgent.patch('/me').send(validPayload);

			expect(response.statusCode).toBe(200);

			const { id, email, firstName, lastName, personalizationAnswers, role, password, isPending } =
				response.body.data;

			expect(validator.isUUID(id)).toBe(true);
			expect(email).toBe(validPayload.email.toLowerCase());
			expect(firstName).toBe(validPayload.firstName);
			expect(lastName).toBe(validPayload.lastName);
			expect(personalizationAnswers).toBeNull();
			expect(password).toBeUndefined();
			expect(isPending).toBe(false);
			expect(role).toBe('global:owner');

			const storedOwnerShell = await Container.get(UserRepository).findOneByOrFail({ id });

			expect(storedOwnerShell.email).toBe(validPayload.email.toLowerCase());
			expect(storedOwnerShell.firstName).toBe(validPayload.firstName);
			expect(storedOwnerShell.lastName).toBe(validPayload.lastName);

			const storedPersonalProject = await Container.get(
				ProjectRepository,
			).getPersonalProjectForUserOrFail(storedOwnerShell.id);

			expect(storedPersonalProject.name).toBe(storedOwnerShell.createPersonalProjectName());
		}
	});

	test('PATCH /me should fail with invalid inputs', async () => {
		for (const invalidPayload of INVALID_PATCH_ME_PAYLOADS) {
			const response = await authOwnerShellAgent.patch('/me').send(invalidPayload);
			expect(response.statusCode).toBe(400);

			const storedOwnerShell = await Container.get(UserRepository).findOneByOrFail({});
			expect(storedOwnerShell.email).toBeNull();
			expect(storedOwnerShell.firstName).toBeNull();
			expect(storedOwnerShell.lastName).toBeNull();

			const storedPersonalProject = await Container.get(
				ProjectRepository,
			).getPersonalProjectForUserOrFail(storedOwnerShell.id);

			expect(storedPersonalProject.name).toBe(storedOwnerShell.createPersonalProjectName());
		}
	});

	test('PATCH /me/password should fail for shell', async () => {
		const validPasswordPayload = {
			currentPassword: randomValidPassword(),
			newPassword: randomValidPassword(),
		};

		const validPayloads = [validPasswordPayload, ...INVALID_PASSWORD_PAYLOADS];

		for (const payload of validPayloads) {
			const response = await authOwnerShellAgent.patch('/me/password').send(payload);
			expect([400, 500].includes(response.statusCode)).toBe(true);

			const storedMember = await Container.get(UserRepository).findOneByOrFail({});

			if (payload.newPassword) {
				expect(storedMember.password).not.toBe(payload.newPassword);
			}

			if (payload.currentPassword) {
				expect(storedMember.password).not.toBe(payload.currentPassword);
			}
		}

		const storedOwnerShell = await Container.get(UserRepository).findOneByOrFail({});
		expect(storedOwnerShell.password).toBeNull();
	});

	test('POST /me/survey should succeed with valid inputs', async () => {
		const validPayloads = [SURVEY, EMPTY_SURVEY];

		for (const validPayload of validPayloads) {
			const response = await authOwnerShellAgent.post('/me/survey').send(validPayload);

			expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);
			expect(response.statusCode).toBe(200);

			const storedShellOwner = await Container.get(UserRepository).findOneOrFail({
				where: { id: ownerShell.id },
			});

			expect(storedShellOwner.personalizationAnswers).toEqual(validPayload);
		}
	});
});

describe('Member', () => {
	let member: User;
	let authMemberAgent: SuperAgentTest;

	beforeEach(async () => {
		member = await createUser({
			password: memberPassword,
			role: { slug: 'global:member' },
		});
		authMemberAgent = testServer.authAgentFor(member);
		await utils.setInstanceOwnerSetUp(true);
	});

	test('PATCH /me should succeed with valid inputs', async () => {
		for (const validPayload of getValidPatchMePayloads('member')) {
			const response = await authMemberAgent.patch('/me').send(validPayload).expect(200);

			const { id, email, firstName, lastName, personalizationAnswers, role, password, isPending } =
				response.body.data;

			expect(validator.isUUID(id)).toBe(true);
			expect(email).toBe(validPayload.email.toLowerCase());
			expect(firstName).toBe(validPayload.firstName);
			expect(lastName).toBe(validPayload.lastName);
			expect(personalizationAnswers).toBeNull();
			expect(password).toBeUndefined();
			expect(isPending).toBe(false);
			expect(role).toBe('global:member');

			const storedMember = await Container.get(UserRepository).findOneByOrFail({ id });

			expect(storedMember.email).toBe(validPayload.email.toLowerCase());
			expect(storedMember.firstName).toBe(validPayload.firstName);
			expect(storedMember.lastName).toBe(validPayload.lastName);

			const storedPersonalProject =
				await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(id);

			expect(storedPersonalProject.name).toBe(storedMember.createPersonalProjectName());
		}
	});

	test('PATCH /me should fail with invalid inputs', async () => {
		for (const invalidPayload of getInvalidPatchMePayloads('member')) {
			const response = await authMemberAgent.patch('/me').send(invalidPayload);
			expect(response.statusCode).toBe(400);

			const storedMember = await Container.get(UserRepository).findOneByOrFail({});
			expect(storedMember.email).toBe(member.email);
			expect(storedMember.firstName).toBe(member.firstName);
			expect(storedMember.lastName).toBe(member.lastName);

			const storedPersonalProject = await Container.get(
				ProjectRepository,
			).getPersonalProjectForUserOrFail(storedMember.id);

			expect(storedPersonalProject.name).toBe(storedMember.createPersonalProjectName());
		}
	});

	test('PATCH /me should fail when changing email without currentPassword', async () => {
		const payloadWithoutPassword = {
			email: randomEmail(),
			firstName: randomName(),
			lastName: randomName(),
		};

		const response = await authMemberAgent.patch('/me').send(payloadWithoutPassword);
		expect(response.statusCode).toBe(400);
		expect(response.body.message).toContain('Current password is required to change email');

		const storedMember = await Container.get(UserRepository).findOneByOrFail({});
		expect(storedMember.email).toBe(member.email);
	});

	test('PATCH /me should fail when changing email with wrong currentPassword', async () => {
		const payloadWithWrongPassword = {
			email: randomEmail(),
			firstName: randomName(),
			lastName: randomName(),
			currentPassword: 'WrongPassword123',
		};

		const response = await authMemberAgent.patch('/me').send(payloadWithWrongPassword);
		expect(response.statusCode).toBe(400);
		expect(response.body.message).toContain(
			'Unable to update profile. Please check your credentials and try again.',
		);

		const storedMember = await Container.get(UserRepository).findOneByOrFail({});
		expect(storedMember.email).toBe(member.email);
	});

	test('PATCH /me/password should succeed with valid inputs', async () => {
		const validPayload = {
			currentPassword: memberPassword,
			newPassword: randomValidPassword(),
		};

		const response = await authMemberAgent.patch('/me/password').send(validPayload);

		expect(response.statusCode).toBe(200);
		expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);

		const storedMember = await Container.get(UserRepository).findOneByOrFail({});
		expect(storedMember.password).not.toBe(member.password);
		expect(storedMember.password).not.toBe(validPayload.newPassword);
	});

	test('PATCH /me/password should fail with invalid inputs', async () => {
		for (const payload of INVALID_PASSWORD_PAYLOADS) {
			const response = await authMemberAgent.patch('/me/password').send(payload);
			expect([400, 500].includes(response.statusCode)).toBe(true);

			const storedMember = await Container.get(UserRepository).findOneByOrFail({});

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
			expect(response.body).toEqual(SUCCESS_RESPONSE_BODY);

			const { personalizationAnswers: storedAnswers } = await Container.get(
				UserRepository,
			).findOneByOrFail({});

			expect(storedAnswers).toEqual(validPayload);
		}
	});
});

describe('Owner', () => {
	test('PATCH /me should succeed with valid inputs', async () => {
		const owner = await createUser({
			role: GLOBAL_OWNER_ROLE,
			password: ownerPassword,
		});
		const authOwnerAgent = testServer.authAgentFor(owner);

		for (const validPayload of getValidPatchMePayloads('owner')) {
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

			expect(validator.isUUID(id)).toBe(true);
			expect(email).toBe(validPayload.email.toLowerCase());
			expect(firstName).toBe(validPayload.firstName);
			expect(lastName).toBe(validPayload.lastName);
			expect(personalizationAnswers).toBeNull();
			expect(password).toBeUndefined();
			expect(isPending).toBe(false);
			expect(role).toBe('global:owner');
			expect(apiKey).toBeUndefined();

			const storedOwner = await Container.get(UserRepository).findOneByOrFail({ id });

			expect(storedOwner.email).toBe(validPayload.email.toLowerCase());
			expect(storedOwner.firstName).toBe(validPayload.firstName);
			expect(storedOwner.lastName).toBe(validPayload.lastName);

			const storedPersonalProject = await Container.get(
				ProjectRepository,
			).getPersonalProjectForUserOrFail(storedOwner.id);

			expect(storedPersonalProject.name).toBe(storedOwner.createPersonalProjectName());
		}
	});
});

const SURVEY: IPersonalizationSurveyAnswersV4 = {
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

const EMPTY_SURVEY: IPersonalizationSurveyAnswersV4 = {
	version: 'v4',
	personalization_survey_submitted_at: '2024-08-21T13:05:51.709Z',
	personalization_survey_n8n_version: '1.0.0',
};

function getValidPatchMePayloads(userType: 'owner' | 'member') {
	return VALID_PATCH_ME_PAYLOADS.map((payload) => {
		if (userType === 'owner') {
			return { ...payload, currentPassword: ownerPassword };
		}
		return { ...payload, currentPassword: memberPassword };
	});
}

function getInvalidPatchMePayloads(userType: 'owner' | 'member') {
	return INVALID_PATCH_ME_PAYLOADS.map((payload) => {
		if (userType === 'owner') {
			return { ...payload, currentPassword: ownerPassword };
		}
		return { ...payload, currentPassword: memberPassword };
	});
}

const VALID_PATCH_ME_PAYLOADS = [
	{
		email: randomEmail(),
		firstName: randomName(),
		lastName: randomName(),
	},
	// {
	// 	email: randomEmail().toUpperCase(),
	// 	firstName: randomName(),
	// 	lastName: randomName(),
	// },
];

const INVALID_PATCH_ME_PAYLOADS = [
	{
		email: 'invalid',
		firstName: randomName(),
		lastName: randomName(),
	},
	{
		email: randomEmail(),
		firstName: '',
		lastName: randomName(),
	},
	{
		email: randomEmail(),
		firstName: randomName(),
		lastName: '',
	},
	{
		email: randomEmail(),
		firstName: 123,
		lastName: randomName(),
	},
	{
		firstName: randomName(),
		lastName: randomName(),
	},
	{
		firstName: randomName(),
	},
	{
		lastName: randomName(),
	},
	{
		email: randomEmail(),
		firstName: 'John <script',
		lastName: randomName(),
	},
	{
		email: randomEmail(),
		firstName: 'John <a',
		lastName: randomName(),
	},
];

const INVALID_PASSWORD_PAYLOADS = [
	{
		currentPassword: null,
		newPassword: randomValidPassword(),
	},
	{
		currentPassword: '',
		newPassword: randomValidPassword(),
	},
	{
		currentPassword: {},
		newPassword: randomValidPassword(),
	},
	{
		currentPassword: [],
		newPassword: randomValidPassword(),
	},
	{
		currentPassword: randomValidPassword(),
	},
	{
		newPassword: randomValidPassword(),
	},
	{
		currentPassword: randomValidPassword(),
		newPassword: null,
	},
	{
		currentPassword: randomValidPassword(),
		newPassword: '',
	},
	{
		currentPassword: randomValidPassword(),
		newPassword: {},
	},
	{
		currentPassword: randomValidPassword(),
		newPassword: [],
	},
];
