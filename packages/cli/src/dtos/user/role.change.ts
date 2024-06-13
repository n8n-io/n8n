import { z } from 'zod';
import { Z } from 'zod-class';

export class RoleChangeDTO extends Z.class({
	newRoleName: z.enum(['global:admin', 'global:member'], {
		required_error: 'New role is required',
	}),
}) {}
