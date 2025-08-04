import { z } from 'zod';
import { Z } from 'zod-class';

export class SamlToggleDto extends Z.class({
	loginEnabled: z.boolean(),
}) {}
