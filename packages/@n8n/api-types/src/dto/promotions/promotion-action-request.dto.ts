import { z } from 'zod';

import { Z } from '../../zod-class';

export class PromotionActionRequestDto extends Z.class({
	payload: z.record(z.unknown()).optional(),
}) {}
