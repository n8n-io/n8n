import { z } from 'zod';
import { Z } from '../../zod-class';

/**
 * Body of POST and PUT /scim/v2/Users.
 *
 * `roles` is not declared, so the parser drops it. SSO role mapping owns the
 * instance role, and an IdP that sends roles must not get an error.
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
}) {}
