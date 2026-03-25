const require_auth = require('./auth.cjs');
let _langchain_google_common = require("@langchain/google-common");

//#region src/chat_models.ts
/**
* Integration with a Google chat model.
*/
var ChatGoogle = class extends _langchain_google_common.ChatGoogleBase {
	static lc_name() {
		return "ChatGoogle";
	}
	constructor(modelOrFields, paramsArg) {
		const fields = typeof modelOrFields === "string" ? {
			...paramsArg ?? {},
			model: modelOrFields
		} : modelOrFields ?? {};
		super(fields);
		this._addVersion("@langchain/google-gauth", "2.1.24");
	}
	buildAbstractedClient(fields) {
		return new require_auth.GAuthClient(fields);
	}
};

//#endregion
exports.ChatGoogle = ChatGoogle;
//# sourceMappingURL=chat_models.cjs.map