import { LicenseState } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { OperationalError, UserError } from 'n8n-workflow';
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

const createdSessionSchema = z.object({
	id: z.string().min(1),
	connectUrl: z.string().min(1),
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
	}: {
		userId: string;
		attribution: AiGatewayRequestAttribution;
	}): Promise<AiGatewayBrowserSession> {
		// Without keepAlive, Browserbase ends the session when the CDP connection
		// drops, so a crashed or restarted instance cannot leave one running.
		const body = await this.aiGatewayService.sendProviderRequest<unknown>({
			provider: BROWSERBASE_BROWSER_USE_PROVIDER,
			authHeaderKey: BROWSERBASE_API_KEY_HEADER,
			method: 'POST',
			path: '/v1/sessions',
			body: { keepAlive: false, browserSettings: { viewport: BROWSER_VIEWPORT } },
			userId,
			attribution,
			mapErrorResponse: toGatewayError,
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
