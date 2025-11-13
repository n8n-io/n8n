import { z } from 'zod';
import { Z } from 'zod-class';

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
	active: z.boolean().default(true),
}) {}
