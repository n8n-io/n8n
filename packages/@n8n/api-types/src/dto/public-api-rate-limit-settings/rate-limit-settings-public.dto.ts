import '../../openapi-extend';

import { z } from 'zod';

import { UpdatePublicApiRateLimitSettingsDto } from './update-public-api-rate-limit-settings.dto';
import { Z } from '../../zod-class';

const fields = UpdatePublicApiRateLimitSettingsDto.schema.shape;

const settingsFields = {
	enabled: fields.enabled.openapi({ description: 'Whether Public API rate limiting is enabled.' }),
	globalReadLimit: fields.globalReadLimit.openapi({
		description: 'Read requests allowed for one API key across all endpoints. Set 0 for no limit.',
	}),
	globalReadWindowSeconds: fields.globalReadWindowSeconds.openapi({
		description: 'The window for the global read limit, in seconds.',
	}),
	globalWriteLimit: fields.globalWriteLimit.openapi({
		description: 'Write requests allowed for one API key across all endpoints. Set 0 for no limit.',
	}),
	globalWriteWindowSeconds: fields.globalWriteWindowSeconds.openapi({
		description: 'The window for the global write limit, in seconds.',
	}),
	endpointReadLimit: fields.endpointReadLimit.openapi({
		description: 'Read requests allowed for one API key on one endpoint. Set 0 for no limit.',
	}),
	endpointReadWindowSeconds: fields.endpointReadWindowSeconds.openapi({
		description: 'The window for the endpoint read limit, in seconds.',
	}),
	endpointWriteLimit: fields.endpointWriteLimit.openapi({
		description: 'Write requests allowed for one API key on one endpoint. Set 0 for no limit.',
	}),
	endpointWriteWindowSeconds: fields.endpointWriteWindowSeconds.openapi({
		description: 'The window for the endpoint write limit, in seconds.',
	}),
};

const envManagedFields = z.array(UpdatePublicApiRateLimitSettingsDto.schema.keyof()).openapi({
	description:
		'Fields controlled by environment variables, including _FILE variables. These fields return their effective values. A PUT can repeat these values but cannot change them.',
	readOnly: true,
});

export class RateLimitSettingsPublicDto extends Z.class({
	...settingsFields,
	envManagedFields,
}) {}

export class UpdateRateLimitSettingsPublicDto extends Z.class(
	{
		...settingsFields,
		envManagedFields: envManagedFields.optional(),
	},
	{ strict: true },
) {}

export class RateLimitSettingsQueryPublicDto extends Z.class({}, { strict: true }) {}
