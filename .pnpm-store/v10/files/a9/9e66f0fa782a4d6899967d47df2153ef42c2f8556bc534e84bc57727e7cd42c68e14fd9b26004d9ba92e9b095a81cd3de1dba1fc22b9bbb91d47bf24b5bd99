import type { ChatCompletionInput, PipelineType } from "@huggingface/tasks";
import type { InferenceProviderMappingEntry } from "./lib/getInferenceProviderMapping.js";

/**
 * HF model id, like "meta-llama/Llama-3.3-70B-Instruct"
 */
export type ModelId = string;

export interface Options {
	/**
	 * (Default: true) Boolean. If a request 503s, the request will be retried with the same parameters.
	 */
	retry_on_error?: boolean;

	/**
	 * Custom fetch function to use instead of the default one, for example to use a proxy or edit headers.
	 */
	fetch?: typeof fetch;
	/**
	 * Abort Controller signal to use for request interruption.
	 */
	signal?: AbortSignal;

	/**
	 * (Default: "same-origin"). String | Boolean. Credentials to use for the request. If this is a string, it will be passed straight on. If it's a boolean, true will be "include" and false will not send credentials at all.
	 */
	includeCredentials?: string | boolean;

	/**
	 * The billing account to use for the requests.
	 *
	 * By default the requests are billed on the user's account.
	 * Requests can only be billed to an organization the user is a member of, and which has subscribed to Enterprise Hub.
	 */
	billTo?: string;
}

export type InferenceTask = Exclude<PipelineType, "other"> | "conversational";

export const INFERENCE_PROVIDERS = [
	"black-forest-labs",
	"cerebras",
	"cohere",
	"fal-ai",
	"featherless-ai",
	"fireworks-ai",
	"groq",
	"hf-inference",
	"hyperbolic",
	"nebius",
	"novita",
	"nscale",
	"openai",
	"ovhcloud",
	"replicate",
	"sambanova",
	"together",
] as const;

export const PROVIDERS_OR_POLICIES = [...INFERENCE_PROVIDERS, "auto"] as const;

export type InferenceProvider = (typeof INFERENCE_PROVIDERS)[number];

export type InferenceProviderOrPolicy = (typeof PROVIDERS_OR_POLICIES)[number];

export interface BaseArgs {
	/**
	 * The access token to use. Without it, you'll get rate-limited quickly.
	 *
	 * Can be created for free in hf.co/settings/token
	 *
	 * You can also pass an external Inference provider's key if you intend to call a compatible provider like Sambanova, Together, Replicate...
	 */
	accessToken?: string;

	/**
	 * The HF model to use.
	 *
	 * If not specified, will call huggingface.co/api/tasks to get the default model for the task.
	 *
	 * /!\ Legacy behavior allows this to be an URL, but this is deprecated and will be removed in the future.
	 * Use the `endpointUrl` parameter instead.
	 */
	model?: ModelId;

	/**
	 * The URL of the endpoint to use.
	 *
	 * If not specified, will call the default router.huggingface.co Inference Providers endpoint.
	 */
	endpointUrl?: string;

	/**
	 * Set an Inference provider to run this model on.
	 *
	 * Defaults to "auto" i.e. the first of the providers available for the model, sorted by the user's order in https://hf.co/settings/inference-providers.
	 */
	provider?: InferenceProviderOrPolicy;
}

export type RequestArgs = BaseArgs &
	(
		| { data: Blob | ArrayBuffer }
		| { inputs: unknown }
		| { prompt: string }
		| { text: string }
		| { audio_url: string }
		| ChatCompletionInput
	) & {
		parameters?: Record<string, unknown>;
	};

export type AuthMethod = "none" | "hf-token" | "credentials-include" | "provider-key";

export interface HeaderParams {
	accessToken?: string;
	authMethod: AuthMethod;
}

export interface UrlParams {
	authMethod: AuthMethod;
	model: string;
	task?: InferenceTask;
}

export interface BodyParams<T extends Record<string, unknown> = Record<string, unknown>> {
	args: T;
	model: string;
	mapping?: InferenceProviderMappingEntry | undefined;
	task?: InferenceTask;
}
