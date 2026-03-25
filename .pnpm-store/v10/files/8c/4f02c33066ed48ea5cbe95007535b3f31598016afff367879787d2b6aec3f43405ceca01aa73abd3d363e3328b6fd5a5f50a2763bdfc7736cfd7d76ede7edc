const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const __pinecone_database_pinecone = require_rolldown_runtime.__toESM(require("@pinecone-database/pinecone"));
const __langchain_core_utils_env = require_rolldown_runtime.__toESM(require("@langchain/core/utils/env"));

//#region src/client.ts
function getPineconeClient(config) {
	if ((0, __langchain_core_utils_env.getEnvironmentVariable)("PINECONE_API_KEY") === void 0 || (0, __langchain_core_utils_env.getEnvironmentVariable)("PINECONE_API_KEY") === "") throw new Error("PINECONE_API_KEY must be set in environment");
	if (!config) return new __pinecone_database_pinecone.Pinecone();
	else return new __pinecone_database_pinecone.Pinecone(config);
}

//#endregion
exports.getPineconeClient = getPineconeClient;
//# sourceMappingURL=client.cjs.map