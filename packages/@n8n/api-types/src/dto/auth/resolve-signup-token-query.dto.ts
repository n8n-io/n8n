import { z } from 'zod';
import { Z } from 'zod-class';

const resolveSignupTokenShape = {
	token: z.string().min(1, 'Token is required'),
};

export class ResolveSignupTokenQueryDto extends Z.class(resolveSignupTokenShape) {}
