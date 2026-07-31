import { testDb } from '@n8n/backend-test-utils';
import type { CredentialsEntity, User } from '@n8n/db';

import { CredentialsHelper } from '@/credentials-helper';
import { saveCredential, shareCredentialWithUsers } from '@test-integration/db/credentials';
import { createMember, createOwner } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

describe('OAuth1 API', () => {
	const testServer = setupTestServer({ endpointGroups: ['oauth1'] });

	let owner: User;
	let anotherUser: User;
	let credential: CredentialsEntity;
	const credentialData = {
		consumerKey: 'consumer_key',
		consumerSecret: 'consumer_secret',
		signatureMethod: 'HMAC-SHA1',
		requestTokenUrl: 'https://test.domain/oauth/request_token',
		authUrl: 'https://test.domain/oauth/authorize',
		accessTokenUrl: 'https://test.domain/oauth/access_token',
	};

	CredentialsHelper.prototype.applyDefaultsAndOverwrites = async (_, decryptedDataOriginal) =>
		decryptedDataOriginal;

	beforeAll(async () => {
		owner = await createOwner();
		anotherUser = await createMember();
	});

	beforeEach(async () => {
		await testDb.truncate(['SharedCredentials', 'CredentialsEntity']);
		credential = await saveCredential(
			{
				name: 'Test',
				type: 'testOAuth1Api',
				data: credentialData,
			},
			{
				user: owner,
				role: 'credential:owner',
			},
		);
	});

	it('should not return an auth URL for a read-only sharee', async () => {
		await shareCredentialWithUsers(credential, [anotherUser]);

		const response = await testServer
			.authAgentFor(anotherUser)
			.get('/oauth1-credential/auth')
			.query({ id: credential.id })
			.expect(404);

		expect(response.body).toMatchObject({ message: 'Credential not found' });
	});
});
