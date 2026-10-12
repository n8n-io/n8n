import { z } from 'zod';

import { containsExpression } from '@/utils';

const expressionStringSchema = z
	.string()
	.refine(containsExpression, { message: 'credential data values must be n8n expressions' });

export type SerializedCredentialDataValue =
	| string
	| SerializedCredentialDataValue[]
	| { [key: string]: SerializedCredentialDataValue };

const serializedCredentialDataValueSchema: z.ZodType<SerializedCredentialDataValue> = z.lazy(() =>
	z.union([
		expressionStringSchema,
		z.array(serializedCredentialDataValueSchema),
		z.record(serializedCredentialDataValueSchema),
	]),
);

export const serializedCredentialDataSchema = z.record(serializedCredentialDataValueSchema);

export type SerializedCredentialData = z.infer<typeof serializedCredentialDataSchema>;

export const serializedCredentialSchema = z
	.object({
		id: z.string().min(1),
		name: z.string().min(1),
		type: z.string().min(1),
		data: serializedCredentialDataSchema.optional(),
	})
	.strict();

export type SerializedCredential = z.infer<typeof serializedCredentialSchema>;
