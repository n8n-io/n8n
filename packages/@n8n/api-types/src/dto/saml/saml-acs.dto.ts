import { z } from 'zod';
import { Z } from 'zod-class';

export class SamlAcsDto extends Z.class({
	RelayState: z.string().optional(),
}) {}
