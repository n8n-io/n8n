import { z } from 'zod';

import { Z } from '../../zod-class';

export class CreateSlackAgentAppDto extends Z.class({
	appConfigurationToken: z.string().min(1),
}) {}
