import { z } from 'zod';
import { Z } from 'zod-class';

export class ResolveSignupTokenQueryDto extends Z.class({
	inviterId: z.string().uuid(),
	inviteeId: z.string().uuid(),
}) {}
