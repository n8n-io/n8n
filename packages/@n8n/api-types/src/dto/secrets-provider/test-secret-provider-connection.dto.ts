import type { IDataObject } from 'n8n-workflow';
import { z } from 'zod';

/**
 * Test connection with provided settings.
 * The body contains the settings object to test with.
 */
export const TestSecretProviderConnectionDto = z
	.object({})
	.catchall(z.any()) satisfies z.ZodType<IDataObject>;

export type TestSecretProviderConnectionDto = z.infer<typeof TestSecretProviderConnectionDto>;
