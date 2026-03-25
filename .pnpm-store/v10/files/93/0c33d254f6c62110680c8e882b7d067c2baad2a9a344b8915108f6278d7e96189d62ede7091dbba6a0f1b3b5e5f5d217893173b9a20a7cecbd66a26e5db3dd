import { GAuthClient } from "./auth.js";
import { BaseGoogleEmbeddings } from "@langchain/google-common";

//#region src/embeddings.ts
/**
* Integration with an Google embeddings model.
*/
var GoogleEmbeddings = class extends BaseGoogleEmbeddings {
	static lc_name() {
		return "GoogleEmbeddings";
	}
	lc_serializable = true;
	constructor(fields) {
		super(fields);
	}
	buildAbstractedClient(fields) {
		return new GAuthClient(fields);
	}
};

//#endregion
export { GoogleEmbeddings };
//# sourceMappingURL=embeddings.js.map