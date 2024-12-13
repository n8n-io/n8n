import { z } from 'zod';
import { Z } from 'zod-class';

export class CredentialsGetOneRequest extends Z.class({
	includeData: z.union([z.literal('true'), z.literal('false')]).optional(),
}) {}
