import { getPersonalProject, testDb } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import jwt from 'jsonwebtoken';
import { InstanceSettings } from 'n8n-core';
import { gzipSync } from 'node:zlib';
import { Header } from 'tar';

import { AppVersionService } from '@/modules/apps/app-version.service';
import { AppRepository } from '@/modules/apps/app.repository';
import { PageRepository } from '@/modules/apps/page.repository';
import { AppPageTokenService } from '@/modules/apps/serving/app-page-token';
import { OAuthAuthorizationCodeService } from '@/modules/oauth-server/oauth-authorization-code.service';
import { OAuthServerService } from '@/modules/oauth-server/oauth-server.service';
import { CacheService } from '@/services/cache/cache.service';
import { createMember, createOwner } from '@test-integration/db/users';
import type { SuperAgentTest } from '@test-integration/types';
import * as utils from '@test-integration/utils';

let owner: User;
let ownerProject: Project;
/** No auth and no `/rest` prefix: an App page is served at the instance root, to anyone. */
let visitor: SuperAgentTest;

// oauth-server: an `n8n` app sends its visitors through the instance's OAuth flow.
const testServer = utils.setupTestServer({
	endpointGroups: ['apps'],
	modules: ['apps', 'oauth-server'],
});

let appRepository: AppRepository;
let pageRepository: PageRepository;

beforeAll(async () => {
	appRepository = Container.get(AppRepository);
	pageRepository = Container.get(PageRepository);

	owner = await createOwner();
	ownerProject = await getPersonalProject(owner);
	visitor = testServer.restlessAgent;
	await Container.get(CacheService).init(); // OAuth flow state lives in the cache
});

beforeEach(async () => {
	await testDb.truncate([
		'App',
		'Page',
		'AccessToken',
		'RefreshToken',
		'AuthorizationCode',
		'OAuthClient',
	]);
});

afterEach(async () => {
	await Container.get(CacheService).reset();
});

const createApp = async () => await appRepository.createApp(ownerProject.id, 'Acme Portal', 'acme');

const tgz = (files: Record<string, string>) => {
	const blocks = Object.entries(files).map(([path, text]) => {
		const content = Buffer.from(text);
		const header = new Header({ path, type: 'File', size: content.length, mtime: new Date(0) });
		header.encode();
		const data = Buffer.alloc(Math.ceil(content.length / 512) * 512);
		content.copy(data);
		return Buffer.concat([header.block!, data]);
	});
	return gzipSync(Buffer.concat([...blocks, Buffer.alloc(1024)]));
};

const INDEX_HTML = '<!doctype html><html><head><title>Acme</title></head><body>app</body></html>';
const APP_JS = 'console.log("app")';

/** An app with a served version, in the given auth mode. */
const createBuiltApp = async (authMode: 'public' | 'n8n') => {
	const created = await createApp();
	const app = await appRepository.updateApp(created, { authMode });
	await Container.get(AppVersionService).create(
		app.id,
		app.projectId,
		tgz({ './src/main.ts': 'export {};' }),
		tgz({ './index.html': INDEX_HTML, './assets/app.js': APP_JS }),
	);
	return app;
};

const pageTokenOf = (html: string) =>
	html.match(/<meta name="n8n-app-token" content="([^"]+)">/)?.[1];

const pageCookie = (token: string) => `n8n-app-acme=${token}`;

/**
 * The browser legs the backend never performs in a test: take the PKCE challenge and
 * state from the authorize redirect, materialize the virtual client, and mint the code
 * the authorization server would issue after consent.
 */
const completeAuthorizeLeg = async (authorizeUrl: string, userId: string) => {
	const url = new URL(authorizeUrl);
	const resourceUrl = url.searchParams.get('client_id')!;
	const state = url.searchParams.get('state')!;
	await Container.get(OAuthServerService).clientsStore.getClient(resourceUrl);
	const code = await Container.get(OAuthAuthorizationCodeService).createAuthorizationCode(
		resourceUrl,
		userId,
		resourceUrl,
		url.searchParams.get('code_challenge')!,
		state,
		resourceUrl,
		[],
	);
	return { code, state };
};

describe('GET /apps/:namespace/ with an active version', () => {
	test('serves index.html of a public app with a page token for an anonymous visitor', async () => {
		const app = await createBuiltApp('public');

		const response = await visitor.get('/apps/acme/').expect(200);

		expect(response.headers['content-type']).toContain('text/html');
		expect(response.headers['content-security-policy']).toContain('sandbox');
		expect(response.headers['set-cookie']).toBeUndefined();
		const token = pageTokenOf(response.text);
		expect(response.text).toBe(
			INDEX_HTML.replace('</head>', `<meta name="n8n-app-token" content="${token}"></head>`),
		);
		expect(Container.get(AppPageTokenService).verify(token!, app.id)).toEqual({});
	});

	test('serves assets unchanged', async () => {
		await createBuiltApp('public');

		const response = await visitor.get('/apps/acme/assets/app.js').expect(200);

		expect(response.text).toBe(APP_JS);
	});

	test('redirects a visitor of an n8n app without the page cookie into the OAuth flow', async () => {
		await createBuiltApp('n8n');

		const response = await visitor.get('/apps/acme/orders?x=1').expect(302);

		const location = new URL(response.headers.location);
		expect(location.pathname).toBe('/oauth/authorize');
		expect(location.searchParams.get('client_id')).toMatch(/\/apps\/acme\/$/);
		expect(location.searchParams.get('redirect_uri')).toBe(location.searchParams.get('client_id'));
		expect(location.searchParams.get('code_challenge_method')).toBe('S256');
	});

	test('serves index.html of an n8n app to a visitor with a valid page cookie and renews it', async () => {
		const app = await createBuiltApp('n8n');
		const cookie = Container.get(AppPageTokenService).mint(app.id, owner.id);

		const response = await visitor.get('/apps/acme/').set('Cookie', pageCookie(cookie)).expect(200);

		const token = pageTokenOf(response.text);
		expect(Container.get(AppPageTokenService).verify(token!, app.id)).toEqual({
			userId: owner.id,
		});
		expect(response.headers['set-cookie'][0]).toMatch(
			new RegExp(`^n8n-app-acme=${token}; Max-Age=900; Path=/apps/acme/; .*HttpOnly; SameSite=Lax`),
		);
	});

	test('redirects a visitor with an expired page cookie into the OAuth flow', async () => {
		const app = await createBuiltApp('n8n');
		const expired = jwt.sign(
			{ sub: owner.id },
			Container.get(InstanceSettings).hmacSignatureSecret,
			{
				algorithm: 'HS256',
				audience: `app:${app.id}`,
				expiresIn: -1,
			},
		);

		const response = await visitor
			.get('/apps/acme/')
			.set('Cookie', pageCookie(expired))
			.expect(302);

		expect(new URL(response.headers.location).pathname).toBe('/oauth/authorize');
	});

	test('redirects a visitor whose page cookie names another app into the OAuth flow', async () => {
		await createBuiltApp('n8n');
		const other = await appRepository.createApp(ownerProject.id, 'Other', 'other');
		const foreign = Container.get(AppPageTokenService).mint(other.id, owner.id);

		const response = await visitor
			.get('/apps/acme/')
			.set('Cookie', pageCookie(foreign))
			.expect(302);

		expect(new URL(response.headers.location).pathname).toBe('/oauth/authorize');
	});

	test('completes the OAuth flow: sets the page cookie and lands on the requested URL', async () => {
		const app = await createBuiltApp('n8n');
		const started = await visitor.get('/apps/acme/orders?x=1').expect(302);
		const { code, state } = await completeAuthorizeLeg(started.headers.location, owner.id);

		const response = await visitor.get(`/apps/acme/?code=${code}&state=${state}`).expect(302);

		expect(response.headers.location).toBe('/apps/acme/orders?x=1');
		const cookie = response.headers['set-cookie'][0];
		expect(cookie).toMatch(/^n8n-app-acme=/);
		const token = cookie.slice('n8n-app-acme='.length, cookie.indexOf(';'));
		expect(Container.get(AppPageTokenService).verify(token, app.id)).toEqual({
			userId: owner.id,
		});

		const page = await visitor.get('/apps/acme/').set('Cookie', pageCookie(token)).expect(200);
		expect(page.text).toContain('n8n-app-token');
	});

	test('does not admit a user without app:read on the project, even with a minted code', async () => {
		await createBuiltApp('n8n');
		const member = await createMember();
		const started = await visitor.get('/apps/acme/').expect(302);
		const { code, state } = await completeAuthorizeLeg(started.headers.location, member.id);

		// The resource gate refuses the token, so the flow restarts instead of admitting.
		const response = await visitor.get(`/apps/acme/?code=${code}&state=${state}`).expect(302);

		expect(new URL(response.headers.location).pathname).toBe('/oauth/authorize');
		expect(response.headers['set-cookie']).toBeUndefined();
	});

	test('answers 403 when the OAuth flow reports an error', async () => {
		await createBuiltApp('n8n');

		await visitor.get('/apps/acme/?error=access_denied').expect(403);
	});

	test('restarts the OAuth flow for a callback with an unknown state', async () => {
		await createBuiltApp('n8n');

		const response = await visitor.get('/apps/acme/?code=abc&state=unknown').expect(302);

		expect(new URL(response.headers.location).pathname).toBe('/oauth/authorize');
	});

	test('keeps serving an n8n app without a version to anyone', async () => {
		const created = await createApp();
		const app = await appRepository.updateApp(created, { authMode: 'n8n' });
		await pageRepository.createPage(app.id, null, '');

		await visitor.get('/apps/acme').expect(200);
	});
});

describe('GET /apps/:namespace', () => {
	test('serves the index page of an App without a session', async () => {
		const app = await createApp();
		await pageRepository.createPage(app.id, null, '');

		const response = await visitor.get('/apps/acme').expect(200);

		expect(response.headers['content-type']).toContain('text/html');
		expect(response.text).toContain('Acme Portal');
	});

	test('serves the sandbox content security policy, as forms and webhooks do', async () => {
		const app = await createApp();
		await pageRepository.createPage(app.id, null, '');

		const response = await visitor.get('/apps/acme').expect(200);

		expect(response.headers['content-security-policy']).toContain('sandbox');
		expect(response.headers['content-security-policy']).not.toContain('allow-same-origin');
	});

	test('answers 404 for a namespace no App owns', async () => {
		const response = await visitor.get('/apps/nobody').expect(404);

		expect(response.text).toContain('Page not found');
	});

	test('answers 404 for an App with no index page', async () => {
		await createApp();

		await visitor.get('/apps/acme').expect(404);
	});

	test('answers 404 for a path no page owns', async () => {
		const app = await createApp();
		await pageRepository.createPage(app.id, null, '');

		await visitor.get('/apps/acme/nowhere').expect(404);
	});

	test('renders the menu as a nested list, mirroring the page tree', async () => {
		const app = await createApp();
		await pageRepository.createPage(app.id, null, '');
		const clients = await pageRepository.createPage(app.id, null, 'clients');
		await pageRepository.createPage(app.id, clients.id, 'orders');

		const response = await visitor.get('/apps/acme/clients').expect(200);

		expect(response.text).toContain("href='/apps/acme'");
		expect(response.text).toContain("href='/apps/acme/clients/orders'");
		// One list for the top level and one for the children of `clients`: the
		// partial has to recurse to produce the second.
		expect(response.text.match(/<ul>/g)).toHaveLength(2);
	});

	test('escapes a param value where it reaches the page', async () => {
		const app = await createApp();
		const clients = await pageRepository.createPage(app.id, null, 'clients');
		await pageRepository.createPage(app.id, clients.id, ':id');

		// The value lands in the menu, both as a link label and inside an href.
		const response = await visitor
			.get(`/apps/acme/clients/${encodeURIComponent('"><script>alert(1)')}`)
			.expect(200);

		expect(response.text).not.toContain('<script>alert(1)');
		expect(response.text).toContain('&lt;script&gt;alert(1)');
	});

	test('answers 404 for a param value carrying an encoded slash', async () => {
		const app = await createApp();
		const clients = await pageRepository.createPage(app.id, null, 'clients');
		await pageRepository.createPage(app.id, clients.id, ':id');

		// One segment cannot hold a path: the menu builds its own links from these
		// values, so a slash inside one would point somewhere else.
		await visitor.get('/apps/acme/clients/a%2Fb').expect(404);
	});

	test('encodes a param value back into the menu links', async () => {
		const app = await createApp();
		const clients = await pageRepository.createPage(app.id, null, 'clients');
		const detail = await pageRepository.createPage(app.id, clients.id, ':id');
		await pageRepository.createPage(app.id, detail.id, 'orders');

		const response = await visitor.get('/apps/acme/clients/a%20b').expect(200);

		expect(response.text).toContain("href='/apps/acme/clients/a%20b/orders'");
	});

	test('does not serve a page of another App', async () => {
		const app = await createApp();
		await pageRepository.createPage(app.id, null, 'clients');
		const other = await appRepository.createApp(ownerProject.id, 'Other', 'other');
		await pageRepository.createPage(other.id, null, 'secret');

		await visitor.get('/apps/acme/secret').expect(404);
	});
});
