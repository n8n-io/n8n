import type { Request, Response } from 'express';

import { ChatIntegrationRegistry } from './agent-chat-integration';
import type { ChatIntegrationService } from './chat-integration.service';
import { channelIntegrationRecorder } from './recording/channel-integration-recorder';

/**
 * Hand an inbound platform webhook to the connected Chat SDK handler of an
 * agent. Project agents and system agents share this: only the route differs.
 */
export async function handleChannelWebhook(
	deps: {
		chatIntegrationRegistry: ChatIntegrationRegistry;
		chatIntegrationService: ChatIntegrationService;
	},
	req: Request,
	res: Response,
	{ agentId, platform }: { agentId: string; platform: string },
): Promise<void> {
	const integration = deps.chatIntegrationRegistry.get(platform);
	const resolution = integration?.resolveWebhookRequest?.({
		headers: req.headers,
		body: req.body,
	});
	if (resolution?.type === 'reject') {
		res.status(resolution.response.status).json(resolution.response.body);
		return;
	}

	const webhookHandler =
		resolution?.type === 'no_match'
			? undefined
			: deps.chatIntegrationService.getWebhookHandler(
					agentId,
					platform,
					resolution?.type === 'select' ? resolution.connectionSelector : undefined,
				);

	if (!webhookHandler) {
		// Allow platforms to respond to setup-time webhooks (e.g. Slack's
		// `url_verification` challenge, WhatsApp's Meta app handshake) before
		// credentials are configured, so the user doesn't have to come back
		// and re-verify URLs after connecting the credential.
		const earlyResponse = integration?.handleUnauthenticatedWebhook?.({
			agentId,
			method: req.method,
			query: req.query as Record<string, string | string[] | undefined>,
			headers: req.headers,
			body: req.body,
		});
		if (earlyResponse) {
			res.status(earlyResponse.status);
			if (earlyResponse.raw) {
				// `body` can be caller-controlled (Meta's hub.challenge echoes
				// back whatever the request's own query string carried).
				// Express defaults a string res.send() to text/html, which would
				// let that value be interpreted as markup — force plain text.
				res.type('text/plain').send(String(earlyResponse.body));
			} else {
				res.json(earlyResponse.body);
			}
			return;
		}
		res.status(404).json({ error: `No active ${platform} integration for agent "${agentId}"` });
		return;
	}

	// Chat SDK webhook handlers accept a Web API Request and return a Web API Response.
	// Convert Express req -> Web Request. We must preserve the raw body exactly as
	// received because the Slack adapter verifies the request signature against it.
	// Using JSON.stringify(req.body) would break signature verification (-> 401).
	const forwardedProto = req.headers['x-forwarded-proto'];
	const protocol =
		(Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) ?? req.protocol;
	const forwardedHost = req.headers['x-forwarded-host'];
	const host =
		(Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) ??
		req.headers.host ??
		'localhost';
	const url = `${protocol}://${host}${req.originalUrl}`;

	// Get the raw body - Express may have parsed it already.
	// If rawBody is available (from rawBodyReader middleware), use it.
	// Otherwise re-encode based on content-type.
	let requestBody: string | undefined;
	if (req.method !== 'GET' && req.method !== 'HEAD') {
		// Express augments Request with rawBody via middleware
		interface RequestWithRawBody {
			rawBody?: Buffer;
		}

		const rawBody = (req as RequestWithRawBody).rawBody;
		if (rawBody) {
			requestBody = rawBody.toString('utf-8');
		} else if (req.headers['content-type']?.includes('application/json')) {
			requestBody = JSON.stringify(req.body);
		} else if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
			requestBody = new URLSearchParams(req.body as Record<string, string>).toString();
		} else {
			requestBody = JSON.stringify(req.body);
		}
	}

	const sanitizedHeaders: Record<string, string> = {};
	for (const [key, value] of Object.entries(req.headers)) {
		if (typeof value === 'string') {
			sanitizedHeaders[key] = value;
		} else if (Array.isArray(value)) {
			sanitizedHeaders[key] = value.join(', ');
		}
	}

	const webRequest = new globalThis.Request(url, {
		method: req.method,
		headers: sanitizedHeaders,
		body: requestBody,
	});
	await channelIntegrationRecorder.recordWebhook(platform, webRequest.clone());

	// In Express, background tasks just need to not be garbage collected.
	// We hold references to keep them alive for the lifetime of the process.
	const backgroundTasks: Array<Promise<unknown>> = [];
	const waitUntil = (task: Promise<unknown>) => {
		backgroundTasks.push(
			task.catch((error: unknown) => {
				console.warn(
					'[AgentIntegrationsController] Background task failed:',
					error instanceof Error ? error.message : String(error),
				);
			}),
		);
	};

	const webResponse = await webhookHandler(webRequest, { waitUntil });

	res.status(webResponse.status);
	webResponse.headers.forEach((value, key) => {
		res.setHeader(key, value);
	});
	const body = await webResponse.text();
	res.send(body);
}
