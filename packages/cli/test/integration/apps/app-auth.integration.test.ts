import type { AppBlock, AppVersionSnapshot } from '@n8n/api-types';
import { getPersonalProject, testDb } from '@n8n/backend-test-utils';
import { InvalidAuthTokenRepository, type Project, type User } from '@n8n/db';
import { Container } from '@n8n/di';

import { AuthService } from '@/auth/auth.service';
import { AUTH_COOKIE_NAME } from '@/constants';
import { AppVersionRepository } from '@/modules/apps/app-version.repository';
import { AppRepository } from '@/modules/apps/app.repository';
import { PageRepository } from '@/modules/apps/page.repository';
import { AppTokenService, type AppTokenPair } from '@/modules/apps/serving/app-token.service';
import { createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

let owner: User;
let ownerProject: Project;
/** No session and no `/rest` prefix: the visitor of a served App page. */
let visitor: SuperAgentTest;
let authOwnerAgent: SuperAgentTest;
let ownerJwt: string;
let ownerCookie: string;

const testServer = utils.setupTestServer({
	endpointGroups: ['apps'],
	modules: ['apps'],
});

let appRepository: AppRepository;
let pageRepository: PageRepository;
let appVersionRepository: AppVersionRepository;
let appTokenService: AppTokenService;

beforeAll(async () => {
	appRepository = Container.get(AppRepository);
	pageRepository = Container.get(PageRepository);
	appVersionRepository = Container.get(AppVersionRepository);
	appTokenService = Container.get(AppTokenService);

	owner = await createOwner();
	ownerProject = await getPersonalProject(owner);
	visitor = testServer.restlessAgent;
	authOwnerAgent = testServer.authAgentFor(owner);
	ownerJwt = Container.get(AuthService).issueJWT(owner, false, 'browser');
	ownerCookie = `${AUTH_COOKIE_NAME}=${ownerJwt}`;
});

beforeEach(async () => {
	await testDb.truncate(['App', 'AppVersion', 'Page']);
});

const viewerEmailBlock: AppBlock = {
	id: 'p1',
	type: 'paragraph',
	data: { text: 'Hello {{ viewer.email }}' },
};

const codeBlock = (id: string, source: string): AppBlock =>
	({ id, type: 'code', data: { source } }) as AppBlock;

/** Creates a published App with one index page holding `blocks`. */
async function publishApp(blocks: AppBlock[], auth: 'public' | 'n8n', namespace = 'acme') {
	const app = await appRepository.createApp(ownerProject.id, 'Acme Portal', namespace);
	await appRepository.updateApp(app, { auth });
	const page = await pageRepository.createPage(app.id, null, '', blocks);

	const snapshot: AppVersionSnapshot = {
		pages: [{ id: page.id, route: '', parentPageId: null, content: blocks, layout: null }],
		theme: null,
		components: null,
	};
	const version = await appVersionRepository.createFromSnapshot(app.id, snapshot, owner.id);
	await appRepository.setActiveVersionId(app, version.id);

	return { app, page };
}

const CODE_PATTERN = /[?&]_code=([0-9a-f]{64})$/;

/** The one-time code a navigation to `path` is redirected with. */
async function navigateForCode(path: string, cookie?: string) {
	let request = visitor.get(path);
	if (cookie) request = request.set('Cookie', cookie);
	const response = await request.expect(302);
	const match = CODE_PATTERN.exec(response.headers.location);
	if (!match) throw new Error(`No code in redirect to ${response.headers.location}`);
	return match[1];
}

const exchange = (body: Record<string, string>) =>
	visitor.post('/apps/acme/_auth/token').send(body);

/** Navigates like a browser and exchanges the code: the pair the served script holds. */
async function tokensFor(path: string, cookie?: string): Promise<AppTokenPair> {
	const code = await navigateForCode(path, cookie);
	const response = await exchange({ grant: 'code', code }).expect(200);
	return response.body as AppTokenPair;
}

const expectNoToken = (html: string) => {
	expect(html).not.toContain('n8n-app-token');
	expect(html).not.toContain('_token');
	expect(html).not.toContain('_code');
};

describe('GET /apps/:namespace with auth: public', () => {
	test('redirects a navigation to the same URL with a one-time code, keeping the query', async () => {
		await publishApp([viewerEmailBlock], 'public');

		const response = await visitor.get('/apps/acme?page=2').expect(302);

		expect(response.headers.location).toMatch(/^\/apps\/acme\?page=2&_code=[0-9a-f]{64}$/);
		expect(response.headers['cache-control']).toBe('no-store');
	});

	test('renders with a code in the URL, embeds no token and hides the code from the page', async () => {
		await publishApp(
			[
				viewerEmailBlock,
				{ id: 'p2', type: 'paragraph', data: { text: 'Code: {{ query._code }}' } },
			],
			'public',
		);

		const response = await visitor.get('/apps/acme?_code=abc').expect(200);

		expect(response.text).toContain('Hello ');
		expect(response.text).not.toContain(owner.email);
		expect(response.text).toContain('Code: <');
		expectNoToken(response.text);
		expect(response.headers['cache-control']).toBe('no-store');
	});

	test('shows the signed-in viewer when the session cookie is sent', async () => {
		await publishApp([viewerEmailBlock], 'public');

		const response = await visitor
			.get('/apps/acme?_code=abc')
			.set('Cookie', ownerCookie)
			.expect(200);

		expect(response.text).toContain(`Hello ${owner.email}`);
	});
});

describe('POST /apps/:namespace/_auth/token', () => {
	test('exchanges a code once for a token pair', async () => {
		await publishApp([viewerEmailBlock], 'public');
		const code = await navigateForCode('/apps/acme');

		const response = await exchange({ grant: 'code', code }).expect(200);

		expect(response.body).toEqual({
			accessToken: expect.any(String),
			refreshToken: expect.stringMatching(/^[0-9a-f]{64}$/),
			expiresIn: 600,
		});
		expect(response.headers['cache-control']).toBe('no-store');

		const again = await exchange({ grant: 'code', code }).expect(400);
		expect(again.body).toEqual({ error: 'invalid_grant' });
	});

	test('rotates the refresh token and rejects the old one afterwards', async () => {
		await publishApp([viewerEmailBlock], 'public');
		const first = await tokensFor('/apps/acme');

		const response = await exchange({ grant: 'refresh', refreshToken: first.refreshToken }).expect(
			200,
		);

		expect(response.body.refreshToken).not.toBe(first.refreshToken);
		await exchange({ grant: 'refresh', refreshToken: first.refreshToken }).expect(400);
	});

	test('refuses a refresh after the n8n session behind it was invalidated', async () => {
		await publishApp([viewerEmailBlock], 'n8n');
		const pair = await tokensFor('/apps/acme', ownerCookie);
		const invalidAuthTokens = Container.get(InvalidAuthTokenRepository);
		await invalidAuthTokens.insert({
			token: ownerJwt,
			expiresAt: new Date(Date.now() + 3_600_000),
		});

		try {
			const response = await exchange({ grant: 'refresh', refreshToken: pair.refreshToken }).expect(
				400,
			);
			expect(response.body).toEqual({ error: 'invalid_grant' });
		} finally {
			await invalidAuthTokens.delete({ token: ownerJwt });
		}
	});

	test('answers 400 for an unknown code or a malformed body', async () => {
		await exchange({ grant: 'code', code: 'nope' }).expect(400);
		await exchange({}).expect(400);
	});
});

describe('GET /apps/:namespace with auth: n8n', () => {
	test('sends an anonymous navigation to the sign-in page', async () => {
		await publishApp([viewerEmailBlock], 'n8n');

		const response = await visitor.get('/apps/acme').expect(302);

		expect(response.headers.location).toContain('/signin?redirect=%2Fapps%2Facme');
	});

	test('does not clear the session cookie of an anonymous visitor', async () => {
		await publishApp([viewerEmailBlock], 'n8n');

		const response = await visitor.get('/apps/acme').expect(302);

		expect(response.headers['set-cookie']).toBeUndefined();
	});

	test('redirects the owner with a code and then renders their email', async () => {
		await publishApp([viewerEmailBlock], 'n8n');
		const code = await navigateForCode('/apps/acme', ownerCookie);

		const response = await visitor
			.get(`/apps/acme?_code=${code}`)
			.set('Cookie', ownerCookie)
			.expect(200);

		expect(response.text).toContain(`Hello ${owner.email}`);
	});

	test('renders for an access token bound to the viewer, without a cookie', async () => {
		await publishApp([viewerEmailBlock], 'n8n');
		const { accessToken } = await tokensFor('/apps/acme', ownerCookie);

		const response = await visitor
			.get('/apps/acme')
			.set('Authorization', `Bearer ${accessToken}`)
			.expect(200);

		expect(response.text).toContain(`Hello ${owner.email}`);
		expectNoToken(response.text);
	});

	test('answers 401 to a script request with an anonymous token', async () => {
		const { app } = await publishApp([viewerEmailBlock], 'n8n');
		const pair = await appTokenService.exchangeCode(
			await appTokenService.issueCode({ appId: app.id, viewerId: null, sessionToken: null }),
		);

		const response = await visitor
			.get('/apps/acme')
			.set('Authorization', `Bearer ${pair?.accessToken}`)
			.expect(401);

		expect(response.body).toEqual({ error: 'Sign in required' });
	});

	test('answers 401 to a script request with a token of another app', async () => {
		await publishApp([viewerEmailBlock], 'n8n');
		await publishApp([], 'public', 'other');
		const { accessToken } = await tokensFor('/apps/other', ownerCookie);

		await visitor.get('/apps/acme').set('Authorization', `Bearer ${accessToken}`).expect(401);
	});

	test('still answers 404 for a namespace no App owns', async () => {
		await visitor.get('/apps/nobody').expect(404);
	});
});

describe('OPTIONS /apps/:namespace', () => {
	test('allows the Authorization header for the served script', async () => {
		const response = await visitor.options('/apps/acme/').set('Origin', 'null').expect(204);

		expect(response.headers['access-control-allow-origin']).toBe('*');
		expect(response.headers['access-control-allow-headers']).toContain('Authorization');
	});

	test('answers the pre-flight of the token endpoint', async () => {
		const response = await visitor
			.options('/apps/acme/_auth/token')
			.set('Origin', 'null')
			.expect(204);

		expect(response.headers['access-control-allow-methods']).toContain('POST');
		expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
	});
});

describe('GET /apps/_static/app.js', () => {
	test('serves the navigation script, which never reloads the page on its own', async () => {
		const response = await visitor.get('/apps/_static/app.js').expect(200);

		expect(response.headers['content-type']).toContain('javascript');
		expect(response.headers['cache-control']).toContain('max-age=86400');
		expect(response.text).toContain('_auth/token');
		expect(response.text).not.toContain('n8n-app-token');
		expect(response.text).not.toMatch(/location\.(assign|reload|href\s*=)/);
	});
});

describe('GET /rest/projects/:projectId/apps/:appId/pages/:pageId/preview', () => {
	test('renders without any token, and actionUrl() carries none', async () => {
		const { app, page } = await publishApp(
			[
				codeBlock(
					'block-1',
					"export function render(ctx) { return '<a href=\"' + ctx.actionUrl('go') + '\">go</a>'; }",
				),
			],
			'public',
		);

		const response = await authOwnerAgent
			.get(`/projects/${ownerProject.id}/apps/${app.id}/pages/${page.id}/preview`)
			.expect(200);

		expect(response.text).toMatch(
			new RegExp(`/apps/acme/_actions/${page.id}/block-1/go\\?_path=%2Fapps%2Facme"`),
		);
		expectNoToken(response.text);
	});
});

describe('PATCH /rest/projects/:projectId/apps/:appId', () => {
	test('persists the auth setting and returns it', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'Acme Portal', 'acme');

		const response = await authOwnerAgent
			.patch(`/projects/${ownerProject.id}/apps/${app.id}`)
			.send({ auth: 'n8n' })
			.expect(200);

		expect(response.body.data).toMatchObject({ auth: 'n8n' });
		expect((await appRepository.findByNamespace('acme'))?.auth).toBe('n8n');
	});

	test('rejects an unknown auth value', async () => {
		const app = await appRepository.createApp(ownerProject.id, 'Acme Portal', 'acme');

		await authOwnerAgent
			.patch(`/projects/${ownerProject.id}/apps/${app.id}`)
			.send({ auth: 'oauth' })
			.expect(400);
	});
});

describe('POST /apps/:namespace/_actions/:pageId/:blockId/:name', () => {
	const whoAmI = codeBlock(
		'block-1',
		"export function render() { return ''; } export const actions = { me: (ctx) => ({ data: ctx.viewer }) };",
	);

	test('passes the viewer the access token carries into ctx.viewer', async () => {
		const { page } = await publishApp([whoAmI], 'public');
		const { accessToken } = await tokensFor('/apps/acme', ownerCookie);

		const response = await visitor
			.post(`/apps/acme/_actions/${page.id}/block-1/me`)
			.set('Authorization', `Bearer ${accessToken}`)
			.send({})
			.expect(200);

		expect(response.body).toEqual({ data: { id: owner.id, email: owner.email } });
	});

	test('leaves ctx.viewer null for an anonymous token', async () => {
		const { page } = await publishApp([whoAmI], 'public');
		const { accessToken } = await tokensFor('/apps/acme');

		const response = await visitor
			.post(`/apps/acme/_actions/${page.id}/block-1/me`)
			.set('Authorization', `Bearer ${accessToken}`)
			.send({})
			.expect(200);

		expect(response.body).toEqual({ data: null });
	});

	test('answers 401 for an anonymous token on an n8n app', async () => {
		const { app, page } = await publishApp([whoAmI], 'n8n');
		const pair = await appTokenService.exchangeCode(
			await appTokenService.issueCode({ appId: app.id, viewerId: null, sessionToken: null }),
		);

		const response = await visitor
			.post(`/apps/acme/_actions/${page.id}/block-1/me`)
			.set('Authorization', `Bearer ${pair?.accessToken}`)
			.send({})
			.expect(401);

		expect(response.body).toEqual({ error: 'Sign in required' });
	});
});
