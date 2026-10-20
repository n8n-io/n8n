import { z } from 'zod';

import { SCIM_N8N_USER_SCHEMA } from '../../constants/scim';
import { scimRoleSchema, scimUserExtensionSchema } from '../../schemas/scim.schema';
import { Z } from '../../zod-class';

/**
 * Body of POST and PUT /scim/v2/Users.
 *
 * The instance role arrives in the n8n extension as `instanceRole`, or in the
 * core `roles` attribute for providers that map app roles there. Unknown
 * attributes, such as the `password` that Okta sends on every create, are
 * dropped rather than rejected.
 */
export class ScimUserCreateDto extends Z.class({
	schemas: z.array(z.string()).default(['urn:ietf:params:scim:schemas:core:2.0:User']),
	externalId: z.string().optional(),
	userName: z.string(),
	name: z
		.object({
			formatted: z.string().optional(),
			familyName: z.string().optional(),
			givenName: z.string().optional(),
			middleName: z.string().optional(),
			honorificPrefix: z.string().optional(),
			honorificSuffix: z.string().optional(),
		})
		.optional(),
	displayName: z.string().optional(),
	emails: z
		.array(
			z.object({
				value: z.string().email(),
				type: z.string().optional(),
				primary: z.boolean().optional(),
				display: z.string().optional(),
			}),
		)
		.optional(),
	// No default: a PUT that omits `active` must keep the current state.
	// The service treats an omitted value as true only on create.
	active: z.boolean().optional(),
	roles: z.array(scimRoleSchema).optional(),
	[SCIM_N8N_USER_SCHEMA]: scimUserExtensionSchema.optional(),
}) {}
