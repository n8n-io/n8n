import { assignableGlobalRoleSchema } from '@n8n/permissions';
import { Z } from 'zod-class';

export class RoleChangeRequestDto extends Z.class({
	newRoleName: assignableGlobalRoleSchema
		// enforce required (non-nullable, non-optional) with custom error message on undefined
		.nullish()
		.refine((val): val is NonNullable<typeof val> => val !== null && typeof val !== 'undefined', {
			message: 'New role is required',
		}),
}) {}
