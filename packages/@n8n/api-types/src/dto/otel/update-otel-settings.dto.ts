import { z } from 'zod';

import { Z } from '../../zod-class';

export class UpdateOtelSettingsDto extends Z.class({
	enabled: z.boolean(),
	exporterEndpoint: z.string().url(),
	exporterTracingPath: z.string(),
	exporterServiceName: z.string().min(1),
	exporterHeaders: z.string(),
	tracesSampleRate: z.number().min(0).max(1),
	startupConnectivityTimeoutMs: z.number().int().nonnegative(),
	includeNodeSpans: z.boolean(),
	injectOutbound: z.boolean(),
	productionExecutionsOnly: z.boolean(),
}) {}
