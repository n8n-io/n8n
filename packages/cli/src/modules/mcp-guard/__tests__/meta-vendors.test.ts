import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import { FACEBOOKGRAPH_PROFILE } from '../facebook-profile';
import { HTTP_PROFILES, type HttpVendorProfile } from '../http-profiles';
import { HttpGuardRouter } from '../http-router';
import type { McpCaller } from '../mcp-upstream';
import type { CapturedRequest } from '../network';
import { fillQuerySecrets, redactQuerySecrets } from '../path-secret';
import { currentRequestContext } from '../request-context';
import { vendorForRequest } from '../vendor-knowledge';
import { WHATSAPP_PROFILE, whatsappGymFacts, whatsappToGym } from '../whatsapp-profile';

const GRAPH = 'graph.facebook.com';
const TOKEN = 'EAAB-secret-token-123';
const PROOF = 'appsecret-proof-abc';
const REAL_PHONE = '109876543210987';
const GYM_PHONE = '5550001111';
const REAL_WABA = '209876543210987';
const GYM_WABA = '6660002222';
const PAGE = '123456789012345';
const facts = { phoneId: GYM_PHONE, wabaId: GYM_WABA };

const result = (body: unknown, status = 200): CallToolResult => ({
	isError: status >= 400,
	content: [{ type: 'text', text: JSON.stringify(body) }],
	_meta: { status, contentType: 'application/json' },
});

const request = (method: string, path: string, body?: unknown, host = GRAPH): CapturedRequest => ({
	method,
	url: new URL(`https://${host}${path}`),
	headers: { authorization: `Bearer ${TOKEN}` },
	body: body === undefined ? undefined : Buffer.from(JSON.stringify(body)),
});

function setup(profile: HttpVendorProfile, withFacts = false) {
	const upstream = {
		listTools: vi.fn(async () => []),
		callTool: vi.fn(async (..._a: unknown[]) => result({ id: PAGE, name: 'Acme' })),
	};
	const gym = {
		listTools: vi.fn(async () => []),
		callTool: vi.fn(async (..._a: unknown[]) => result({ id: 'gym1' })),
	};
	// What the request context held when the hydration ran.
	const context: { querySecrets?: Record<string, string> } = {};
	const hydrator = {
		hydrate: vi.fn(async (..._a: unknown[]) => {
			context.querySecrets = currentRequestContext().querySecrets;
		}),
		hydrateWrite: vi.fn(async (..._a: unknown[]) => {}),
		noteWrite: vi.fn(),
	};
	const router = new HttpGuardRouter({
		upstream: upstream as unknown as McpCaller,
		gym: gym as unknown as McpCaller,
		hydrator,
		profile,
		gymFacts: withFacts ? async () => facts : undefined,
	});
	return { router, upstream, gym, hydrator, context };
}

describe('routing on the shared Graph host', () => {
	it.each([
		['/v13.0/109876543210987/messages', 'whatsapp'],
		['/v19.0/209876543210987/message_templates', 'whatsapp'],
		['/v19.0/209876543210987/phone_numbers', 'whatsapp'],
		['/v13.0/109876543210987/media', 'whatsapp'],
		['/v19.0/109876543210987/whatsapp_business_profile', 'whatsapp'],
		['/whatsapp_business/attachments/', 'whatsapp'],
		['/v23.0/me', 'facebookgraph'],
		['/v23.0/123456789012345/feed', 'facebookgraph'],
		['/v23.0/123456789012345_987654321/comments', 'facebookgraph'],
		['/v23.0', 'facebookgraph'],
	])('sends %s to the %s vendor', (path, name) => {
		expect(vendorForRequest(GRAPH, path)?.name).toBe(name);
	});

	it('sends the video host to Graph, and the media host to WhatsApp', () => {
		expect(
			vendorForRequest('graph-video.facebook.com', '/v23.0/123456789012345/videos')?.name,
		).toBe('facebookgraph');
		expect(vendorForRequest('lookaside.fbsbx.com', '/whatsapp_business/attachments/')?.name).toBe(
			'whatsapp',
		);
	});

	it('refuses a path with no version and no media path, so it never reaches the real service', () => {
		expect(vendorForRequest(GRAPH, '/oauth/access_token')).toBeUndefined();
		expect(vendorForRequest(GRAPH, '/')).toBeUndefined();
		expect(vendorForRequest('lookaside.fbsbx.com', '/other')).toBeUndefined();
	});

	it('has a profile for each vendor', () => {
		expect(HTTP_PROFILES).toContain(FACEBOOKGRAPH_PROFILE);
		expect(HTTP_PROFILES).toContain(WHATSAPP_PROFILE);
	});
});

describe('secrets in the query', () => {
	it('removes the named parameters and keeps the others', () => {
		const url = new URL(
			`https://${GRAPH}/v23.0/me?access_token=${TOKEN}&fields=id,name&appsecret_proof=${PROOF}`,
		);

		const out = redactQuerySecrets(url, ['access_token', 'appsecret_proof', 'appsecret_time']);

		expect(out.url.search).toBe('?fields=id%2Cname');
		expect(out.secrets).toEqual({ access_token: TOKEN, appsecret_proof: PROOF });
		expect(url.search).toContain(TOKEN);
	});

	it('returns the same url when nothing is named', () => {
		const url = new URL(`https://${GRAPH}/v23.0/me?fields=id`);

		expect(redactQuerySecrets(url, ['access_token']).url).toBe(url);
		expect(redactQuerySecrets(url, undefined).url).toBe(url);
	});

	it('puts the secrets back for a real read', () => {
		const req = request('GET', '/v23.0/me?fields=id');

		const filled = fillQuerySecrets(req, { access_token: TOKEN });

		expect(filled.url.searchParams.get('access_token')).toBe(TOKEN);
		expect(filled.url.searchParams.get('fields')).toBe('id');
		expect(fillQuerySecrets(req, {})).toBe(req);
	});

	it('keeps the token out of the args of every call and out of the log', async () => {
		const lines: string[] = [];
		const sink = (line: string) => lines.push(line);
		Container.set(Logger, { info: sink, warn: sink, error: sink } as unknown as Logger);
		const { router, upstream, gym, context } = setup(FACEBOOKGRAPH_PROFILE);

		await router.handle(
			request(
				'GET',
				`/v23.0/${PAGE}/feed?access_token=${TOKEN}&appsecret_proof=${PROOF}&fields=message`,
			),
		);
		await router.handle(
			request('POST', `/v23.0/${PAGE}/feed?access_token=${TOKEN}`, { message: 'hello' }),
		);

		const sent = JSON.stringify([upstream.callTool.mock.calls, gym.callTool.mock.calls]);
		expect(sent).not.toContain(TOKEN);
		expect(sent).not.toContain(PROOF);
		expect(sent).toContain('message');
		expect(context.querySecrets).toEqual({ access_token: TOKEN, appsecret_proof: PROOF });
		expect(lines.length).toBeGreaterThan(0);
		for (const line of lines) expect(line).not.toContain(TOKEN);
	});
});

describe('Facebook Graph policy', () => {
	it('reads the real service for a GET, then the gym answers', async () => {
		const { router, upstream, gym, hydrator } = setup(FACEBOOKGRAPH_PROFILE);

		await router.handle(request('GET', `/v23.0/${PAGE}/feed?fields=message`));

		expect(upstream.callTool).toHaveBeenCalledTimes(1);
		expect(hydrator.hydrate).toHaveBeenCalledTimes(1);
		expect(gym.callTool).toHaveBeenCalledTimes(1);
	});

	it.each([
		['publish a post', 'POST', `/v23.0/${PAGE}/feed`, { message: 'hi' }],
		['comment', 'POST', `/v23.0/${PAGE}_987654321/comments`, { message: 'hi' }],
		['delete a post', 'DELETE', `/v23.0/${PAGE}_987654321`, undefined],
		[
			'batch',
			'POST',
			'/v23.0',
			{
				batch: [
					{ method: 'GET', relative_url: 'me' },
					{ method: 'POST', relative_url: 'me/feed' },
				],
			},
		],
		['video upload', 'POST', `/v23.0/${PAGE}/videos`, { file_url: 'https://x.test/v.mp4' }],
	])('%s goes only to the gym', async (_label, method, path, body) => {
		const { router, upstream, gym } = setup(FACEBOOKGRAPH_PROFILE);

		await router.handle(request(method, path, body));

		expect(upstream.callTool).not.toHaveBeenCalled();
		expect(gym.callTool).toHaveBeenCalledTimes(1);
	});

	it('copies the page of a write into the gym first, and not an object that the gym made', async () => {
		expect(
			FACEBOOKGRAPH_PROFILE.hydrateWrite?.(
				{ method: 'POST', path: `/v23.0/${PAGE}/feed` },
				new Set(),
			),
		).toBe(true);
		expect(
			FACEBOOKGRAPH_PROFILE.hydrateWrite?.(
				{ method: 'POST', path: `/v23.0/${PAGE}/feed` },
				new Set([PAGE]),
			),
		).toBe(false);
		expect(
			FACEBOOKGRAPH_PROFILE.hydrateWrite?.({ method: 'POST', path: '/v23.0/me/feed' }, new Set()),
		).toBe(false);
		const lookups = FACEBOOKGRAPH_PROFILE.lookups!('write_post_feed', {
			method: 'POST',
			path: `/v23.0/${PAGE}/feed`,
		});
		expect(lookups).toEqual([
			{ tool: 'read_get_object', args: { method: 'GET', path: `/v23.0/${PAGE}` } },
		]);
	});
});

describe('WhatsApp policy', () => {
	it.each([
		['send a message', 'POST', `/v13.0/${REAL_PHONE}/messages`],
		['send a template', 'POST', `/v19.0/${REAL_PHONE}/messages`],
		['upload a media', 'POST', `/v13.0/${REAL_PHONE}/media`],
		['register a number', 'POST', `/v19.0/${REAL_PHONE}/register`],
		['update the business profile', 'POST', `/v19.0/${REAL_PHONE}/whatsapp_business_profile`],
		['delete a media', 'DELETE', `/v13.0/${REAL_PHONE}/media`],
	])('%s goes only to the gym', async (_label, method, path) => {
		const { router, upstream, gym } = setup(WHATSAPP_PROFILE, true);

		const res = await router.handle(
			request(method, path, { messaging_product: 'whatsapp', to: '34600000000', type: 'text' }),
		);

		expect(res.status).toBe(200);
		expect(upstream.callTool).not.toHaveBeenCalled();
		expect(gym.callTool).toHaveBeenCalledTimes(1);
	});

	it('reads the templates from the real service, then the gym answers', async () => {
		const { router, upstream, gym, hydrator } = setup(WHATSAPP_PROFILE, true);

		await router.handle(request('GET', `/v19.0/${REAL_WABA}/message_templates?limit=50`));

		expect(upstream.callTool).toHaveBeenCalledTimes(1);
		expect((upstream.callTool.mock.calls[0][1] as { path: string }).path).toBe(
			`/v19.0/${REAL_WABA}/message_templates`,
		);
		expect(hydrator.hydrate).toHaveBeenCalledTimes(1);
		expect((gym.callTool.mock.calls[0][1] as { path: string }).path).toBe(
			`/v19.0/${GYM_WABA}/message_templates`,
		);
	});

	it('sends the phone number id of the gym, not the real one', async () => {
		const { router, gym } = setup(WHATSAPP_PROFILE, true);

		await router.handle(
			request('POST', `/v13.0/${REAL_PHONE}/messages`, { to: '1', type: 'text' }),
		);

		expect((gym.callTool.mock.calls[0][1] as { path: string }).path).toBe(
			`/v13.0/${GYM_PHONE}/messages`,
		);
	});

	it('does not read the real service for the bytes of a media', async () => {
		expect(
			WHATSAPP_PROFILE.hydrateRead?.(
				{ method: 'GET', path: '/whatsapp_business/attachments/' },
				{},
			),
		).toBe(false);
		expect(
			WHATSAPP_PROFILE.hydrateRead?.(
				{ method: 'GET', path: `/v19.0/${REAL_WABA}/message_templates` },
				{},
			),
		).toBe(true);
	});
});

describe('WhatsApp ids of the gym', () => {
	it('changes the id of a phone path and of a business path', () => {
		const messages = { method: 'POST', path: `/v13.0/${REAL_PHONE}/messages` };
		const templates = {
			method: 'GET',
			path: `/v19.0/${REAL_WABA}/message_templates`,
			query: { limit: '5' },
		};

		expect(whatsappToGym(messages, facts).path).toBe(`/v13.0/${GYM_PHONE}/messages`);
		expect(whatsappToGym(templates, facts)).toEqual({
			...templates,
			path: `/v19.0/${GYM_WABA}/message_templates`,
		});
	});

	it('keeps a path that has no phone or business id, and a path when the fact is missing', () => {
		const media = { method: 'GET', path: '/v19.0/987654321098765' };
		const messages = { method: 'POST', path: `/v13.0/${REAL_PHONE}/messages` };

		expect(whatsappToGym(media, facts)).toBe(media);
		expect(whatsappToGym(messages, { wabaId: GYM_WABA })).toBe(messages);
	});

	it('reads the phone number id of the gym with the business account id of the credential', async () => {
		const ask = vi.fn(async () => ({ data: [{ id: GYM_PHONE, display_phone_number: '+1 555' }] }));

		const out = await whatsappGymFacts({ accessToken: 't', businessAccountId: GYM_WABA }, ask);

		expect(out).toEqual({ wabaId: GYM_WABA, phoneId: GYM_PHONE });
		expect(ask).toHaveBeenCalledWith(`/v19.0/${GYM_WABA}/phone_numbers`);
		expect(await whatsappGymFacts({ accessToken: 't' }, ask)).toEqual({});
	});
});
