import { z } from 'zod';

import { Z } from '../../zod-class';

export class GetResourceDependenciesDto extends Z.class({
	resourceIds: z.array(z.string()).min(1).max(100),
	resourceType: z.enum(['workflow', 'credential', 'dataTable']),
}) {}
