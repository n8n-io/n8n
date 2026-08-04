import { z } from 'zod';

import { Z } from '../../zod-class';

const OTEL_SETTINGS_KEYS = [
	'enabled',
	'exporterEndpoint',
	'exporterTracingPath',
	'exporterServiceName',
	'exporterHeaders',
	'tracesSampleRate',
	'startupConnectivityTimeoutMs',
	'includeNodeSpans',
	'injectOutbound',
	'productionExecutionsOnly',
] as const;

/**
 * Wire-accurate response DTO for `GET /rest/otel/settings`.
 *
 * Mirrors what `OtelSettingsService.getSettings()` returns: the OtelConfig fields
 * plus `envManagedFields`. Used both as the declared response contract on the
 * controller (via `@ApiResponse`) and as the type/parse source for the generated
 * frontend client. See API-42.
 */
export class OtelSettingsResponseDto extends Z.class({
	enabled: z.boolean(),
	exporterEndpoint: z.string(),
	exporterTracingPath: z.string(),
	exporterServiceName: z.string(),
	exporterHeaders: z.string(),
	tracesSampleRate: z.number(),
	startupConnectivityTimeoutMs: z.number(),
	includeNodeSpans: z.boolean(),
	injectOutbound: z.boolean(),
	productionExecutionsOnly: z.boolean(),
	envManagedFields: z.array(z.enum(OTEL_SETTINGS_KEYS)),
}) {}
