import { basePush } from "./base.js";
import { Runnable } from "@langchain/core/runnables";

//#region src/hub/node.d.ts

/**
 * Infer modelProvider from the id namespace to avoid className collisions.
 * For non-langchain packages, extracts the provider name from the namespace.
 * e.g., ["langchain", "chat_models", "vertexai", "ChatVertexAI"] -> "google-vertexai"
 * e.g., ["langchain_deepseek", "chat_models", "ChatDeepSeek"] -> "deepseek"
 * @param idArray The full id array from the manifest
 * @returns The inferred modelProvider key or undefined
 */
declare function inferModelProviderFromNamespace(idArray: string[]): string | undefined;
/**
 * Pull a prompt from the hub.
 * @param ownerRepoCommit The name of the repo containing the prompt, as well as an optional commit hash separated by a slash.
 * @param options.apiKey LangSmith API key to use when pulling the prompt
 * @param options.apiUrl LangSmith API URL to use when pulling the prompt
 * @param options.includeModel Whether to also instantiate and attach a model instance to the prompt,
 *   if the prompt has associated model metadata. If set to true, invoking the resulting pulled prompt will
 *   also invoke the instantiated model. You must have the appropriate LangChain integration package installed.
 * @param options.secrets A map of secrets to use when loading, e.g.
 *   {'OPENAI_API_KEY': 'sk-...'}`.
 *   If a secret is not found in the map, it will be loaded from the
 *   environment if `secrets_from_env` is `True`. Should only be needed when
 *   `includeModel` is `true`.
 * @param options.secretsFromEnv Whether to load secrets from environment variables.
 *   Use with caution and only with trusted prompts.
 * @returns
 */
declare function pull<T extends Runnable>(ownerRepoCommit: string, options?: {
  apiKey?: string;
  apiUrl?: string;
  includeModel?: boolean;
  secrets?: Record<string, string>;
  secretsFromEnv?: boolean;
}): Promise<T>;
//#endregion
export { inferModelProviderFromNamespace, pull, basePush as push };
//# sourceMappingURL=node.d.ts.map