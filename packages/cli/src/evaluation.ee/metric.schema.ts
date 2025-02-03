import { z } from 'zod';

export const testMetricCreateRequestBodySchema = z
	.object({
		name: z.string().min(1).max(255),
	})
	.strict();

export const testMetricPatchRequestBodySchema = z
	.object({
		name: z.string().min(1).max(255),
	})
	.strict();
