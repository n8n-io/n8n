import type { AuthenticatedRequest } from '@n8n/db';
import type { NextFunction, Response } from 'express';
import { Service } from '@n8n/di';
import { ScimTokenService } from './scim-token.service';
import { Logger } from '@n8n/backend-common';

/**
 * Middleware to authenticate SCIM requests using Bearer tokens
 */
@Service()
export class ScimAuthMiddleware {
	constructor(
		private readonly logger: Logger,
		private readonly scimTokenService: ScimTokenService,
	) {}

	/**
	 * Express middleware function to validate SCIM Bearer tokens
	 */
	async authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
		try {
			// Extract Bearer token from Authorization header
			const authHeader = req.headers.authorization;

			if (!authHeader || !authHeader.startsWith('Bearer ')) {
				this.logger.warn('SCIM: Missing or invalid Authorization header');
				return res.status(401).json({
					schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
					status: '401',
					detail: 'Authorization header with Bearer token required',
				});
			}

			const token = authHeader.substring(7); // Remove 'Bearer ' prefix

			// Verify the token
			const isValid = await this.scimTokenService.verifyApiKey(token);

			if (!isValid) {
				this.logger.warn('SCIM: Invalid API key provided');
				return res.status(401).json({
					schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
					status: '401',
					detail: 'Invalid SCIM API key',
				});
			}

			this.logger.debug('SCIM: Authentication successful');
			return next();
		} catch (error) {
			this.logger.error('SCIM: Error during authentication', { error });
			return res.status(500).json({
				schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
				status: '500',
				detail: 'Internal server error',
			});
		}
	}
}
