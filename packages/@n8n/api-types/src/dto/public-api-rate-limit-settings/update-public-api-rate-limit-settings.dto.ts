import { z } from 'zod';

import { Z } from '../../zod-class';

/** 0 means no limit. */
const limitSchema = z.number().int().nonnegative();

const windowSecondsSchema = z.number().int().positive();

export class UpdatePublicApiRateLimitSettingsDto extends Z.class({
	enabled: z.boolean(),
	globalReadLimit: limitSchema,
	globalReadWindowSeconds: windowSecondsSchema,
	globalWriteLimit: limitSchema,
	globalWriteWindowSeconds: windowSecondsSchema,
	endpointReadLimit: limitSchema,
	endpointReadWindowSeconds: windowSecondsSchema,
	endpointWriteLimit: limitSchema,
	endpointWriteWindowSeconds: windowSecondsSchema,
}) {}

export type PublicApiRateLimitSettings = z.infer<typeof UpdatePublicApiRateLimitSettingsDto.schema>;

export type PublicApiRateLimitSettingsResponse = PublicApiRateLimitSettings & {
	defaults: Omit<PublicApiRateLimitSettings, 'enabled'>;
	envManagedFields: Array<keyof PublicApiRateLimitSettings>;
};
