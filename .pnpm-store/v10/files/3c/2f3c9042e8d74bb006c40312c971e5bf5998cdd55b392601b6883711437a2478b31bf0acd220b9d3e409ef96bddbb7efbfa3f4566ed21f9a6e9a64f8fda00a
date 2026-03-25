import { ChatAnthropicTranslator } from "./anthropic.js";
import { ChatOpenAITranslator } from "./openai.js";
import { ChatBedrockConverseTranslator } from "./bedrock_converse.js";
import { ChatDeepSeekTranslator } from "./deepseek.js";
import { ChatGoogleGenAITranslator } from "./google_genai.js";
import { ChatVertexTranslator } from "./google_vertexai.js";
import { ChatGroqTranslator } from "./groq.js";
import { ChatOllamaTranslator } from "./ollama.js";
import { ChatXAITranslator } from "./xai.js";
import { ChatGoogleTranslator } from "./google.js";
//#region src/messages/block_translators/index.ts
globalThis.lc_block_translators_registry ??= new Map([
	["anthropic", ChatAnthropicTranslator],
	["bedrock-converse", ChatBedrockConverseTranslator],
	["deepseek", ChatDeepSeekTranslator],
	["google", ChatGoogleTranslator],
	["google-genai", ChatGoogleGenAITranslator],
	["google-vertexai", ChatVertexTranslator],
	["groq", ChatGroqTranslator],
	["ollama", ChatOllamaTranslator],
	["openai", ChatOpenAITranslator],
	["xai", ChatXAITranslator]
]);
function getTranslator(modelProvider) {
	return globalThis.lc_block_translators_registry.get(modelProvider);
}
//#endregion
export { getTranslator };

//# sourceMappingURL=index.js.map