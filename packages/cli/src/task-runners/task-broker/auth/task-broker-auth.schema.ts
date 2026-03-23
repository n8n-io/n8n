import { z } from 'zod';

export const taskBrokerAuthRequestBodySchema = z.object({
	token: z.string().min(1),
});

export const bearerTokenSchema = z
	.string()
	.regex(/^Bearer .+$/i)
	.transform((header) => header.slice('Bearer '.length));
