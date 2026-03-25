import { GAuthClient } from "./auth.js";
import { ChatGoogleBase } from "@langchain/google-common";

//#region src/chat_models.ts
/**
* Integration with a Google chat model.
*/
var ChatGoogle = class extends ChatGoogleBase {
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
		return new GAuthClient(fields);
	}
};

//#endregion
export { ChatGoogle };
//# sourceMappingURL=chat_models.js.map