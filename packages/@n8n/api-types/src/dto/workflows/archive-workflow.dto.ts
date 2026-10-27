import { z } from 'zod';

import { Z } from '../../zod-class';

export class ArchiveWorkflowDto extends Z.class({
	expectedChecksum: z.string().optional(),
}) {}
