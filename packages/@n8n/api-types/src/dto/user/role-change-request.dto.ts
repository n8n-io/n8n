import { z } from 'zod';
import { Z } from 'zod-class';

export class RoleChangeRequestDTO extends Z.class({
	newRoleName: z.enum(['global:admin', 'global:member'], {
		required_error: 'New role is required',
	}),
}) {}
