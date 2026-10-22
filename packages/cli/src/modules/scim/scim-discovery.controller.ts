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
 * Only advertise what exists. A provider uses whatever it finds here, so an
 * entry without an endpoint behind it turns every sync into a 404, which the
 * customer sees as a broken integration. Group is added by the PR that
 * implements its endpoint.
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
				supported: true,
			},
			bulk: {
				supported: false,
				maxOperations: 0,
				maxPayloadSize: 0,
			},
			filter: {
				supported: true,
				maxResults: 1000,
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
			totalResults: 1,
			Resources: [
				{
					schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
					id: 'User',
					name: 'User',
					endpoint: '/Users',
					description: 'User Account',
					schema: 'urn:ietf:params:scim:schemas:core:2.0:User',
				},
			],
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
			totalResults: 1,
			Resources: [
				{
					id: 'urn:ietf:params:scim:schemas:core:2.0:User',
					name: 'User',
					description: 'User Account',
					attributes: [
						{
							name: 'userName',
							type: 'string',
							multiValued: false,
							required: true,
							caseExact: false,
							mutability: 'readWrite',
							returned: 'default',
							uniqueness: 'server',
						},
						{
							name: 'name',
							type: 'complex',
							multiValued: false,
							required: false,
							mutability: 'readWrite',
							returned: 'default',
							subAttributes: [
								{
									name: 'givenName',
									type: 'string',
									multiValued: false,
									required: false,
									mutability: 'readWrite',
									returned: 'default',
								},
								{
									name: 'familyName',
									type: 'string',
									multiValued: false,
									required: false,
									mutability: 'readWrite',
									returned: 'default',
								},
							],
						},
						{
							name: 'emails',
							type: 'complex',
							multiValued: true,
							required: false,
							mutability: 'readWrite',
							returned: 'default',
						},
						{
							name: 'active',
							type: 'boolean',
							multiValued: false,
							required: false,
							mutability: 'readWrite',
							returned: 'default',
						},
						{
							name: 'roles',
							type: 'complex',
							multiValued: true,
							required: false,
							mutability: 'readWrite',
							returned: 'default',
						},
					],
				},
			],
		});
	}
}
