import { z } from 'zod';

import { Z } from '../../zod-class';

export class TransferPreviewQueryDto extends Z.class({
	destinationProjectId: z.string().min(1),
}) {}
