import type { SuperAgentTest } from 'supertest';
import config from '@/config';
import type { User } from '@db/entities/User';
import { setSamlLoginEnabled } from '@/sso/saml/samlHelpers';
import { setCurrentAuthenticationMethod } from '@/sso/ssoHelpers';
import { randomEmail, randomName, randomValidPassword } from '../shared/random';
import * as testDb from '../shared/testDb';
import * as utils from '../shared/utils';

let owner: User;
let authOwnerAgent: SuperAgentTest;

function enableSaml(enable: boolean) {
	setSamlLoginEnabled(enable);
	setCurrentAuthenticationMethod(enable ? 'saml' : 'email');
	config.set('enterprise.features.saml', enable);
}

beforeAll(async () => {
	const app = await utils.initTestServer({ endpointGroups: ['me'] });
	owner = await testDb.createOwner();
	authOwnerAgent = utils.createAuthAgent(app)(owner);
});

// beforeEach(async () => {
// 	await testDb.truncate(['User']);
// });

afterAll(async () => {
	await testDb.terminate();
});

describe('Instance owner', () => {
	describe('PATCH /me', () => {
		test('should succeed with valid inputs', async () => {
			enableSaml(false);
			await authOwnerAgent
				.patch('/me')
				.send({
					email: randomEmail(),
					firstName: randomName(),
					lastName: randomName(),
					password: randomValidPassword(),
				})
				.expect(200);
		});

		test('should throw BadRequestError if email is changed when SAML is enabled', async () => {
			enableSaml(true);
			await authOwnerAgent
				.patch('/me')
				.send({
					email: randomEmail(),
					firstName: randomName(),
					lastName: randomName(),
				})
				.expect(400, { code: 400, message: 'SAML user may not change their email' });
		});
	});

	describe('PATCH /password', () => {
		test('should throw BadRequestError if password is changed when SAML is enabled', async () => {
			enableSaml(true);
			await authOwnerAgent
				.patch('/me/password')
				.send({
					password: randomValidPassword(),
				})
				.expect(400, {
					code: 400,
					message: 'With SAML enabled, users need to use their SAML provider to change passwords',
				});
		});
	});
});
