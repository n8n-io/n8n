import { z } from 'zod';

import { Z } from '../../zod-class';

const updateProjectExecutionQuotaShape = {
	// `-1` is the unlimited sentinel (see `UNLIMITED_LICENSE_QUOTA` /
	// `ProjectExecutionQuotaService.getConsumption`), so it's the one
	// negative value allowed — `min(-1)` alone would also let `0` through,
	// which is rejected outright: it would silently block every execution
	// in the project with no explanation surfaced anywhere, and it isn't a
	// meaningful "no quota" value the way `-1` is.
	limit: z.union([z.literal(-1), z.number().int().min(1)]),
	periodUnit: z.enum(['day', 'week', 'month']),
};

export class UpdateProjectExecutionQuotaDto extends Z.class(updateProjectExecutionQuotaShape) {}
