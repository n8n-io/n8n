import { z } from 'zod';

export const generateCurlSchema = z.object({
	curl: z.string().describe('The curl command'),
});
