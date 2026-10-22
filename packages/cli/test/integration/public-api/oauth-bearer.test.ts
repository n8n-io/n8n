import { testDb } from '@n8n/backend-test-utils';
import { principalFromUser, TagRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import {
	AuthenticationPipeline,
	AuthenticationService,
	ResourceAdmission,
} from '@n8n/inbound-auth';
import { sign } from 'jsonwebtoken';
import { mock } from 'vitest-mock-extended';

import { createMember, createOwnerWithApiKey } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

const CHALLENGE =
	'Bearer resource_metadata="https://n8n.test/.well-known/oauth-protected-resource/api/v1"';

// The pipeline is the unit under test elsewhere; here it is a boundary. Only `iss` is read before it runs.
const tokenFrom = (iss: string) => sign({ iss, sub: 'alice' }, 'unverified-here');

const pipeline = mock<AuthenticationPipeline>();
const authenticationService = mock<AuthenticationService>();

describe('Public API with OAuth2 bearer tokens', () => {
	const testServer = setupTestServer({ endpointGroups: ['publicApi'] });

	beforeAll(async () => {
		await testDb.init();

		Container.set(AuthenticationPipeline, pipeline);
		Container.set(AuthenticationService, authenticationService);

		// `InboundAuthCoreModule.init()` binds the admission and registers the strategy on main; the
		// test server loads no modules, so do both by hand, the strategy after the API key and
		// session-cookie strategies.
		const { InboundResourceAdmission } = await import(
			'@/modules/inbound-auth-core/resource-admission.js'
		);
		Container.set(ResourceAdmission, Container.get(InboundResourceAdmission));
		const { PublicApiOAuthStrategy } = await import(
			'@/modules/inbound-auth-core/public-api-oauth.strategy.js'
		);
		const { AuthStrategyRegistry } = await import('@n8n/backend-services/auth');
		Container.get(AuthStrategyRegistry).register(Container.get(PublicApiOAuthStrategy));
	});

	beforeEach(async () => {
		await testDb.truncate(['User', 'TagEntity']);
		vi.clearAllMocks();
		authenticationService.advertise.mockResolvedValue({
			authorizationServers: ['https://idp.example'],
			challenges: [CHALLENGE],
		});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	test('authenticates a token the pipeline accepts as the bound user, with API key scopes from the role', async () => {
		const member = await createMember();
		pipeline.run.mockResolvedValue({
			ok: true,
			value: { subject: principalFromUser(member), authMethod: 'oauth-access-token' },
		});
		const token = tokenFrom('https://idp.example');

		const response = await testServer
			.publicApiAgentWithoutApiKey()
			.set('Authorization', `Bearer ${token}`)
			.get('/workflows');

		expect(response.statusCode).toBe(200);
		expect(pipeline.run).toHaveBeenCalledWith(
			expect.objectContaining({
				surface: 'public-api',
				resource: expect.objectContaining({ url: expect.stringMatching(/\/api\/v1$/) }),
				credential: { kind: 'bearer', token },
			}),
		);
	});

	test('answers 401 with a bearer challenge for a token the pipeline rejects', async () => {
		pipeline.run.mockResolvedValue({ ok: false, reason: 'source-not-accepted' });

		const response = await testServer
			.publicApiAgentWithoutApiKey()
			.set('Authorization', `Bearer ${tokenFrom('https://idp.example')}`)
			.get('/workflows');

		expect(response.statusCode).toBe(401);
		expect(response.headers['www-authenticate']).toBe(
			`${CHALLENGE}, error="invalid_token", error_description="source-not-accepted"`,
		);
	});

	test('answers 401 with the bare discovery challenge when the request has no credential', async () => {
		const response = await testServer.publicApiAgentWithoutApiKey().get('/workflows');

		expect(response.statusCode).toBe(401);
		expect(response.body).toEqual({ message: 'Unauthorized' });
		// RFC 6750 §3.1: no error code when the request carried no credential.
		expect(response.headers['www-authenticate']).toBe(CHALLENGE);
		expect(pipeline.run).not.toHaveBeenCalled();
	});

	test('answers 401 with the bare discovery challenge for a wrong API key', async () => {
		const response = await testServer
			.publicApiAgentWithoutApiKey()
			.set('X-N8N-API-KEY', 'not-a-valid-key')
			.get('/workflows');

		expect(response.statusCode).toBe(401);
		expect(response.headers['www-authenticate']).toBe(CHALLENGE);
		expect(pipeline.run).not.toHaveBeenCalled();
	});

	test('leaves API keys to the API key strategy, with no challenge on the success', async () => {
		const owner = await createOwnerWithApiKey();

		const response = await testServer.publicApiAgentFor(owner).get('/workflows');

		expect(response.statusCode).toBe(200);
		expect(response.headers['www-authenticate']).toBeUndefined();
		expect(pipeline.run).not.toHaveBeenCalled();
	});

	test('leaves a bearer whose issuer is not a URL to the other strategies, and still challenges the 401', async () => {
		const response = await testServer
			.publicApiAgentWithoutApiKey()
			.set('Authorization', `Bearer ${tokenFrom('n8n-token-exchange')}`)
			.get('/workflows');

		expect(response.statusCode).toBe(401);
		expect(pipeline.run).not.toHaveBeenCalled();
		expect(response.headers['www-authenticate']).toBe(CHALLENGE);
	});

	describe('scope enforcement', () => {
		let member: User;
		const bearer = () => `Bearer ${tokenFrom('https://idp.example')}`;

		const acceptWith = (tokenScopes?: string[]) =>
			pipeline.run.mockResolvedValue({
				ok: true,
				value: {
					subject: principalFromUser(member),
					authMethod: 'oauth-access-token',
					...(tokenScopes && { tokenScopes }),
				},
			});

		beforeEach(async () => {
			member = await createMember();
		});

		test.each<{ name: string; tokenScopes?: string[]; list: number; create: number }>([
			{ name: 'a read scope only', tokenScopes: ['tag:list'], list: 200, create: 403 },
			{
				name: 'read and write scopes',
				tokenScopes: ['tag:list', 'tag:create'],
				list: 200,
				create: 201,
			},
			{ name: 'no scope claim (full role)', list: 200, create: 201 },
			{
				name: 'only IdP scopes (full role)',
				tokenScopes: ['openid', 'profile'],
				list: 200,
				create: 201,
			},
			{ name: 'a scope outside the token', tokenScopes: ['workflow:list'], list: 403, create: 403 },
			{ name: 'a scope the role lacks', tokenScopes: ['user:create'], list: 403, create: 403 },
		])('with $name: list tags $list, create tag $create', async ({ tokenScopes, list, create }) => {
			acceptWith(tokenScopes);
			const agent = testServer.publicApiAgentWithoutApiKey();

			const listed = await agent.get('/tags').set('Authorization', bearer());
			const created = await agent
				.post('/tags')
				.set('Authorization', bearer())
				.send({ name: 'oauth' });

			expect(listed.statusCode).toBe(list);
			expect(created.statusCode).toBe(create);
			// A refused write must leave no trace.
			expect(await Container.get(TagRepository).count()).toBe(create === 201 ? 1 : 0);
		});

		test('never grants a scope the role lacks, even when the token carries it', async () => {
			acceptWith(['user:create', 'tag:list']);

			const created = await testServer
				.publicApiAgentWithoutApiKey()
				.post('/users')
				.set('Authorization', bearer())
				.send([{ email: 'new@example.com', role: 'global:member' }]);
			const tags = await testServer
				.publicApiAgentWithoutApiKey()
				.get('/tags')
				.set('Authorization', bearer());

			expect(created.statusCode).toBe(403);
			expect(tags.statusCode).toBe(200);
		});
	});
});
