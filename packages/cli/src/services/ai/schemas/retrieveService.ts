import { z } from 'zod';

export const retrieveServiceSchema = z.object({
	id: z
		.string()
		.describe(
			'The id of the service, has to match the `id` of one of the entries in the CSV file or empty string',
		),
});
