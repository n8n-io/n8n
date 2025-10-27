import { z } from 'zod';
import { Z } from 'zod-class';

import { passwordSchema } from '../../schemas/password.schema';

export class OwnerSetupRequestDto extends Z.class({
	email: z.string().email(),
	firstName: z.string().min(1, 'First name is required'),
	lastName: z.string().min(1, 'Last name is required'),
	password: passwordSchema,
}) {}
