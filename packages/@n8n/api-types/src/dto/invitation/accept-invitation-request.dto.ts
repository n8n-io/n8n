import { z } from 'zod';
import { Z } from 'zod-class';

import { passwordSchema } from '../../schemas/password.schema';

// Support both legacy format (inviterId) and new JWT format (token)
// All fields are optional at the schema level, but validation ensures either token OR inviterId is provided
export class AcceptInvitationRequestDto extends Z.class({
	inviterId: z.string().uuid().optional(),
	inviteeId: z.string().uuid().optional(),
	token: z.string().optional(),
	firstName: z.string().min(1, 'First name is required'),
	lastName: z.string().min(1, 'Last name is required'),
	password: passwordSchema,
}) {}
