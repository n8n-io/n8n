import { z } from 'zod';

import { Z } from '../../zod-class';

export class UpdateExternalSecretsSettingsDto extends Z.class({
	systemRolesEnabled: z.boolean(),
}) {}
