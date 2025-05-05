import { z } from 'zod';
import { Z } from 'zod-class';

export class SamlAcsDto extends Z.class({
	// eslint-disable-next-line @typescript-eslint/naming-convention
	RelayState: z.string().optional(),
}) {}
