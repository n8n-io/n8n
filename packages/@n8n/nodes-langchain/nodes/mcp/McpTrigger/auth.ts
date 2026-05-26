import { Container } from '@n8n/di';
import { WebhookAuthorizationError } from 'n8n-nodes-base/dist/nodes/Webhook/error';
import type { IWebhookFunctions } from 'n8n-workflow';

/**
 * DI port for the built-in n8n MCP OAuth2 server.
 *
 * Defined here (in nodes-langchain) so that the trigger can resolve it via
 * the shared `@n8n/di` Container without importing from `packages/cli` —
 * which would create a circular package dependency. The cli's MCP module
 * binds its `McpOAuthTokenService` to this class at module init.
 */
export abstract class McpOAuthTokenVerifier {
	abstract verifyAccessToken(token: string): Promise<unknown>;
	abstract getProtectedResourceMetadataUrl(): string;
}

export async function verifyN8nOAuth2(context: IWebhookFunctions): Promise<void> {
	const req = context.getRequestObject();
	const header = req.headers.authorization;
	if (!header?.startsWith('Bearer ')) {
		throw new WebhookAuthorizationError(401, 'Bearer token required');
	}
	const token = header.slice('Bearer '.length).trim();

	let verifier: McpOAuthTokenVerifier;
	try {
		verifier = Container.get(McpOAuthTokenVerifier);
	} catch {
		throw new WebhookAuthorizationError(503, 'MCP OAuth2 server is not available');
	}

	try {
		await verifier.verifyAccessToken(token);
	} catch {
		throw new WebhookAuthorizationError(403, 'Invalid or expired token');
	}
}

export function buildWwwAuthenticateHeader(resourceMetadataUrl: string): string {
	return `Bearer realm="n8n MCP Trigger", resource_metadata="${resourceMetadataUrl}"`;
}
