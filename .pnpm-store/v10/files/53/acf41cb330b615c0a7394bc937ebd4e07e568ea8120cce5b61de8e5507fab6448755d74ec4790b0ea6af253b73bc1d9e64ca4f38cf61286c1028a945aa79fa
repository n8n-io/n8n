import { Document } from "../../documents/document.js";
import { BaseRetriever } from "../../retrievers/index.js";
//#region src/utils/testing/retrievers.ts
var FakeRetriever = class extends BaseRetriever {
	lc_namespace = ["test", "fake"];
	output = [new Document({ pageContent: "foo" }), new Document({ pageContent: "bar" })];
	constructor(fields) {
		super();
		this.output = fields?.output ?? this.output;
	}
	async _getRelevantDocuments(_query) {
		return this.output;
	}
};
//#endregion
export { FakeRetriever };

//# sourceMappingURL=retrievers.js.map