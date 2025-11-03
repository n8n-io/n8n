import { z } from 'zod';
import { Z } from 'zod-class';

export class ApproveConsentRequestDto extends Z.class({
	approved: z.boolean(),
}) {}
