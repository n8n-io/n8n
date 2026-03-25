const require_auth = require('./auth.cjs');
let _langchain_google_common = require("@langchain/google-common");

//#region src/embeddings.ts
/**
* Integration with an Google embeddings model.
*/
var GoogleEmbeddings = class extends _langchain_google_common.BaseGoogleEmbeddings {
	static lc_name() {
		return "GoogleEmbeddings";
	}
	lc_serializable = true;
	constructor(fields) {
		super(fields);
	}
	buildAbstractedClient(fields) {
		return new require_auth.GAuthClient(fields);
	}
};

//#endregion
exports.GoogleEmbeddings = GoogleEmbeddings;
//# sourceMappingURL=embeddings.cjs.map