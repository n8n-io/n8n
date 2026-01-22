import { z } from 'zod';
import { Z } from 'zod-class';

/**
 * Enable/disable connection.
 * When enabling, triggers connection attempt.
 */
export class SetSecretProviderConnectionEnabledDto extends Z.class({
	enabled: z.boolean(),
}) {}
