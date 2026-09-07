import { z } from 'zod';
import { Z } from '../../zod-class';

export class ConfirmEmailChangeRequestDto extends Z.class({
	token: z.string(),
}) {}
