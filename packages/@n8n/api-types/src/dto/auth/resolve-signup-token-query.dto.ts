import { z } from 'zod';

import { Z } from '../../zod-class';

// Only support JWT token-based invites (tamper-proof)
const resolveSignupTokenShape = {
	token: z.string().min(1, 'Token is required'),
};

export class ResolveSignupTokenQueryDto extends Z.class(resolveSignupTokenShape) {}
