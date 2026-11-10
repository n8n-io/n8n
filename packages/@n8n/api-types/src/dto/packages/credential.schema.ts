import { z } from 'zod';

import { credentialDescriptionSchema } from '../../schemas/credential-description.schema';

/**
 * A plain value (boolean, string) can only be a value of a field that decides which other
 * fields show. The package reader checks this against the credential type and drops every other
 * plain value, so the schema accepts the shape and the reader decides.
 */
export type SerializedCredentialDataValue =
	| string
	| boolean
	| SerializedCredentialDataValue[]
	| { [key: string]: SerializedCredentialDataValue };

const serializedCredentialDataValueSchema: z.ZodType<SerializedCredentialDataValue> = z.lazy(() =>
	z.union([
		z.string(),
		z.boolean(),
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
		// Present only when the source instance has credential descriptions on.
		description: credentialDescriptionSchema.optional(),
		data: serializedCredentialDataSchema.optional(),
		dataIsComplete: z.boolean().optional(),
	})
	.strict();

export type SerializedCredential = z.infer<typeof serializedCredentialSchema>;
