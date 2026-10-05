import { z } from 'zod';

import { userBaseSchema } from './user.schema';

const ConfirmationSent = z.object({
	status: z.literal('confirmation-sent'),
});

const EmailChanged = z.object({
	status: z.literal('changed'),
	user: userBaseSchema,
});

export const ChangeEmailResponseSchema = z.discriminatedUnion('status', [
	ConfirmationSent,
	EmailChanged,
]);

export type ChangeEmailResponse = z.output<typeof ChangeEmailResponseSchema>;
