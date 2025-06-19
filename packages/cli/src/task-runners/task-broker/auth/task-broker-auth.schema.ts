import { z } from 'zod';

export const taskBrokerAuthRequestBodySchema = z.object({
	token: z.string().min(1),
});
