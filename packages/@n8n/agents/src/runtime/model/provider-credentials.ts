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
	custom: apiKeyCreds.extend({
		baseURL: z.string().min(1, 'baseURL is required'),
	}),
	baseten: apiKeyCreds,
	fireworks: apiKeyCreds,
	wafer: apiKeyCreds,
	morph: apiKeyCreds,
	togetherai: apiKeyCreds,
	anthropic: apiKeyCreds,
	google: apiKeyCreds,
	/**
	 * Claude on Google Vertex (Agent Platform). Auth via ADC / service-account JSON —
	 * not an Anthropic API key. `project` / `location` fall back to
	 * `GOOGLE_VERTEX_PROJECT` / `GOOGLE_VERTEX_LOCATION` when omitted.
	 */
	vertex: z.object({
		project: z.string().optional(),
		location: z.string().optional(),
		/** Service-account JSON string; parsed into google-auth-library credentials. */
		googleCredentialsJson: z.string().optional(),
		headers: z.record(z.string(), z.string()).optional(),
	}),
	xai: apiKeyCreds,
	groq: apiKeyCreds,
	deepseek: apiKeyCreds,
	cohere: apiKeyCreds,
	mistral: apiKeyCreds,
	vercel: apiKeyCreds,
	openrouter: apiKeyCreds,
	nvidia: apiKeyCreds,

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
