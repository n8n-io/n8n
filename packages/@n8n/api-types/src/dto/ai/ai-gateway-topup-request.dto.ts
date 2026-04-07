import { z } from 'zod';

import { Z } from '../../zod-class';

export class AiGatewayTopUpRequestDto extends Z.class({
	amount: z.number().int().positive(),
}) {}
