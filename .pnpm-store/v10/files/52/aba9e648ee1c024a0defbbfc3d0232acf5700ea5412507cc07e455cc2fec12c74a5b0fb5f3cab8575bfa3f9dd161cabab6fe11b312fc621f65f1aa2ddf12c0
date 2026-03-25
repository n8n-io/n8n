import { GAuthClient } from "./auth.js";
import { GoogleBaseLLM } from "@langchain/google-common";

//#region src/llms.ts
/**
* Integration with a Google LLM.
*/
var GoogleLLM = class extends GoogleBaseLLM {
	static lc_name() {
		return "GoogleLLM";
	}
	lc_serializable = true;
	constructor(fields) {
		super(fields);
		this._addVersion("@langchain/google-gauth", "2.1.24");
	}
	buildAbstractedClient(fields) {
		return new GAuthClient(fields);
	}
};

//#endregion
export { GoogleLLM };
//# sourceMappingURL=llms.js.map