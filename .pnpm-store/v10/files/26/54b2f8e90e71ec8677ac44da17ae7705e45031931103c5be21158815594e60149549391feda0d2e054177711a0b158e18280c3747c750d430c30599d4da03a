import { getChatModelByClassName } from "../chat_models/universal.js";
import { load } from "../load/index.js";
import { basePull, basePush, bindOutputSchema, generateModelImportMap, generateOptionalImportMap } from "./base.js";

//#region src/hub/node.ts
function _idEquals(a, b) {
	if (!Array.isArray(a) || !Array.isArray(b)) return false;
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
	return true;
}
function isRunnableBinding(a) {
	const wellKnownIds = [[
		"langchain_core",
		"runnables",
		"RunnableBinding"
	], [
		"langchain",
		"schema",
		"runnable",
		"RunnableBinding"
	]];
	return wellKnownIds.some((id) => _idEquals(a, id));
}
/**
* Infer modelProvider from the id namespace to avoid className collisions.
* For non-langchain packages, extracts the provider name from the namespace.
* e.g., ["langchain", "chat_models", "vertexai", "ChatVertexAI"] -> "google-vertexai"
* e.g., ["langchain_deepseek", "chat_models", "ChatDeepSeek"] -> "deepseek"
* @param idArray The full id array from the manifest
* @returns The inferred modelProvider key or undefined
*/
function inferModelProviderFromNamespace(idArray) {
	if (!Array.isArray(idArray) || idArray.length < 2) return void 0;
	const namespace = idArray.slice(0, -1);
	for (const part of namespace) {
		if (part === "langchain" || part === "langchain_core" || part === "chat_models" || part === "runnables" || part === "schema") continue;
		if (part.startsWith("langchain_")) {
			const providerName = part.slice(10);
			return providerName.replace(/_/g, "-");
		}
		if (part.includes("vertexai_web")) return "google-vertexai-web";
		else if (part.includes("vertexai")) return "google-vertexai";
		else if (part.includes("genai") || part.includes("google_genai")) return "google-genai";
		if (!part.includes("langchain") && part !== "chat_models" && part !== "runnables") return part.replace(/_/g, "-");
	}
	return void 0;
}
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
async function pull(ownerRepoCommit, options) {
	const promptObject = await basePull(ownerRepoCommit, options);
	let modelClass;
	if (options?.includeModel) {
		const chatModelObject = isRunnableBinding(promptObject.manifest.kwargs?.last?.id) ? promptObject.manifest.kwargs?.last?.kwargs?.bound : promptObject.manifest.kwargs?.last;
		if (Array.isArray(chatModelObject?.id)) {
			const modelName = chatModelObject?.id.at(-1);
			if (modelName) {
				const modelProvider = inferModelProviderFromNamespace(chatModelObject.id);
				modelClass = await getChatModelByClassName(modelName, modelProvider);
				if (!modelClass) console.warn(`Received unknown model name from prompt hub: "${modelName}"`);
			}
		}
	}
	const loadedPrompt = await load(JSON.stringify(promptObject.manifest), options?.secrets, generateOptionalImportMap(modelClass), generateModelImportMap(modelClass), options?.secretsFromEnv);
	return bindOutputSchema(loadedPrompt);
}

//#endregion
export { inferModelProviderFromNamespace, pull, basePush as push };
//# sourceMappingURL=node.js.map