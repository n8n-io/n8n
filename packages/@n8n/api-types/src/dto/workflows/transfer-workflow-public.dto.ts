import { z } from 'zod';

import { Z } from '../../zod-class';

export class TransferWorkflowPublicDto extends Z.class({
	destinationProjectId: z.string(),
}) {}
