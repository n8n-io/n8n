import { SECRETS_PROVIDER_KEY_REGEX, secretsProviderTypeSchema } from '@n8n/api-types';
import { z } from 'zod';

export const configFileValueSchema = z.union([
	z.string(),
	z.object({ fromEnv: z.string().min(1) }).strict(),
	z.object({ fromFile: z.string().min(1) }).strict(),
]);
export type ConfigFileValue = z.infer<typeof configFileValueSchema>;

export const externalSecretsConfigFileConnectionSchema = z.object({
	key: z.string().min(1).max(128).regex(SECRETS_PROVIDER_KEY_REGEX),
	type: secretsProviderTypeSchema,
	isEnabled: z.boolean().default(true),
	projectIds: z.array(z.string().min(1)).default([]),
	settings: z.record(z.string(), configFileValueSchema),
});
export type ExternalSecretsConfigFileConnection = z.infer<
	typeof externalSecretsConfigFileConnectionSchema
>;

export const externalSecretsConfigFileSchema = z.object({
	connections: z.array(externalSecretsConfigFileConnectionSchema),
});
export type ExternalSecretsConfigFile = z.infer<typeof externalSecretsConfigFileSchema>;
