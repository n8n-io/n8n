import { createTeamProject, linkUserToProject, testDb } from '@n8n/backend-test-utils';
import type { CredentialsEntity, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { response as Response } from 'express';
import nock from 'nock';

import { CredentialsHelper } from '@/credentials-helper';
import { OauthService, type OauthFlowState } from '@/oauth/oauth.service';
import { MAX_CSRF_AGE } from '@/oauth/types';
import { CacheService } from '@/services/cache/cache.service';
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
		vi.restoreAllMocks();
		nock.cleanAll();
	});

	describe('callback route accessibility', () => {
		// The callback route must be reachable without
		// an n8n session (so external/dynamic-credential OAuth flows complete) while the handler
		// still enforces session-bound validation for static credentials.
		it('should reach the handler when called without authentication', async () => {
			const renderSpy = vi.spyOn(Response, 'render').mockImplementation(function (this: any) {
				this.end();
				return this;
			});

			await testServer.authlessAgent
				.get('/oauth1-credential/callback')
				.query({
					oauth_token: 'request_token',
					oauth_verifier: 'verifier',
					state: 'invalid_state',
				})
				.expect(200);

			expect(renderSpy).toHaveBeenCalledWith(
				'oauth-error-callback',
				expect.objectContaining({
					error: expect.objectContaining({ message: expect.any(String) }),
				}),
			);
		});

		it('should reject an unauthenticated callback for a static credential', async () => {
			const oauthService = Container.get(OauthService);
			const csrfSpy = vi.spyOn(oauthService, 'createCsrfState').mockClear();
			const renderSpy = vi.spyOn(Response, 'render').mockImplementation(function (this: any) {
				this.end();
				return this;
			});

			nock('https://test.domain')
				.post('/oauth1/request_token')
				.reply(200, 'oauth_token=request_token&oauth_token_secret=request_secret');

			await testServer
				.authAgentFor(owner)
				.get('/oauth1-credential/auth')
				.query({ id: credential.id })
				.expect(200);

			const [, state] = await csrfSpy.mock.results[0].value;

			await testServer.authlessAgent
				.get('/oauth1-credential/callback')
				.query({
					oauth_token: 'request_token',
					oauth_verifier: 'verifier',
					state,
				})
				.expect(200);

			expect(renderSpy).toHaveBeenCalledWith('oauth-error-callback', {
				error: { message: 'Unauthorized' },
			});
		});
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
			const renderSpy = vi.spyOn(Response, 'render').mockImplementation(function (this: any) {
				this.end();
				return this;
			});

			// Make the flow's stored userId equal the requesting member, so the userId
			// equality check inside decodeCsrfState passes and the credential scope check
			// is the only remaining gate. The CSRF payload lives server-side in the
			// per-flow cache now, so we rewrite the cached stateData (rather than the URL).
			const csrfSpy = vi.spyOn(oauthService, 'createCsrfState').mockClear();
			mockRequestTokenEndpoint();

			await testServer
				.authAgentFor(owner)
				.get('/oauth1-credential/auth')
				.query({ id: credential.id })
				.expect(200);

			const [, ownerState] = await csrfSpy.mock.results[0].value;

			const decoded = JSON.parse(Buffer.from(ownerState, 'base64').toString());
			const cacheService = Container.get(CacheService);
			const cacheKey = `oauth:flow:${decoded.token}`;
			const flowState = await cacheService.get<OauthFlowState>(cacheKey);
			flowState!.stateData!.userId = sharee.id;
			await cacheService.set(cacheKey, flowState, MAX_CSRF_AGE);
			const reencodedState = ownerState;

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

	describe('per-flow state isolation', () => {
		const renderCallback = () =>
			vi.spyOn(Response, 'render').mockImplementation(function (this: any) {
				this.end();
				return this;
			});

		const mockRequestTokenEndpoint = () => {
			nock('https://test.domain')
				.post('/oauth1/request_token')
				.reply(200, 'oauth_token=request_token&oauth_token_secret=request_secret');
		};

		// IAM-719: concurrent OAuth1 flows on the same shared credential must not race
		// on the per-flow csrfSecret.
		it('lets two users complete concurrent OAuth1 flows on the same credential', async () => {
			const teamProject = await createTeamProject(undefined, owner);
			const editorA = await createMember();
			const editorB = await createMember();
			await linkUserToProject(editorA, teamProject, 'project:editor');
			await linkUserToProject(editorB, teamProject, 'project:editor');
			const projectCredential = await saveCredential(sharedCredentialPayload, {
				project: teamProject,
				role: 'credential:owner',
			});
			const editorAAgent = testServer.authAgentFor(editorA);
			const editorBAgent = testServer.authAgentFor(editorB);

			const oauthService = Container.get(OauthService);
			const csrfSpy = vi.spyOn(oauthService, 'createCsrfState').mockClear();
			renderCallback();

			mockRequestTokenEndpoint();
			await editorAAgent
				.get('/oauth1-credential/auth')
				.query({ id: projectCredential.id })
				.expect(200);
			mockRequestTokenEndpoint();
			await editorBAgent
				.get('/oauth1-credential/auth')
				.query({ id: projectCredential.id })
				.expect(200);

			const [, stateA] = await csrfSpy.mock.results[0].value;
			const [, stateB] = await csrfSpy.mock.results[1].value;
			expect(stateA).not.toBe(stateB);

			nock('https://test.domain')
				.post('/oauth1/access_token')
				.reply(200, 'oauth_token=token_A&oauth_token_secret=secret_A');
			nock('https://test.domain')
				.post('/oauth1/access_token')
				.reply(200, 'oauth_token=token_B&oauth_token_secret=secret_B');

			await editorAAgent
				.get('/oauth1-credential/callback')
				.query({
					oauth_token: 'request_token',
					oauth_verifier: 'verifier',
					state: stateA,
				})
				.expect(200);

			await editorBAgent
				.get('/oauth1-credential/callback')
				.query({
					oauth_token: 'request_token',
					oauth_verifier: 'verifier',
					state: stateB,
				})
				.expect(200);
		});

		it('rejects a replayed OAuth1 callback (state token already consumed)', async () => {
			const ownerAgent = testServer.authAgentFor(owner);
			const oauthService = Container.get(OauthService);
			const csrfSpy = vi.spyOn(oauthService, 'createCsrfState').mockClear();
			const renderSpy = renderCallback();

			mockRequestTokenEndpoint();
			await ownerAgent.get('/oauth1-credential/auth').query({ id: credential.id }).expect(200);
			const [, state] = await csrfSpy.mock.results[0].value;

			nock('https://test.domain')
				.post('/oauth1/access_token')
				.reply(200, 'oauth_token=first_token&oauth_token_secret=first_secret');

			await ownerAgent
				.get('/oauth1-credential/callback')
				.query({
					oauth_token: 'request_token',
					oauth_verifier: 'verifier',
					state,
				})
				.expect(200);
			expect(renderSpy).toHaveBeenLastCalledWith('oauth-callback');

			await ownerAgent
				.get('/oauth1-credential/callback')
				.query({
					oauth_token: 'request_token',
					oauth_verifier: 'verifier',
					state,
				})
				.expect(200);
			expect(renderSpy).toHaveBeenLastCalledWith(
				'oauth-error-callback',
				expect.objectContaining({
					error: expect.objectContaining({ message: 'The OAuth callback state is invalid!' }),
				}),
			);
		});
	});
});
