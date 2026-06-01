import { z } from 'zod';

const apiKeyCreds = z.object({
	apiKey: z.string().optional(),
	baseURL: z.string().optional(),
	headers: z.record(z.string(), z.string()).optional(),
});

/**
 * Per-provider Zod schemas for credential validation.
 * Keys are the provider prefixes used in model IDs (e.g. 'anthropic' in 'anthropic/claude-sonnet-4-5').
 */
export const PROVIDER_CREDENTIAL_SCHEMAS = {
	openai: apiKeyCreds,
	anthropic: apiKeyCreds,
	google: apiKeyCreds,
	xai: apiKeyCreds,
	groq: apiKeyCreds,
	deepseek: apiKeyCreds,
	cohere: apiKeyCreds,
	mistral: apiKeyCreds,
	vercel: apiKeyCreds,
	openrouter: apiKeyCreds,

	'azure-openai': z.object({
		apiKey: z.string().optional(),
		resourceName: z.string().min(1, 'Azure resourceName is required'),
		apiVersion: z.string().optional(),
		baseURL: z.string().optional(),
	}),
	'aws-bedrock': z.object({
		region: z.string().min(1, 'AWS region is required'),
		accessKeyId: z.string().min(1, 'AWS accessKeyId is required'),
		secretAccessKey: z.string().min(1, 'AWS secretAccessKey is required'),
		sessionToken: z.string().optional(),
	}),
} as const;

export type ProviderId = keyof typeof PROVIDER_CREDENTIAL_SCHEMAS;
export type ProviderCredentials<P extends ProviderId> = z.infer<
	(typeof PROVIDER_CREDENTIAL_SCHEMAS)[P]
>;
