import { z } from 'zod';

import { Z } from '../../zod-class';

export class DeactivateWorkflowDto extends Z.class({
	expectedChecksum: z.string().optional(),
}) {}
