import type { ICredentialDataDecryptedObject } from 'n8n-workflow';
import { z } from 'zod';

import { jsonValueSchema } from '../../schemas/json-value.schema';
import { Z } from '../../zod-class';

const jsonObjectSchema = z.object({}).catchall(jsonValueSchema);
const credentialDataSchema: z.ZodType<ICredentialDataDecryptedObject> = z.record(
	z.string(),
	z.union([
		z.string(),
		z.number(),
		z.boolean(),
		z.array(z.string()),
		jsonObjectSchema,
		z.array(jsonObjectSchema),
	]),
);

export class CredentialOptionsRequestDto extends Z.class({
	type: z.string().min(1),
	data: credentialDataSchema,
	propertyName: z.string().min(1),
	filter: z.string().optional(),
	paginationToken: z.string().optional(),
}) {}
