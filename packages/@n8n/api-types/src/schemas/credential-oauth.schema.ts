import { z } from 'zod';

/** OAuth configuration and authorization state. Contains no credential values. */
export const credentialOAuthContextSchema = z.object({
	mode: z.enum(['managed', 'custom', 'unknown']),
	connectionStatus: z.enum(['connected', 'disconnected', 'unknown']),
});

export type CredentialOAuthContext = z.infer<typeof credentialOAuthContextSchema>;
