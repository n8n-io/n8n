import type { AuthenticatedRequest } from '@n8n/db';
import { Get, RootLevelController } from '@n8n/decorators';
import type { Response } from 'express';

import { scimRoute } from './scim-route';

/**
 * SCIM 2.0 discovery endpoints (RFC 7644 section 4).
 *
 * An identity provider reads these before it pushes anything, to learn which
 * resources and operations this server supports.
 *
 * No resource endpoint exists yet, so this advertises nothing: no resource
 * types, no schemas, and no PATCH or filter support. A provider that reads a
 * capability here will use it, and would then get a 404. Each entry is added
 * by the PR that implements the endpoint behind it.
 */
@RootLevelController('/scim/v2')
export class ScimDiscoveryController {
	/**
	 * GET /scim/v2/ServiceProviderConfig
	 * Return service provider configuration
	 */
	@Get('/ServiceProviderConfig', scimRoute)
	getServiceProviderConfig(_req: AuthenticatedRequest, res: Response) {
		return res.header('Content-Type', 'application/scim+json').json({
			schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
			documentationUri: 'https://docs.n8n.io/user-management/scim/',
			patch: {
				supported: false,
			},
			bulk: {
				supported: false,
				maxOperations: 0,
				maxPayloadSize: 0,
			},
			filter: {
				supported: false,
				maxResults: 0,
			},
			changePassword: {
				supported: false,
			},
			sort: {
				supported: false,
			},
			etag: {
				supported: false,
			},
			authenticationSchemes: [
				{
					type: 'oauthbearertoken',
					name: 'OAuth Bearer Token',
					description: 'Authentication scheme using the OAuth Bearer Token Standard',
					specUri: 'https://tools.ietf.org/html/rfc6750',
					documentationUri: 'https://docs.n8n.io/user-management/scim/',
					primary: true,
				},
			],
		});
	}

	/**
	 * GET /scim/v2/ResourceTypes
	 * Return supported resource types
	 */
	@Get('/ResourceTypes', scimRoute)
	getResourceTypes(_req: AuthenticatedRequest, res: Response) {
		return res.header('Content-Type', 'application/scim+json').json({
			schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
			totalResults: 0,
			Resources: [],
		});
	}

	/**
	 * GET /scim/v2/Schemas
	 * Return supported schemas
	 */
	@Get('/Schemas', scimRoute)
	getSchemas(_req: AuthenticatedRequest, res: Response) {
		return res.header('Content-Type', 'application/scim+json').json({
			schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
			totalResults: 0,
			Resources: [],
		});
	}
}
