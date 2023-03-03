import express from 'express';

import config from '@/config';
import type { Role } from '@db/entities/Role';
import { randomEmail, randomName, randomValidPassword } from '../shared/random';
import * as testDb from '../shared/testDb';
import type { AuthAgent } from '../shared/types';
import * as utils from '../shared/utils';
import { setSamlLoginEnabled } from '../../../src/sso/saml/samlHelpers';
import { setCurrentAuthenticationMethod } from '../../../src/sso/ssoHelpers';

let app: express.Application;
let globalOwnerRole: Role;
let globalMemberRole: Role;
let authAgent: AuthAgent;

function enableSaml(enable: boolean) {
	setSamlLoginEnabled(enable);
	setCurrentAuthenticationMethod(enable ? 'saml' : 'email');
	config.set('enterprise.features.saml', enable);
}

beforeAll(async () => {
	app = await utils.initTestServer({ endpointGroups: ['me'] });

	globalOwnerRole = await testDb.getGlobalOwnerRole();
	globalMemberRole = await testDb.getGlobalMemberRole();

	authAgent = utils.createAuthAgent(app);
});

beforeEach(async () => {
	await testDb.truncate(['User']);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('Owner shell', () => {
	test('PATCH /me should succeed with valid inputs', async () => {
		const ownerShell = await testDb.createUserShell(globalOwnerRole);
		const authOwnerShellAgent = authAgent(ownerShell);
		const response = await authOwnerShellAgent.patch('/me').send({
			email: randomEmail(),
			firstName: randomName(),
			lastName: randomName(),
			password: randomValidPassword(),
		});
		expect(response.statusCode).toBe(200);
	});

	test('PATCH /me should throw BadRequestError if email is changed when SAML is enabled', async () => {
		enableSaml(true);
		const ownerShell = await testDb.createUserShell(globalOwnerRole);
		const authOwnerShellAgent = authAgent(ownerShell);
		const response = await authOwnerShellAgent.patch('/me').send({
			email: randomEmail(),
			firstName: randomName(),
			lastName: randomName(),
		});
		expect(response.statusCode).toBe(400);
		expect(response.body.message).toContain('SAML');
		enableSaml(false);
	});

	test('PATCH /password should throw BadRequestError if password is changed when SAML is enabled', async () => {
		enableSaml(true);
		const ownerShell = await testDb.createUserShell(globalOwnerRole);
		const authOwnerShellAgent = authAgent(ownerShell);
		const response = await authOwnerShellAgent.patch('/me/password').send({
			password: randomValidPassword(),
		});
		expect(response.statusCode).toBe(400);
		expect(response.body.message).toContain('SAML');
		enableSaml(false);
	});
});
