import { Pinecone } from "@pinecone-database/pinecone";
import { getEnvironmentVariable } from "@langchain/core/utils/env";

//#region src/client.ts
function getPineconeClient(config) {
	if (getEnvironmentVariable("PINECONE_API_KEY") === void 0 || getEnvironmentVariable("PINECONE_API_KEY") === "") throw new Error("PINECONE_API_KEY must be set in environment");
	if (!config) return new Pinecone();
	else return new Pinecone(config);
}

//#endregion
export { getPineconeClient };
//# sourceMappingURL=client.js.map