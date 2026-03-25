const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_base = require('./remote/base.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));

//#region src/retrievers/vespa.ts
var vespa_exports = {};
require_rolldown_runtime.__export(vespa_exports, { VespaRetriever: () => VespaRetriever });
/**
* Class responsible for retrieving data from Vespa. It extends the
* `RemoteRetriever` class and includes methods for creating the JSON body
* for a query and processing the JSON response from Vespa.
* @example
* ```typescript
* const retriever = new VespaRetriever({
*   url: "https:
*   auth: false,
*   query_body: {
*     yql: "select content from paragraph where userQuery()",
*     hits: 5,
*     ranking: "documentation",
*     locale: "en-us",
*   },
*   content_field: "content",
* });
* const result = await retriever.getRelevantDocuments("what is vespa?");
* ```
*/
var VespaRetriever = class extends require_base.RemoteRetriever {
	static lc_name() {
		return "VespaRetriever";
	}
	lc_namespace = [
		"langchain",
		"retrievers",
		"vespa"
	];
	query_body;
	content_field;
	constructor(fields) {
		super(fields);
		this.query_body = fields.query_body;
		this.content_field = fields.content_field;
		this.url = `${this.url}/search/?`;
	}
	/**
	* Method that takes a query string as input and returns a JSON object
	* that includes the query and the original `query_body`.
	* @param query The query string to be sent to Vespa.
	* @returns A JSON object that includes the query and the original `query_body`.
	*/
	createJsonBody(query) {
		return {
			...this.query_body,
			query
		};
	}
	/**
	* Method that processes the JSON response from Vespa into an array of
	* `Document` instances. Each `Document` instance includes the content
	* from the specified `content_field` and the document's ID.
	* @param json The JSON response from Vespa.
	* @returns An array of `Document` instances.
	*/
	processJsonResponse(json) {
		return json.root.children.map((doc) => new __langchain_core_documents.Document({
			pageContent: doc.fields[this.content_field],
			metadata: { id: doc.id }
		}));
	}
};

//#endregion
exports.VespaRetriever = VespaRetriever;
Object.defineProperty(exports, 'vespa_exports', {
  enumerable: true,
  get: function () {
    return vespa_exports;
  }
});
//# sourceMappingURL=vespa.cjs.map