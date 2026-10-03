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
			 * User-defined Azure deployment name for classic endpoints. The catalog
			 * model id is not the deployment id, so the agent flow must carry this
			 * separately. Only used by the classic branch.
			 */
			deploymentName: z.string().optional(),
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
		})
		.superRefine((data, ctx) => {
			const hasApiKey = !!data.apiKey?.trim();
			const hasEntra = !!data.oauthTokenData?.access_token;
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
