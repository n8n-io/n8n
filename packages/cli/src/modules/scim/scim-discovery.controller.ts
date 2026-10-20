import { SCIM_N8N_USER_SCHEMA } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { RoleRepository } from '@n8n/db';
import { Get, RootLevelController } from '@n8n/decorators';
import { GLOBAL_OWNER_ROLE_SLUG } from '@n8n/permissions';
import type { Response } from 'express';

import { scimRoute } from './scim-route';

const CORE_USER_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:User';

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
	constructor(private readonly roleRepository: RoleRepository) {}

	/**
	 * The instance roles a provider may assign, as `canonicalValues`. Read on
	 * each request so custom global roles show up as soon as they exist. The
	 * owner role is never assignable, so it is not advertised.
	 */
	private async assignableInstanceRoles(): Promise<string[]> {
		const roles = await this.roleRepository.find({ where: { roleType: 'global' } });
		return roles
			.map((role) => role.slug)
			.filter((slug) => slug !== GLOBAL_OWNER_ROLE_SLUG)
			.sort();
	}
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
					schema: CORE_USER_SCHEMA,
					schemaExtensions: [{ schema: SCIM_N8N_USER_SCHEMA, required: false }],
				},
			],
		});
	}

	/**
	 * GET /scim/v2/Schemas
	 * Return the core User schema and the n8n extension. The instance role is
	 * advertised in both, with the assignable roles as `canonicalValues`, so a
	 * provider that discovers the schema offers a list instead of a text field.
	 */
	@Get('/Schemas', scimRoute)
	async getSchemas(_req: AuthenticatedRequest, res: Response) {
		const canonicalValues = await this.assignableInstanceRoles();

		return res.header('Content-Type', 'application/scim+json').json({
			schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
			totalResults: 2,
			Resources: [
				{
					schemas: ['urn:ietf:params:scim:schemas:core:2.0:Schema'],
					id: CORE_USER_SCHEMA,
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
							description:
								'The instance role of the user. At most one entry, whose value is a global role.',
							subAttributes: [
								{
									name: 'value',
									type: 'string',
									multiValued: false,
									required: true,
									caseExact: true,
									mutability: 'readWrite',
									returned: 'default',
									canonicalValues,
								},
								{
									name: 'primary',
									type: 'boolean',
									multiValued: false,
									required: false,
									mutability: 'readWrite',
									returned: 'default',
								},
							],
						},
					],
				},
				{
					schemas: ['urn:ietf:params:scim:schemas:core:2.0:Schema'],
					id: SCIM_N8N_USER_SCHEMA,
					name: 'n8n User',
					description: 'n8n extension to the User resource',
					attributes: [
						{
							name: 'instanceRole',
							type: 'string',
							multiValued: false,
							required: false,
							caseExact: true,
							mutability: 'readWrite',
							returned: 'default',
							uniqueness: 'none',
							description:
								'The instance role of the user, as a global role slug. Omit it to keep the current role; a new user without it is a member.',
							canonicalValues,
						},
					],
				},
			],
		});
	}
}
