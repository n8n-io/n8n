import { z } from 'zod';
import { Z } from 'zod-class';

import { passwordSchema } from '../../schemas/password.schema';

// Only support JWT token-based invites (tamper-proof)
export class AcceptInvitationRequestDto extends Z.class({
	token: z.string().min(1, 'Token is required'),
	firstName: z.string().min(1, 'First name is required'),
	lastName: z.string().min(1, 'Last name is required'),
	password: passwordSchema,
}) {}
