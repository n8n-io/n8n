const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const cohere_ai = require_rolldown_runtime.__toESM(require("cohere-ai"));
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));

//#region src/client.ts
function getCohereClient(fields) {
	if (fields?.client) return fields.client;
	const apiKey = fields?.apiKey ?? (0, __langchain_core_utils_env.getEnvironmentVariable)("COHERE_API_KEY");
	if (!apiKey) throw new Error("COHERE_API_KEY must be set");
	return new cohere_ai.CohereClient({ token: apiKey });
}

//#endregion
exports.getCohereClient = getCohereClient;
//# sourceMappingURL=client.cjs.map