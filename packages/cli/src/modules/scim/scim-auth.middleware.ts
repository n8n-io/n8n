import { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import { Service } from '@n8n/di';
import type { NextFunction, RequestHandler, Response } from 'express';

import { ScimSettingsService } from './scim-settings.service';
import { ScimSsoService } from './scim-sso.service';
import { ScimTokenService } from './scim-token.service';

/**
 * Middleware to authenticate SCIM requests using Bearer tokens
 */
@Service()
export class ScimAuthMiddleware {
	constructor(
		private readonly logger: Logger,
		private readonly scimTokenService: ScimTokenService,
		private readonly scimSettingsService: ScimSettingsService,
		private readonly scimSsoService: ScimSsoService,
	) {}

	getAuthMiddleware(): RequestHandler {
		return this.authenticate.bind(this) as RequestHandler;
	}

	/**
	 * Express middleware function to validate SCIM Bearer tokens
	 */
	async authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		try {
			if (!(await this.scimSettingsService.isEnabled())) {
				return this.forbidden(res, 'SCIM provisioning is disabled');
			}

			// Single sign-on can turn off without the SCIM cascade, for example
			// when the license expires, so check it on each request.
			if (!this.scimSsoService.isSsoEnabled()) {
				return this.forbidden(res, 'SCIM provisioning requires SAML or OIDC single sign-on');
			}

			// RFC 7235 section 2.1 makes the auth scheme case-insensitive, and
			// some providers send `bearer`.
			const bearer = /^Bearer[ \t]+(.+)$/i.exec(req.headers.authorization ?? '');

			if (!bearer) {
				this.logger.warn('SCIM: Missing or invalid Authorization header');
				return this.unauthorized(res, 'Authorization header with Bearer token required');
			}

			const token = bearer[1].trim();

			const isValid = await this.scimTokenService.verifyApiKey(token);

			if (!isValid) {
				this.logger.warn('SCIM: Invalid API key provided');
				return this.unauthorized(res, 'Invalid SCIM API key');
			}

			return next();
		} catch (error) {
			this.logger.error('SCIM: Error during authentication', { error });
			return res
				.status(500)
				.header('Content-Type', 'application/scim+json')
				.json({
					schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
					status: '500',
					detail: 'Internal server error',
				});
		}
	}

	private forbidden(res: Response, detail: string) {
		return res
			.status(403)
			.header('Content-Type', 'application/scim+json')
			.json({
				schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
				status: '403',
				detail,
			});
	}

	private unauthorized(res: Response, detail: string) {
		return res
			.status(401)
			.header('WWW-Authenticate', 'Bearer realm="n8n SCIM"')
			.header('Content-Type', 'application/scim+json')
			.json({
				schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
				status: '401',
				detail,
			});
	}
}
