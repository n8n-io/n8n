const require_auth = require('./auth.cjs');
let _langchain_google_common = require("@langchain/google-common");

//#region src/llms.ts
/**
* Integration with a Google LLM.
*/
var GoogleLLM = class extends _langchain_google_common.GoogleBaseLLM {
	static lc_name() {
		return "GoogleLLM";
	}
	lc_serializable = true;
	constructor(fields) {
		super(fields);
		this._addVersion("@langchain/google-gauth", "2.1.24");
	}
	buildAbstractedClient(fields) {
		return new require_auth.GAuthClient(fields);
	}
};

//#endregion
exports.GoogleLLM = GoogleLLM;
//# sourceMappingURL=llms.cjs.map