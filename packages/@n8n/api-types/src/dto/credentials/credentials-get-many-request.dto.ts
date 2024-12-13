import { z } from 'zod';
import { Z } from 'zod-class';

// TODO: document what these flags do
export class CredentialsGetManyRequest extends Z.class({
	includeData: z.union([z.literal('true'), z.literal('false')]).optional(),
	includeScopes: z.union([z.literal('true'), z.literal('false')]).optional(),
}) {}
