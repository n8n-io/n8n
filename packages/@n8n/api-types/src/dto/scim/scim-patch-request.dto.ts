import { z } from 'zod';
import { Z } from '../../zod-class';

export class ScimPatchRequestDto extends Z.class({
	schemas: z.array(z.string()).default(['urn:ietf:params:scim:api:messages:2.0:PatchOp']),
	Operations: z.array(
		z.object({
			// Entra ID sends `Add`, `Replace` and `Remove` when the tenant URL
			// does not have the `aadOptscim062020` flag.
			op: z.preprocess(
				(op) => (typeof op === 'string' ? op.toLowerCase() : op),
				z.enum(['add', 'remove', 'replace']),
			),
			path: z.string().optional(),
			value: z.unknown().optional(),
		}),
	),
}) {}
