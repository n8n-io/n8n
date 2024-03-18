import { z } from 'zod';

export const retrieveOpenAPIServiceSchema = z.object({
	service: z.string().describe('The identifier of the service, has to match the provided format'),
	resource: z
		.string()
		.optional()
		.describe('The optional identifier of the resource, has to match the provided format'),
});
