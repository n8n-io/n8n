import { z } from 'zod';

export const roleMemberSchema = z.object({
	userId: z.string(),
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
	email: z.string(),
	role: z.string(),
});
