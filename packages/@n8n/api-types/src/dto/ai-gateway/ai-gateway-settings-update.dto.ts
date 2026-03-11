import { z } from 'zod';

import { Z } from '../../zod-class';

export class AiGatewaySettingsUpdateDto extends Z.class({
	defaultCategory: z.string().optional(),
}) {}
