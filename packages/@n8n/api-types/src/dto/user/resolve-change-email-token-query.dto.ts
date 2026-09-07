import { z } from 'zod';
import { Z } from '../../zod-class';

export class ResolveChangeEmailTokenQueryDto extends Z.class({
	token: z.string(),
}) {}
