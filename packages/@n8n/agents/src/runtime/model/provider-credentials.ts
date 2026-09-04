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
		// Overrides the base-URL heuristic in `model-factory`: an OpenAI-COMPATIBLE
		// server only speaks /chat/completions, but a proxy sitting in front of real
		// OpenAI can serve /responses. Leave unset to keep the heuristic.
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
	volcengine: apiKeyCreds,

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
		})
		.superRefine((data, ctx) => {
			if (data.endpointType === 'foundry') {
				if (!data.baseURL?.trim()) {
					ctx.addIssue({
						code: 'custom',
						path: ['baseURL'],
						message: 'baseURL is required',
					});
				}
				return;
			}
			// Classic is the default when endpointType is omitted (legacy credentials).
			if (!data.resourceName?.trim()) {
				ctx.addIssue({
					code: 'custom',
					path: ['resourceName'],
					message: 'Azure resourceName is required',
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
