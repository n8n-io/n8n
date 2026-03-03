import { z } from 'zod';

import { Z } from '../../zod-class';

// Support both legacy format (inviterId + inviteeId) and new JWT format (token)
// All fields are optional at the schema level, but validation ensures either token OR (inviterId AND inviteeId) are provided
const resolveSignupTokenShape = {
	inviterId: z.string().uuid().optional(),
	inviteeId: z.string().uuid().optional(),
	token: z.string().optional(),
};

export class ResolveSignupTokenQueryDto extends Z.class(resolveSignupTokenShape) {}
