const require_document = require("../../documents/document.cjs");
const require_retrievers_index = require("../../retrievers/index.cjs");
//#region src/utils/testing/retrievers.ts
var FakeRetriever = class extends require_retrievers_index.BaseRetriever {
	lc_namespace = ["test", "fake"];
	output = [new require_document.Document({ pageContent: "foo" }), new require_document.Document({ pageContent: "bar" })];
	constructor(fields) {
		super();
		this.output = fields?.output ?? this.output;
	}
	async _getRelevantDocuments(_query) {
		return this.output;
	}
};
//#endregion
exports.FakeRetriever = FakeRetriever;

//# sourceMappingURL=retrievers.cjs.map