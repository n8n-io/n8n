import { z } from 'zod';

import { Z } from '../../zod-class';

export class TransferDataTableDto extends Z.class({
	destinationProjectId: z.string(),
}) {}
