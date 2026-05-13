import { createTeamProject, linkUserToProject, testDb } from '@n8n/backend-test-utils';
import type { CredentialsEntity, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { response as Response } from 'express';
import nock from 'nock';

import { CredentialsHelper } from '@/credentials-helper';
import { OauthService } from '@/oauth/oauth.service';
import {
	decryptCredentialData,
	getCredentialById,
	saveCredential,
	shareCredentialWithUsers,
} from '@test-integration/db/credentials';
import { createMember, createOwner } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

describe('OAuth1 API', () => {
	const testServer = setupTestServer({ endpointGroups: ['oauth1'] });

	let owner: User;
	let credential: CredentialsEntity;
	const credentialData = {
		consumerKey: 'consumer_key',
		consumerSecret: 'consumer_secret',
		authUrl: 'https://test.domain/oauth1/auth',
		requestTokenUrl: 'https://test.domain/oauth1/request_token',
		accessTokenUrl: 'https://test.domain/oauth1/access_token',
		signatureMethod: 'HMAC-SHA1' as const,
	};

	const sharedCredentialPayload = {
		name: 'Shared OAuth1 credential',
		type: 'testOAuth1Api',
		data: credentialData,
	};

	CredentialsHelper.prototype.applyDefaultsAndOverwrites = async (_, decryptedDataOriginal) =>
		decryptedDataOriginal;

	beforeAll(async () => {
		owner = await createOwner();
	});

	beforeEach(async () => {
		await testDb.truncate(['SharedCredentials', 'CredentialsEntity']);
		credential = await saveCredential(sharedCredentialPayload, {
			user: owner,
			role: 'credential:owner',
		});
	});

	afterEach(() => {
		jest.restoreAllMocks();
		nock.cleanAll();
	});

	describe('OAuth reconnect authorization', () => {
		const expectNoCsrfStateOnCredential = async (credentialId: string) => {
			const stored = await getCredentialById(credentialId);
			expect(stored).not.toBeNull();
			const decrypted = (await decryptCredentialData(stored!)) as Record<string, unknown>;
			expect(decrypted).not.toHaveProperty('csrfSecret');
		};

		const mockRequestTokenEndpoint = () => {
			nock('https://test.domain')
				.post('/oauth1/request_token')
				.reply(200, 'oauth_token=request_token&oauth_token_secret=request_secret');
		};

		it('should reject auth start for a sharee with credential:user role', async () => {
			const sharee = await createMember();
			await shareCredentialWithUsers(credential, [sharee]);

			const response = await testServer
				.authAgentFor(sharee)
				.get('/oauth1-credential/auth')
				.query({ id: credential.id });

			expect(response.statusCode).toBe(404);
			await expectNoCsrfStateOnCredential(credential.id);
		});

		it('should reject auth start for a project viewer on a project-shared credential', async () => {
			const projectViewer = await createMember();
			const teamProject = await createTeamProject(undefined, owner);
			await linkUserToProject(projectViewer, teamProject, 'project:viewer');

			const projectCredential = await saveCredential(sharedCredentialPayload, {
				project: teamProject,
				role: 'credential:owner',
			});

			const response = await testServer
				.authAgentFor(projectViewer)
				.get('/oauth1-credential/auth')
				.query({ id: projectCredential.id });

			expect(response.statusCode).toBe(404);
			await expectNoCsrfStateOnCredential(projectCredential.id);
		});

		it('should allow auth start for a project editor on a project-shared credential', async () => {
			const projectEditor = await createMember();
			const teamProject = await createTeamProject(undefined, owner);
			await linkUserToProject(projectEditor, teamProject, 'project:editor');

			const projectCredential = await saveCredential(sharedCredentialPayload, {
				project: teamProject,
				role: 'credential:owner',
			});

			mockRequestTokenEndpoint();

			const response = await testServer
				.authAgentFor(projectEditor)
				.get('/oauth1-credential/auth')
				.query({ id: projectCredential.id });

			expect(response.statusCode).toBe(200);
			expect(response.body.data).toContain('https://test.domain/oauth1/auth');
			expect(response.body.data).toContain('oauth_token=request_token');
		});

		it('should reject callback when requester lacks credential:update on the target credential', async () => {
			const sharee = await createMember();
			await shareCredentialWithUsers(credential, [sharee]);

			const oauthService = Container.get(OauthService);
			const renderSpy = jest.spyOn(Response, 'render').mockImplementation(function (this: any) {
				this.end();
				return this;
			});

			// Build a callback state whose decrypted userId equals the requesting member,
			// so the userId equality check inside decodeCsrfState passes and the credential
			// scope check is the only remaining gate. The owner-initiated /auth call below
			// produces a valid encrypted state; we then re-encrypt its contents with the
			// member's userId before driving the callback as the member.
			const csrfSpy = jest.spyOn(oauthService, 'createCsrfState').mockClear();
			mockRequestTokenEndpoint();

			await testServer
				.authAgentFor(owner)
				.get('/oauth1-credential/auth')
				.query({ id: credential.id })
				.expect(200);

			const [, ownerState] = await csrfSpy.mock.results[0].value;

			const decoded = JSON.parse(Buffer.from(ownerState, 'base64').toString());
			const decryptedData = JSON.parse(oauthService['cipher'].decrypt(decoded.data)) as Record<
				string,
				unknown
			>;
			decryptedData.userId = sharee.id;
			decoded.data = oauthService['cipher'].encrypt(JSON.stringify(decryptedData));
			const reencodedState = Buffer.from(JSON.stringify(decoded)).toString('base64');

			nock('https://test.domain')
				.post('/oauth1/access_token')
				.reply(200, 'oauth_token=member_token&oauth_token_secret=member_secret');

			await testServer
				.authAgentFor(sharee)
				.get('/oauth1-credential/callback')
				.query({
					oauth_token: 'request_token',
					oauth_verifier: 'verifier',
					state: reencodedState,
				})
				.expect(200);

			expect(renderSpy).toHaveBeenCalledWith('oauth-error-callback', {
				error: { message: 'Credential not found' },
			});

			const stored = await Container.get(CredentialsHelper).getCredentials(
				credential,
				credential.type,
			);
			const credentials = await stored.getData();
			expect(credentials.oauthTokenData).toBeUndefined();
		});
	});
});
