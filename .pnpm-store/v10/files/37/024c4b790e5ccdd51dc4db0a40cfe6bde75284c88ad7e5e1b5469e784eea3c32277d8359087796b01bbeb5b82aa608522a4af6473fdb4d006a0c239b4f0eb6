const require_anthropic = require("./anthropic.cjs");
const require_openai = require("./openai.cjs");
const require_bedrock_converse = require("./bedrock_converse.cjs");
const require_deepseek = require("./deepseek.cjs");
const require_google_genai = require("./google_genai.cjs");
const require_google_vertexai = require("./google_vertexai.cjs");
const require_groq = require("./groq.cjs");
const require_ollama = require("./ollama.cjs");
const require_xai = require("./xai.cjs");
const require_google = require("./google.cjs");
//#region src/messages/block_translators/index.ts
globalThis.lc_block_translators_registry ??= new Map([
	["anthropic", require_anthropic.ChatAnthropicTranslator],
	["bedrock-converse", require_bedrock_converse.ChatBedrockConverseTranslator],
	["deepseek", require_deepseek.ChatDeepSeekTranslator],
	["google", require_google.ChatGoogleTranslator],
	["google-genai", require_google_genai.ChatGoogleGenAITranslator],
	["google-vertexai", require_google_vertexai.ChatVertexTranslator],
	["groq", require_groq.ChatGroqTranslator],
	["ollama", require_ollama.ChatOllamaTranslator],
	["openai", require_openai.ChatOpenAITranslator],
	["xai", require_xai.ChatXAITranslator]
]);
function getTranslator(modelProvider) {
	return globalThis.lc_block_translators_registry.get(modelProvider);
}
//#endregion
exports.getTranslator = getTranslator;

//# sourceMappingURL=index.cjs.map