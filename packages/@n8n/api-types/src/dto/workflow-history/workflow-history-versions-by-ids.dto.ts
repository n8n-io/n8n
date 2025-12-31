import { z } from 'zod';
import { Z } from 'zod-class';

export class WorkflowHistoryVersionsByIdsDto extends Z.class({
	versionIds: z.array(z.string()),
}) {}
