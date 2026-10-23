import type { Logger } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import type { AgentsConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import { createHmac } from 'node:crypto';
import { mock } from 'vitest-mock-extended';

import type { AgentCredentialLookupService } from '../../../agent-credential-lookup.service';
import { WhatsAppCredentialCheckService } from '../../whatsapp/whatsapp-credential-check.service';

const PROJECT_ID = 'project-1';
const CREDENTIAL_ID = 'cred-1';
const PHONE_NUMBER_ID = '1234567890';
const BUSINESS_ACCOUNT_ID = '9876543210';
const ACCESS_TOKEN = 'an-access-token';
const APP_SECRET = 'an-app-secret';
const HOUR_MS = 60 * 60 * 1000;

const user = mock<User>({ id: 'user-1' });

const workingCredential = {
	accessToken: ACCESS_TOKEN,
	phoneNumberId: PHONE_NUMBER_ID,
	businessAccountId: BUSINESS_ACCOUNT_ID,
	appSecret: APP_SECRET,
};

interface RequestOptions {
	url: string;
	qs: Record<string, string>;
	headers: Record<string, string>;
}

interface GraphReply {
	statusCode: number;
	body: unknown;
}

type Route = 'phone' | 'debugToken' | 'phoneNumbers' | 'profile';

const ok = (body: unknown): GraphReply => ({ statusCode: 200, body });

function routeOf(url: string): Route {
	if (url.endsWith('/debug_token')) return 'debugToken';
	if (url.endsWith('/phone_numbers')) return 'phoneNumbers';
	if (url.endsWith('/whatsapp_business_profile')) return 'profile';
	return 'phone';
}

describe('WhatsAppCredentialCheckService', () => {
	let credentialLookup: ReturnType<typeof mock<AgentCredentialLookupService>>;
	let request: ReturnType<typeof vi.fn>;
	let service: WhatsAppCredentialCheckService;
	let replies: Record<Route, () => Promise<GraphReply>>;
	let logger: ReturnType<typeof mock<Logger>>;
	let agentsConfig: AgentsConfig;

	beforeEach(() => {
		credentialLookup = mock<AgentCredentialLookupService>();
		credentialLookup.decryptForUser.mockResolvedValue(workingCredential);

		replies = {
			phone: async () =>
				ok({ display_phone_number: '+1 555-010-0199', verified_name: 'Acme Corp' }),
			debugToken: async () => ok({ data: { expires_at: 0 } }),
			phoneNumbers: async () => ok({ data: [{ id: 'other-number' }, { id: PHONE_NUMBER_ID }] }),
			profile: async () =>
				ok({
					data: [
						{
							about: 'Short status',
							description: 'Longer description',
							profile_picture_url: 'https://cdn.example.com/picture.jpg',
						},
					],
				}),
		};
		request = vi.fn(async (options: RequestOptions) => await replies[routeOf(options.url)]());

		const outboundHttp = mock<OutboundHttp>();
		outboundHttp.requests.mockReturnValue(mock({ request }) as never);
		logger = mock<Logger>();
		agentsConfig = mock<AgentsConfig>({ whatsAppAllowTemporaryToken: false });
		service = new WhatsAppCredentialCheckService(
			credentialLookup,
			outboundHttp,
			logger,
			agentsConfig,
		);
	});

	const check = async () => await service.check(user, PROJECT_ID, CREDENTIAL_ID);

	const callsTo = (route: Route) =>
		request.mock.calls
			.map(([options]) => options as RequestOptions)
			.filter((options) => routeOf(options.url) === route);

	it('looks up the credential for the caller with the WhatsApp credential type', async () => {
		await check();

		expect(credentialLookup.decryptForUser).toHaveBeenCalledWith(
			user,
			PROJECT_ID,
			CREDENTIAL_ID,
			'whatsAppBotApi',
		);
	});

	it('throws NotFoundError when the caller cannot use the credential', async () => {
		credentialLookup.decryptForUser.mockResolvedValue(null);

		await expect(check()).rejects.toThrow(NotFoundError);
		expect(request).not.toHaveBeenCalled();
	});

	it.each([
		['access token', 'accessToken'],
		['phone number ID', 'phoneNumberId'],
		['business account ID', 'businessAccountId'],
		['app secret', 'appSecret'],
	])('reports an incomplete credential with no %s without asking Meta', async (_label, field) => {
		credentialLookup.decryptForUser.mockResolvedValue({ ...workingCredential, [field]: '  ' });

		expect(await check()).toEqual({ status: 'failed', reason: 'incomplete' });
		expect(request).not.toHaveBeenCalled();
	});

	it('sends an appsecret_proof that is the HMAC-SHA256 of the token with the app secret', async () => {
		await check();

		const expectedProof = createHmac('sha256', APP_SECRET).update(ACCESS_TOKEN).digest('hex');
		for (const route of ['phone', 'debugToken', 'phoneNumbers', 'profile'] as const) {
			const [options] = callsTo(route);
			expect(options.qs.appsecret_proof).toBe(expectedProof);
			expect(options.headers.Authorization).toBe(`Bearer ${ACCESS_TOKEN}`);
		}
	});

	it('trims credential fields before it uses them', async () => {
		credentialLookup.decryptForUser.mockResolvedValue({
			accessToken: ` ${ACCESS_TOKEN} `,
			phoneNumberId: ` ${PHONE_NUMBER_ID} `,
			businessAccountId: ` ${BUSINESS_ACCOUNT_ID} `,
			appSecret: ` ${APP_SECRET} `,
		});

		expect(await check()).toMatchObject({ status: 'ok' });
		const [phone] = callsTo('phone');
		expect(phone.url).toMatch(new RegExp(`/${PHONE_NUMBER_ID}$`));
		expect(phone.qs.appsecret_proof).toBe(
			createHmac('sha256', APP_SECRET).update(ACCESS_TOKEN).digest('hex'),
		);
	});

	it('reports a mismatch when Meta refuses the phone number request', async () => {
		replies.phone = async () => ({ statusCode: 400, body: { error: { code: 100 } } });

		expect(await check()).toEqual({ status: 'failed', reason: 'mismatch' });
		expect(callsTo('phoneNumbers')).toHaveLength(0);
	});

	it('reports Meta as unreachable when the phone number request returns a server error', async () => {
		replies.phone = async () => ({ statusCode: 503, body: {} });

		expect(await check()).toEqual({ status: 'failed', reason: 'unreachable' });
	});

	it('reports Meta as unreachable when the request throws', async () => {
		replies.phone = async () => {
			throw new Error('ENOTFOUND');
		};

		expect(await check()).toEqual({ status: 'failed', reason: 'unreachable' });
	});

	it('logs only a sanitized message when the request throws', async () => {
		const proof = createHmac('sha256', APP_SECRET).update(ACCESS_TOKEN).digest('hex');
		replies.phone = async () => {
			throw Object.assign(
				new Error(
					`connect ETIMEDOUT https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}?appsecret_proof=${proof}`,
				),
				{ config: { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } } },
			);
		};

		await check();

		const logged = JSON.stringify(logger.debug.mock.calls);
		expect(logged).toContain('connect ETIMEDOUT');
		expect(logged).not.toContain(ACCESS_TOKEN);
		expect(logged).not.toContain(proof);
	});

	it('reports a temporary token when the token expires within 48 hours', async () => {
		const expiresAt = Math.floor((Date.now() + 24 * HOUR_MS) / 1000);
		replies.debugToken = async () => ok({ data: { expires_at: expiresAt } });

		expect(await check()).toEqual({ status: 'failed', reason: 'temporaryToken' });
	});

	it('passes a token that expires within 48 hours when temporary tokens are allowed', async () => {
		agentsConfig.whatsAppAllowTemporaryToken = true;
		const expiresAt = Math.floor((Date.now() + 24 * HOUR_MS) / 1000);
		replies.debugToken = async () => ok({ data: { expires_at: expiresAt } });

		expect(await check()).toMatchObject({ status: 'ok' });
	});

	it('passes a token that expires after 48 hours', async () => {
		const expiresAt = Math.floor((Date.now() + 60 * 24 * HOUR_MS) / 1000);
		replies.debugToken = async () => ok({ data: { expires_at: expiresAt } });

		expect(await check()).toMatchObject({ status: 'ok' });
	});

	it('passes a token that Meta reports never expires', async () => {
		replies.debugToken = async () => ok({ data: { expires_at: 0 } });

		expect(await check()).toMatchObject({ status: 'ok' });
	});

	it('passes when the token expiry request fails', async () => {
		replies.debugToken = async () => {
			throw new Error('ECONNRESET');
		};

		expect(await check()).toMatchObject({ status: 'ok' });
	});

	it('inspects the token itself in the expiry request', async () => {
		await check();

		const [debugToken] = callsTo('debugToken');
		expect(debugToken.qs.input_token).toBe(ACCESS_TOKEN);
	});

	it('reports a mismatch when the phone number is not in the business account', async () => {
		replies.phoneNumbers = async () => ok({ data: [{ id: 'other-number' }] });

		expect(await check()).toEqual({ status: 'failed', reason: 'mismatch' });
	});

	it('reports a mismatch when the business account response lists no phone numbers', async () => {
		replies.phoneNumbers = async () => ok({});

		expect(await check()).toEqual({ status: 'failed', reason: 'mismatch' });
	});

	it('reports a mismatch when Meta refuses the business account request', async () => {
		replies.phoneNumbers = async () => ({ statusCode: 403, body: { error: { code: 200 } } });

		expect(await check()).toEqual({ status: 'failed', reason: 'mismatch' });
	});

	it('reports Meta as unreachable when the business account request returns a server error', async () => {
		replies.phoneNumbers = async () => ({ statusCode: 500, body: {} });

		expect(await check()).toEqual({ status: 'failed', reason: 'unreachable' });
	});

	it('returns the business profile when every check passes', async () => {
		expect(await check()).toEqual({
			status: 'ok',
			profile: {
				verifiedName: 'Acme Corp',
				displayPhoneNumber: '+1 555-010-0199',
				description: 'Longer description',
				profilePictureUrl: 'https://cdn.example.com/picture.jpg',
			},
		});
	});

	it('uses the about text when the profile has no description', async () => {
		replies.profile = async () => ok({ data: [{ about: 'Short status' }] });

		expect(await check()).toEqual({
			status: 'ok',
			profile: {
				verifiedName: 'Acme Corp',
				displayPhoneNumber: '+1 555-010-0199',
				description: 'Short status',
				profilePictureUrl: undefined,
			},
		});
	});

	it.each([
		[
			'throws',
			async () => {
				throw new Error('ETIMEDOUT');
			},
		],
		['is refused', async () => ({ statusCode: 400, body: {} })],
	])(
		'still passes with only the phone details when the profile request %s',
		async (_label, reply) => {
			replies.profile = reply;

			expect(await check()).toEqual({
				status: 'ok',
				profile: {
					verifiedName: 'Acme Corp',
					displayPhoneNumber: '+1 555-010-0199',
					description: undefined,
					profilePictureUrl: undefined,
				},
			});
		},
	);
});
