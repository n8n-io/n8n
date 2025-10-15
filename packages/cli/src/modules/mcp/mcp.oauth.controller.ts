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
import { Logger } from '@n8n/backend-common';

import { McpOAuthService } from './mcp-oauth-service';
import { UrlService } from '@/services/url.service';
import { skip } from 'node:test';

// const mcpOAuthService = Container.get(McpOAuthService);
// const urlService = Container.get(UrlService);

// const oauthMetadata = createOAuthMetadata({
// 	provider: mcpOAuthService,
// 	issuerUrl: new URL(`${urlService.getInstanceBaseUrl()}/mcp-oauth`),
// });

// // Modify to support public clients
// oauthMetadata.token_endpoint_auth_methods_supported = ['none'];

// const metadataRouter = mcpAuthMetadataRouter({
// 	oauthMetadata,
// 	resourceServerUrl: new URL(`${urlService.getInstanceBaseUrl()}/mcp-oauth`),
// });

// // OAuth endpoints under /mcp-oauth
// @RootLevelController('/mcp-oauth')
// export class McpOAuthController {
// 	@Get('/authorize', {
// 		middlewares: [authorizationHandler({ provider: mcpOAuthService })],
// 	})
// 	async authorize(_req: AuthenticatedRequest, _res: Response) {}

// 	@Post('/register', {
// 		middlewares: [clientRegistrationHandler({ clientsStore: mcpOAuthService.clientsStore })],
// 	})
// 	async register(_req: AuthenticatedRequest, _res: Response) {}
// }

console.log('=====================================');
console.log('McpOAuthMetadataController FILE LOADED');
console.log('=====================================');

// Well-known metadata at ROOT level
@RootLevelController('/app')
export class McpOAuthMetadataController {
	constructor(private readonly logger: Logger) {
		this.logger.info('McpOAuthMetadataController initialized');
	}
	@Get('/.well-known/authorization-server', { skipAuth: true })
	async metadata(_req: AuthenticatedRequest, _res: Response) {
		return {
			issuer: 'http://localhost:5678/mcp-oauth',
			authorization_endpoint: 'http://localhost:5678/authorize',
			token_endpoint: 'http://localhost:5678/token',
			registration_endpoint: 'http://localhost:5678/register',
			response_types_supported: ['code'],
			grant_types_supported: ['authorization_code', 'refresh_token'],
			token_endpoint_auth_methods_supported: ['client_secret_post'],
			revocation_endpoint: 'http://localhost:5678/revoke',
			revocation_endpoint_auth_methods_supported: ['client_secret_post'],
			code_challenge_methods_supported: ['S256'],
		};
	}
}
