import { z } from 'zod';

import { Z } from '../../zod-class';

export class TestOtelConnectionDto extends Z.class({
	exporterEndpoint: z.string().url(),
	exporterTracingPath: z.string(),
	exporterServiceName: z.string().min(1),
	exporterHeaders: z.string(),
	startupConnectivityTimeoutMs: z.number().int().nonnegative(),
}) {}
