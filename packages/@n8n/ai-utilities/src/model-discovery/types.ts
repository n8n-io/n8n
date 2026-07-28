export const MODEL_EFFORT_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
export type ModelEffort = (typeof MODEL_EFFORT_LEVELS)[number];
export type ModelEffortCapabilities = Record<ModelEffort, boolean>;

/** A chat model as reported by the provider's own model-list API. */
export interface ProviderModel {
	/** Provider-native model id, exactly as the provider's API expects it. */
	id: string;
	/** Human-readable name when the provider supplies one, otherwise the id. */
	name: string;
	/** Provider-reported capabilities normalized for consumers that need model-specific behavior. */
	capabilities?: {
		effort?: ModelEffortCapabilities;
		thinking?: {
			adaptive: boolean;
			enabled: boolean;
		};
	};
}

export interface ListModelsOptions {
	apiKey: string;
	/** Override the provider's default API base URL (e.g. a proxy or self-hosted gateway). */
	baseURL?: string;
	/**
	 * Transport to use for the request. Callers supply their environment's
	 * proxy-aware fetch; defaults to the global fetch.
	 */
	fetch?: typeof globalThis.fetch;
	/** Extra headers merged into the request (e.g. custom credential headers). */
	headers?: Record<string, string>;
}

export type ListModelsFn = (options: ListModelsOptions) => Promise<ProviderModel[]>;
