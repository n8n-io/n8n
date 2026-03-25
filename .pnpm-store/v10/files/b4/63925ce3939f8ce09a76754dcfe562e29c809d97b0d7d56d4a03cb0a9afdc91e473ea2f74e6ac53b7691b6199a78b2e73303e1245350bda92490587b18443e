let _langchain_google_gauth = require("@langchain/google-gauth");

//#region src/embeddings.ts
/**
* Integration with a Google Vertex AI embeddings model using
* the "@langchain/google-gauth" package for auth.
*/
var VertexAIEmbeddings = class extends _langchain_google_gauth.GoogleEmbeddings {
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
exports.VertexAIEmbeddings = VertexAIEmbeddings;
//# sourceMappingURL=embeddings.cjs.map