import { CohereClient } from "cohere-ai";
import { getEnvironmentVariable } from "@langchain/core/utils/env";

//#region src/client.ts
function getCohereClient(fields) {
	if (fields?.client) return fields.client;
	const apiKey = fields?.apiKey ?? getEnvironmentVariable("COHERE_API_KEY");
	if (!apiKey) throw new Error("COHERE_API_KEY must be set");
	return new CohereClient({ token: apiKey });
}

//#endregion
export { getCohereClient };
//# sourceMappingURL=client.js.map