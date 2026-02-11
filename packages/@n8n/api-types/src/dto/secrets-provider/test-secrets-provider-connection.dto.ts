import type { IDataObject } from 'n8n-workflow';
import { z } from 'zod';

/**
 * Test connection with provided settings.
 * The body contains the settings object to test with.
 */
export const TestSecretsProviderConnectionDto = z
	.object({})
	.catchall(z.any()) satisfies z.ZodType<IDataObject>;

export type TestSecretsProviderConnectionDto = z.infer<typeof TestSecretsProviderConnectionDto>;
