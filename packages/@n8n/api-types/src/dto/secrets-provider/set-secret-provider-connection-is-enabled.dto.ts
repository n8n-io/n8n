import { z } from 'zod';
import { Z } from 'zod-class';

/**
 * Enable/disable connection.
 * When enabling, triggers connection attempt.
 */
export class SetSecretProviderConnectionIsEnabledDto extends Z.class({
	isEnabled: z.boolean(),
}) {}
