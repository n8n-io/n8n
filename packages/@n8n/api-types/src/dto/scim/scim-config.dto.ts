import { z } from 'zod';
import { Z } from '../../zod-class';

export class ScimConfigPatchDto extends Z.class({
	enabled: z.boolean(),
}) {}
