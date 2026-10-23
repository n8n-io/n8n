import type { ClientOAuth2Options } from '@n8n/client-oauth2';
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
	openai: apiKeyCreds.extend({
		// Pins the API for a custom baseURL: an OpenAI-COMPATIBLE server only speaks
		// /chat/completions, but a proxy sitting in front of real OpenAI can serve
		// /responses. Leave unset to let `model-factory` read the choice off the
		// endpoint itself.
		apiStyle: z.enum(['responses', 'chat']).optional(),
	}),
	custom: apiKeyCreds.extend({
		baseURL: z.string().min(1, 'baseURL is required'),
		supportsStructuredOutputs: z.boolean().optional(),
	}),
	anthropic: apiKeyCreds,
	/**
	 * Claude on Google Vertex (Anthropic Messages via `:rawPredict`).
	 * `googleCredentials` is a service-account JSON string; omit it to use ADC
	 * (`gcloud auth application-default login`).
	 */
	'google-vertex-anthropic': z.object({
		project: z.string().min(1, 'project is required'),
		location: z.string().min(1, 'location is required').default('global'),
		googleCredentials: z.string().optional(),
		baseURL: z.string().optional(),
		headers: z.record(z.string(), z.string()).optional(),
	}),
	google: apiKeyCreds,
	'google-vertex': z.object({
		sdk: z.string().optional(),
		project: z.string().trim().min(1, 'Google Cloud project ID is required'),
		location: z
			.string()
			.trim()
			.min(1, 'Google Cloud region is required')
			.regex(
				/^(?:global|eu|us|[a-z]+-[a-z]+\d+)$/,
				'Use a Google Cloud region such as us-central1, global, eu, or us',
			),
		clientEmail: z.string().trim().min(1, 'Service account email is required'),
		privateKey: z.string().trim().min(1, 'Service account private key is required'),
	}),
	xai: apiKeyCreds,
	groq: apiKeyCreds,
	deepseek: apiKeyCreds,
	cohere: apiKeyCreds,
	mistral: apiKeyCreds,
	moonshotai: apiKeyCreds,
	alibaba: apiKeyCreds,
	minimax: apiKeyCreds,
	vercel: apiKeyCreds,
	openrouter: apiKeyCreds,
	nvidia: apiKeyCreds,

	'azure-openai': z
		.object({
			apiKey: z.string().optional(),
			resourceName: z.string().optional(),
			apiVersion: z.string().optional(),
			baseURL: z.string().optional(),
			/**
			 * Classic targets *.openai.azure.com (resource name + deployment-based
			 * URLs); Foundry targets *.services.ai.azure.com/openai/v1 (full base
			 * URL). The factory branches on this instead of sniffing the host.
			 */
			endpointType: z.enum(['classic', 'foundry']).optional(),
			/**
			 * Catalog id of the model a Foundry deployment serves, for example
			 * `azure-openai/claude-opus-4-5`. The SDK reads limits and thinking
			 * support from the model id, and a deployment name does not reveal them.
			 */
			catalogModelId: z.string().optional(),
			/**
			 * Entra OAuth2 fields. The model factory mints a Bearer token from these
			 * via `@n8n/client-oauth2` (client-credentials), mirroring the LangChain
			 * Azure node. Mutually exclusive with `apiKey`.
			 */
			oauthClientId: z.string().optional(),
			oauthClientSecret: z.string().optional(),
			oauthAccessTokenUrl: z.string().optional(),
			oauthScope: z.string().optional(),
			oauthAuthentication: z.enum(['body', 'header']).optional(),
			oauthTokenData: z.object({ access_token: z.string() }).passthrough().optional(),
			/** Validates the Entra token URL against the instance's outbound policy. */
			ssrfBridge: z
				.custom<NonNullable<ClientOAuth2Options['ssrfBridge']>>(
					(value) => typeof value === 'object' && value !== null,
				)
				.optional(),
		})
		.superRefine((data, ctx) => {
			const hasApiKey = hasAzureApiKey(data);
			const hasEntra = hasAzureEntraToken(data);
			if (data.endpointType === 'foundry') {
				if (!data.baseURL?.trim()) {
					ctx.addIssue({
						code: 'custom',
						path: ['baseURL'],
						message: 'baseURL is required',
					});
				}
			} else {
				// Classic is the default when endpointType is omitted (legacy credentials).
				if (!data.resourceName?.trim()) {
					ctx.addIssue({
						code: 'custom',
						path: ['resourceName'],
						message: 'Azure resourceName is required',
					});
				}
			}
			if (!hasApiKey && !hasEntra) {
				ctx.addIssue({
					code: 'custom',
					path: ['apiKey'],
					message: 'apiKey or Entra OAuth2 is required',
				});
			}
			if (hasApiKey && hasEntra) {
				ctx.addIssue({
					code: 'custom',
					path: ['apiKey'],
					message: 'Use only one of apiKey or Entra OAuth2',
				});
			}
			if (hasEntra && !data.oauthClientId?.trim()) {
				ctx.addIssue({
					code: 'custom',
					path: ['oauthClientId'],
					message: 'clientId is required for Entra OAuth2',
				});
			}
			if (hasEntra && !data.oauthAccessTokenUrl?.trim()) {
				ctx.addIssue({
					code: 'custom',
					path: ['oauthAccessTokenUrl'],
					message: 'accessTokenUrl is required for Entra OAuth2',
				});
			}
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

/**
 * Auth-field shape for the `azure-openai` credential. Shared by the credential
 * mapper (`cli`), this Zod schema, and the model factory so all three agree on
 * what counts as "Entra" vs "apiKey". Fields are `unknown` because the mapper
 * runs on raw, unvalidated credential records.
 */
export type AzureOpenAiAuthFields = {
	apiKey?: unknown;
	oauthTokenData?: unknown;
};

function isStringRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/** `apiKey` is a non-empty string after trimming. */
export function hasAzureApiKey(creds: AzureOpenAiAuthFields): boolean {
	return typeof creds.apiKey === 'string' && creds.apiKey.trim() !== '';
}

/** A stored Entra OAuth2 access token proves the credential was connected. */
export function hasAzureEntraToken(creds: AzureOpenAiAuthFields): boolean {
	return (
		isStringRecord(creds.oauthTokenData) &&
		typeof creds.oauthTokenData.access_token === 'string' &&
		creds.oauthTokenData.access_token !== ''
	);
}

/** Entra is the active auth path: no usable `apiKey`, and a stored Entra token. */
export function isAzureEntraCredential(creds: AzureOpenAiAuthFields): boolean {
	return !hasAzureApiKey(creds) && hasAzureEntraToken(creds);
}
