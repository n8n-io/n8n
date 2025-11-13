import { z } from 'zod';
import { Z } from 'zod-class';

export class ScimPatchRequestDto extends Z.class({
	schemas: z.array(z.string()).default(['urn:ietf:params:scim:api:messages:2.0:PatchOp']),
	Operations: z.array(
		z.object({
			op: z.enum(['add', 'remove', 'replace']),
			path: z.string().optional(),
			value: z.unknown().optional(),
		}),
	),
}) {}
