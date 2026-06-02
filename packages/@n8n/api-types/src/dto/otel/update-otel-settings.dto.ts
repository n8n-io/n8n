import { z } from 'zod';

import { Z } from '../../zod-class';

export class UpdateOtelSettingsDto extends Z.class({
	enabled: z.boolean().optional(),
	exporterEndpoint: z.string().optional(),
	exporterTracingPath: z.string().optional(),
	exporterHeaders: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
	exporterServiceName: z.string().optional(),
	tracesSampleRate: z.number().min(0).max(1).optional(),
	startupConnectivityTimeoutMs: z.number().int().min(0).optional(),
	includeNodeSpans: z.boolean().optional(),
	injectOutbound: z.boolean().optional(),
	publishedOnly: z.boolean().optional(),
}) {}
