import { GoogleEmbeddings } from "@langchain/google-gauth";

//#region src/embeddings.ts
/**
* Integration with a Google Vertex AI embeddings model using
* the "@langchain/google-gauth" package for auth.
*/
var VertexAIEmbeddings = class extends GoogleEmbeddings {
	static lc_name() {
		return "VertexAIEmbeddings";
	}
	constructor(fields) {
		super({
			...fields,
			platformType: "gcp"
		});
	}
};

//#endregion
export { VertexAIEmbeddings };
//# sourceMappingURL=embeddings.js.map