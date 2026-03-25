let _langchain_google_gauth = require("@langchain/google-gauth");

//#region src/llms.ts
/**
* Integration with a Google Vertex AI LLM using
* the "@langchain/google-gauth" package for auth.
*/
var VertexAI = class extends _langchain_google_gauth.GoogleLLM {
	lc_namespace = [
		"langchain",
		"llms",
		"vertexai"
	];
	static lc_name() {
		return "VertexAI";
	}
	constructor(fields) {
		super({
			...fields,
			platformType: "gcp"
		});
		this._addVersion("@langchain/google-vertexai", "2.1.24");
	}
};

//#endregion
exports.VertexAI = VertexAI;
//# sourceMappingURL=llms.cjs.map