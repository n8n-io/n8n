import { z } from 'zod';

import { Z } from '../../zod-class';

export class DeleteDestinationQueryDto extends Z.class({
	id: z.string().min(1),
}) {}
