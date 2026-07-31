import { z } from 'zod';

import { Z } from '../../zod-class';

export class CreatePromotionRequestDto extends Z.class({
	model: z.string().min(1),
	// Optional: some models derive the unit externally (e.g. git destination reads it from the repo)
	unitOfWork: z.object({ type: z.string().min(1), id: z.string().min(1) }).optional(),
	options: z.record(z.unknown()).default({}),
}) {}
