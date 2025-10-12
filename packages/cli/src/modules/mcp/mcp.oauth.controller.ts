import { authorizationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/authorize.js';
import { clientRegistrationHandler } from '@modelcontextprotocol/sdk/server/auth/handlers/register.js';
import {
	createOAuthMetadata,
	mcpAuthMetadataRouter,
} from '@modelcontextprotocol/sdk/server/auth/router.js';
import { type AuthenticatedRequest } from '@n8n/db';
import { Get, Post, RootLevelController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';

import { McpOAuthService } from './mcp-oauth-service';
import { UrlService } from '@/services/url.service';

const mcpOAuthService = Container.get(McpOAuthService);
const urlService = Container.get(UrlService);

const oauthMetadata = createOAuthMetadata({
	provider: mcpOAuthService,
	issuerUrl: new URL(`${urlService.getInstanceBaseUrl()}/mcp-oauth`),
});

// Modify to support public clients
oauthMetadata.token_endpoint_auth_methods_supported = ['client_secret_post', 'none'];

const metadataRouter = mcpAuthMetadataRouter({
	oauthMetadata,
	resourceServerUrl: new URL(`${urlService.getInstanceBaseUrl()}/mcp-oauth`),
});

// OAuth endpoints under /mcp-oauth
@RootLevelController('/mcp-oauth')
export class McpOAuthController {
	@Get('/authorize', {
		middlewares: [authorizationHandler({ provider: mcpOAuthService })],
	})
	async authorize(_req: AuthenticatedRequest, _res: Response) {}

	@Post('/register', {
		middlewares: [clientRegistrationHandler({ clientsStore: mcpOAuthService.clientsStore })],
	})
	async register(_req: AuthenticatedRequest, _res: Response) {}
}

// Well-known metadata at ROOT level
@RootLevelController('/')
export class McpOAuthMetadataController {
	@Get('/.well-known/*', { middlewares: [metadataRouter] })
	async metadata(_req: AuthenticatedRequest, _res: Response) {}
}
