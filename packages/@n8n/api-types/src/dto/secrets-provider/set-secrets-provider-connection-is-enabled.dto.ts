import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * Enable/disable connection.
 * When enabling, triggers connection attempt.
 */
export class SetSecretsProviderConnectionIsEnabledDto extends Z.class({
	isEnabled: z.boolean(),
}) {}
