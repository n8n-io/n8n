import type { TokenCredential, TracingContext } from "@azure/core-auth";
/**
 * The options to configure the token provider.
 */
export interface GetBearerTokenProviderOptions {
    /** The abort signal to abort requests to get tokens */
    abortSignal?: AbortSignal;
    /** The tracing options for the requests to get tokens */
    tracingOptions?: {
        /**
         * Tracing Context for the current request to get a token.
         */
        tracingContext?: TracingContext;
    };
}
/**
 * Returns a callback that provides a bearer token.
 * For example, the bearer token can be used to authenticate a request as follows:
 * ```ts snippet:token_provider_example
 * import { DefaultAzureCredential, getBearerTokenProvider } from "@azure/identity";
 * import { createPipelineRequest } from "@azure/core-rest-pipeline";
 *
 * const credential = new DefaultAzureCredential();
 * const scope = "https://cognitiveservices.azure.com/.default";
 * const getAccessToken = getBearerTokenProvider(credential, scope);
 * const token = await getAccessToken();
 *
 * // usage
 * const request = createPipelineRequest({ url: "https://example.com" });
 * request.headers.set("Authorization", `Bearer ${token}`);
 * ```
 *
 * @param credential - The credential used to authenticate the request.
 * @param scopes - The scopes required for the bearer token.
 * @param options - Options to configure the token provider.
 * @returns a callback that provides a bearer token.
 */
export declare function getBearerTokenProvider(credential: TokenCredential, scopes: string | string[], options?: GetBearerTokenProviderOptions): () => Promise<string>;
//# sourceMappingURL=tokenProvider.d.ts.map