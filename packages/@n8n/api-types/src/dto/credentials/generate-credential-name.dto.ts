import { z } from 'zod';
import { Z } from 'zod-class';

export class GenerateCredentialNameRequestQuery extends Z.class({
	name: z.string().optional(),
}) {}
