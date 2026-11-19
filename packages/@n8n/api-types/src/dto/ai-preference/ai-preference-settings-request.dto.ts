import { z } from 'zod';

import { Z } from '../../zod-class';

export class AiPreferenceSettingsRequestDto extends Z.class({
	enabled: z.boolean(),
}) {}
