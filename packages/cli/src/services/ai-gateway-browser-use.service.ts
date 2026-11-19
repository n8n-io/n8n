import { LicenseState } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { OperationalError, UserError } from '@n8n/errors';
import { z } from 'zod';
import {
	AiGatewayService,
	type AiGatewayErrorResponse,
	type AiGatewayRequestAttribution,
} from './ai-gateway.service';

const BROWSERBASE_BROWSER_USE_PROVIDER = 'browserbaseBrowserUse';

const BROWSERBASE_API_KEY_HEADER = 'X-BB-API-Key';

/**
 * The browser window size. The live view scales the window to fit its frame, so a large window
 * looks zoomed out. 16:10 matches the frame in the UI, and 1280 wide still gets desktop layouts.
 */
export const BROWSER_VIEWPORT = { width: 1280, height: 800 };

const REQUEST_TIMEOUT_MS = 30 * Time.seconds.toMilliseconds;

const createdSessionSchema = z.object({
	id: z.string().min(1),
	connectUrl: z.string().min(1),
	region: z.string().optional(),
});

/**
 * The live view of a session's first tab, and of each open tab. A tab's `id` is its CDP
 * target id.
 */
const liveViewSchema = z.object({
	debuggerFullscreenUrl: z.string().min(1),
	pages: z
		.array(z.object({ id: z.string().min(1), debuggerFullscreenUrl: z.string().min(1) }))
		.default([])
		.catch([]),
});

/** A context id is the gateway's own id. The gateway never returns Browserbase's. */
const createdContextSchema = z.object({ id: z.string().min(1) });

const savedContextSchema = z.object({
	id: z.string().min(1),
	/** The registrable domain the login is for, for example "linkedin.com". */
	domain: z.string().min(1),
	/** The region of the session the login was made in. */
	region: z.string().min(1),
	proxyCountry: z.string().optional(),
	proxyCity: z.string().optional(),
	/** When the login was last saved. */
	savedAt: z.string().datetime().pipe(z.coerce.date()),
	/** When a session last used the login. */
	lastUsedAt: z.string().datetime().pipe(z.coerce.date()),
});

/** Errors from the gateway itself carry a message written for the user. */
const gatewayErrorSchema = z.object({
	error: z.object({
		message: z.string().min(1),
		type: z.string().startsWith('ai_gateway_'),
	}),
});

/** A browser session. `connectUrl` carries a signing key, so it must never be logged. */
export type AiGatewayBrowserSession = z.infer<typeof createdSessionSchema>;

/**
 * The live view links of a session. A link lets anyone who has it watch and control the
 * browser, so it must never be logged or stored.
 */
export type AiGatewayBrowserLiveView = z.infer<typeof liveViewSchema>;

/**
 * A saved login: a Browserbase context that the user saved for one site. A session that uses
 * it must run in the same region and through the same proxy, or some sites end the login.
 */
export type AiGatewaySavedBrowserContext = z.infer<typeof savedContextSchema>;

/**
 * Manages Browserbase browser sessions through the gateway for a user. The
 * caller drives the browser itself over CDP with the session's `connectUrl`.
 */
@Service()
export class AiGatewayBrowserUseService {
	constructor(
		private readonly aiGatewayService: AiGatewayService,
		private readonly licenseState: LicenseState,
	) {}

	isGatewayBrowserUseEnabled(): boolean {
		return this.aiGatewayService.isEnabled() && this.licenseState.isAiGatewayCloudUbbLicensed();
	}

	async createSession({
		userId,
		attribution,
		proxyCountry,
		proxyCity,
		region,
		contextId,
	}: {
		userId: string;
		attribution: AiGatewayRequestAttribution;
		proxyCountry?: string;
		/** A city in `proxyCountry`. Ignored without a country. */
		proxyCity?: string;
		/** The Browserbase region. The gateway picks one when it is not given. */
		region?: string;
		/** A context from `createContext`. The session saves its browser state to it when it ends. */
		contextId?: string;
	}): Promise<AiGatewayBrowserSession> {
		// Without keepAlive, Browserbase ends the session when the CDP connection
		// drops, so a crashed or restarted instance cannot leave one running.
		const body = await this.aiGatewayService.sendProviderRequest<unknown>({
			provider: BROWSERBASE_BROWSER_USE_PROVIDER,
			authHeaderKey: BROWSERBASE_API_KEY_HEADER,
			method: 'POST',
			path: '/v1/sessions',
			body: {
				keepAlive: false,
				...(region && { region }),
				browserSettings: {
					viewport: BROWSER_VIEWPORT,
					...(contextId && { context: { id: contextId } }),
				},
				...(proxyCountry && {
					proxies: [
						{
							type: 'browserbase',
							geolocation: { country: proxyCountry, ...(proxyCity && { city: proxyCity }) },
						},
					],
				}),
			},
			userId,
			attribution,
			mapErrorResponse: toGatewayError,
			timeoutMs: REQUEST_TIMEOUT_MS,
		});
		const parsed = createdSessionSchema.safeParse(body);
		if (!parsed.success) {
			throw new OperationalError('Gateway credits returned an invalid browser session.');
		}
		return parsed.data;
	}

	async getLiveView({
		userId,
		attribution,
		sessionId,
	}: {
		userId: string;
		attribution: AiGatewayRequestAttribution;
		sessionId: string;
	}): Promise<AiGatewayBrowserLiveView> {
		const body = await this.aiGatewayService.sendProviderRequest<unknown>({
			provider: BROWSERBASE_BROWSER_USE_PROVIDER,
			authHeaderKey: BROWSERBASE_API_KEY_HEADER,
			method: 'GET',
			path: `/v1/sessions/${encodeURIComponent(sessionId)}/debug`,
			userId,
			attribution,
			mapErrorResponse: toGatewayError,
			timeoutMs: REQUEST_TIMEOUT_MS,
		});
		const parsed = liveViewSchema.safeParse(body);
		if (!parsed.success) {
			throw new OperationalError('Gateway credits returned an invalid browser live view.');
		}
		return parsed.data;
	}

	async releaseSession({
		userId,
		attribution,
		sessionId,
	}: {
		userId: string;
		attribution: AiGatewayRequestAttribution;
		sessionId: string;
	}): Promise<void> {
		await this.aiGatewayService.sendProviderRequest({
			provider: BROWSERBASE_BROWSER_USE_PROVIDER,
			authHeaderKey: BROWSERBASE_API_KEY_HEADER,
			method: 'POST',
			path: `/v1/sessions/${encodeURIComponent(sessionId)}`,
			body: { status: 'REQUEST_RELEASE' },
			userId,
			attribution,
			mapErrorResponse: toGatewayError,
			timeoutMs: REQUEST_TIMEOUT_MS,
		});
	}

	/**
	 * Creates an empty context for a new session, so that the login made in the session can be
	 * saved afterwards. The gateway deletes the context a few hours after its last use, unless
	 * `saveContext` saves it.
	 */
	async createContext({
		userId,
		attribution,
	}: {
		userId: string;
		attribution: AiGatewayRequestAttribution;
	}): Promise<{ id: string }> {
		const body = await this.aiGatewayService.sendProviderRequest<unknown>({
			provider: BROWSERBASE_BROWSER_USE_PROVIDER,
			authHeaderKey: BROWSERBASE_API_KEY_HEADER,
			method: 'POST',
			path: '/v1/contexts',
			body: {},
			userId,
			attribution,
			mapErrorResponse: toGatewayError,
			timeoutMs: REQUEST_TIMEOUT_MS,
		});
		const parsed = createdContextSchema.safeParse(body);
		if (!parsed.success) {
			throw new OperationalError('Could not read the new browser login. Try again later.');
		}
		return parsed.data;
	}

	/**
	 * Saves a context as the user's login for `domain`, and returns it as saved. `region` and the
	 * proxy location are where the login was made. A later session that uses the context must send
	 * them again.
	 */
	async saveContext({
		userId,
		attribution,
		contextId,
		domain,
		region,
		proxyCountry,
		proxyCity,
	}: {
		userId: string;
		attribution: AiGatewayRequestAttribution;
		contextId: string;
		domain: string;
		region: string;
		proxyCountry?: string;
		proxyCity?: string;
	}): Promise<AiGatewaySavedBrowserContext> {
		const body = await this.aiGatewayService.sendProviderRequest<unknown>({
			provider: BROWSERBASE_BROWSER_USE_PROVIDER,
			authHeaderKey: BROWSERBASE_API_KEY_HEADER,
			method: 'POST',
			path: `/v1/contexts/${encodeURIComponent(contextId)}/save`,
			body: {
				domain,
				region,
				...(proxyCountry && { proxyCountry }),
				...(proxyCountry && proxyCity && { proxyCity }),
			},
			userId,
			attribution,
			mapErrorResponse: toGatewayError,
			timeoutMs: REQUEST_TIMEOUT_MS,
		});
		const parsed = savedContextSchema.safeParse(body);
		if (!parsed.success) {
			throw new OperationalError('Could not read the saved login. Try again later.');
		}
		return parsed.data;
	}

	/**
	 * Deletes a context, saved or not. This request is free and is not part of a task, so it
	 * has no attribution.
	 */
	async deleteContext({ userId, contextId }: { userId: string; contextId: string }): Promise<void> {
		await this.aiGatewayService.sendProviderRequest({
			provider: BROWSERBASE_BROWSER_USE_PROVIDER,
			authHeaderKey: BROWSERBASE_API_KEY_HEADER,
			method: 'DELETE',
			path: `/v1/contexts/${encodeURIComponent(contextId)}`,
			userId,
			mapErrorResponse: toGatewayError,
			timeoutMs: REQUEST_TIMEOUT_MS,
		});
	}
}

/**
 * Turns a failed response into an error: a `UserError` for 4xx, an `OperationalError` otherwise.
 * Only the gateway's own messages are passed on. Upstream ones are not written for users.
 */
export function toGatewayError(response: AiGatewayErrorResponse): UserError | OperationalError {
	const gatewayError = gatewayErrorSchema.safeParse(response.body);
	const message = gatewayError.success
		? gatewayError.data.error.message
		: `Failed to complete the browser session request (HTTP ${response.statusCode}).`;

	return response.statusCode >= 400 && response.statusCode < 500
		? new UserError(message)
		: new OperationalError(message);
}
