import type { IDataObject, INodeProperties } from 'n8n-workflow';
import { z } from 'zod';

// #region ENUMS & CONSTANTS
// ==========

export const SECRETS_PROVIDER_KEY_PATTERN = '[a-zA-Z][a-zA-Z0-9]*';
export const SECRETS_PROVIDER_KEY_REGEX = new RegExp(`^${SECRETS_PROVIDER_KEY_PATTERN}$`);

export const secretsProviderTypeSchema = z.enum([
	'awsSecretsManager',
	'gcpSecretsManager',
	'vault',
	'azureKeyVault',
	'infisical',
	'onePassword',
]);
export type SecretsProviderType = z.infer<typeof secretsProviderTypeSchema>;

export const secretsProviderStateSchema = z.enum([
	'initializing',
	'initialized',
	'connecting',
	'connected',
	'error',
	'retrying',
]);
export type SecretsProviderState = z.infer<typeof secretsProviderStateSchema>;

/**
 * Connection test state - result of testing a connection
 */
export const secretsProviderConnectionTestStateSchema = z.enum(['connected', 'tested', 'error']);
export type SecretsProviderConnectionTestState = z.infer<
	typeof secretsProviderConnectionTestStateSchema
>;

// ==========
// #endregion

//#region SHARED / NESTED TYPES
// ============================

export const secretsProviderAccessRoleSchema = z.enum([
	'secretsProviderConnection:owner',
	'secretsProviderConnection:user',
]);
export type SecretsProviderAccessRole = z.infer<typeof secretsProviderAccessRoleSchema>;

/**
 * Owner of a secret provider connection
 * Re-uses project schemas defined in project.schema.ts
 */
const connectionProjectSummarySchema = z.object({
	id: z.string(),
	name: z.string(),
	role: secretsProviderAccessRoleSchema.optional(),
});
export type ConnectionProjectSummary = z.infer<typeof connectionProjectSummarySchema>;

/**
 * Secret with its name and optional credentials count
 */
const secretSummarySchema = z.object({
	name: z.string(),
	credentialsCount: z.number().optional(),
});

// ==========
// #endregion

// #region RESPONSE TYPES
// ======================

/**
 * Full connection detail
 * - secrets is optional (not returned in list views)
 */
export const secretProviderConnectionSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: secretsProviderTypeSchema,
	state: secretsProviderStateSchema,
	isEnabled: z.boolean(),
	projects: z.array(connectionProjectSummarySchema),
	settings: z.object({}).catchall(z.any()) satisfies z.ZodType<IDataObject>,
	secretsCount: z.number(),
	secrets: z.array(secretSummarySchema).optional(),
	scopes: z.array(z.string()).optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
});
export type SecretProviderConnection = z.infer<typeof secretProviderConnectionSchema>;
export type SecretProviderConnectionListItem = Omit<
	SecretProviderConnection,
	'settings' | 'secrets'
>;

/**
 * Provider type metadata - for form rendering
 */
export const secretProviderTypeResponseSchema = z.object({
	type: secretsProviderTypeSchema,
	displayName: z.string(),
	icon: z.string(),
	properties: z.array(z.any()) satisfies z.ZodType<INodeProperties[]>,
});
export type SecretProviderTypeResponse = z.infer<typeof secretProviderTypeResponseSchema>;

/**
 * Secret completions response - maps providerKey to a list of secret names
 * Example: { providerA: ["secret1", "secret2"], providerB: ["secret3"] }
 */
export const secretCompletionsResponseSchema = z.record(z.string(), z.array(z.string()));
export type SecretCompletionsResponse = z.infer<typeof secretCompletionsResponseSchema>;

/**
 * Test connection result
 */
export const testSecretProviderConnectionResponseSchema = z.object({
	success: z.boolean(),
	testState: secretsProviderConnectionTestStateSchema,
	error: z.string().optional(),
});
export type TestSecretProviderConnectionResponse = z.infer<
	typeof testSecretProviderConnectionResponseSchema
>;

/**
 * Reload connection result
 */
export const reloadSecretProviderConnectionResponseSchema = z.object({
	success: z.boolean(),
	providers: z.record(z.string(), z.object({ success: z.boolean() })).optional(),
});
export type ReloadSecretProviderConnectionResponse = z.infer<
	typeof reloadSecretProviderConnectionResponseSchema
>;

// ==========
// #endregion
