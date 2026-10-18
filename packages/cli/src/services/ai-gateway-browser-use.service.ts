import { OutboundHttp } from '@n8n/backend-network';
import { Service } from '@n8n/di';
import type { IHttpRequestMethods } from 'n8n-workflow';
import { OperationalError } from 'n8n-workflow';
import { z } from 'zod';
import { AiGatewayService, type AiGatewayRequestAttribution } from './ai-gateway.service';

const BROWSERBASE_BROWSER_USE_GATEWAY_PATH = '/v1/gateway/browserbaseBrowserUse';

const BROWSERBASE_API_KEY_HEADER = 'X-BB-API-Key';

const createdSessionSchema = z.object({
	id: z.string().min(1),
	connectUrl: z.string().min(1),
});

/** A browser session. `connectUrl` carries a signing key, so it must never be logged. */
export type AiGatewayBrowserSession = z.infer<typeof createdSessionSchema>;

/**
 * Manages Browserbase browser sessions through the gateway for a user. The
 * caller drives the browser itself over CDP with the session's `connectUrl`.
 */
@Service()
export class AiGatewayBrowserUseService {
	constructor(
		private readonly aiGatewayService: AiGatewayService,
		private readonly outboundHttp: OutboundHttp,
	) {}

	isGatewayBrowserUseEnabled(): boolean {
		return this.aiGatewayService.isEnabled();
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
		const body = await this.request(userId, attribution, 'POST', '/v1/sessions', {
			keepAlive: false,
		});
		const parsed = createdSessionSchema.safeParse(body);
		if (!parsed.success) {
			throw new OperationalError('Gateway credits returned an invalid browser session.');
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
		await this.request(
			userId,
			attribution,
			'POST',
			`/v1/sessions/${encodeURIComponent(sessionId)}`,
			{ status: 'REQUEST_RELEASE' },
		);
	}

	private async request(
		userId: string,
		attribution: AiGatewayRequestAttribution,
		method: IHttpRequestMethods,
		path: string,
		body: Record<string, unknown>,
	): Promise<unknown> {
		const { url, token } = await this.aiGatewayService.getRequestTarget({
			userId,
			gatewayPath: BROWSERBASE_BROWSER_USE_GATEWAY_PATH,
			attribution,
		});
		const response = await this.outboundHttp
			.requests({
				useDefaultSsrfPolicy: 'unsafe', // the gateway base URL is n8n-owned configuration
			})
			.request({
				method,
				url: `${url}${path}`,
				headers: { [BROWSERBASE_API_KEY_HEADER]: token },
				body,
				json: true,
				returnFullResponse: true,
				ignoreHttpStatusErrors: true,
			});
		if (response.statusCode < 200 || response.statusCode >= 300) {
			throw new OperationalError(
				`Gateway credits browser request failed: HTTP ${response.statusCode}`,
			);
		}
		return response.body;
	}
}
