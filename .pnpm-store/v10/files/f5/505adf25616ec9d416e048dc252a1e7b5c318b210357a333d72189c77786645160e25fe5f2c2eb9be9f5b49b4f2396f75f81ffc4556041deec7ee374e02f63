const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_vectorstores_vectara = require('../vectorstores/vectara.cjs');
const __langchain_core_documents = require_rolldown_runtime.__toESM(require("@langchain/core/documents"));
const __langchain_core_retrievers = require_rolldown_runtime.__toESM(require("@langchain/core/retrievers"));

//#region src/retrievers/vectara_summary.ts
var vectara_summary_exports = {};
require_rolldown_runtime.__export(vectara_summary_exports, { VectaraSummaryRetriever: () => VectaraSummaryRetriever });
var VectaraSummaryRetriever = class extends __langchain_core_retrievers.BaseRetriever {
	static lc_name() {
		return "VectaraSummaryRetriever";
	}
	lc_namespace = ["langchain", "retrievers"];
	filter = require_vectorstores_vectara.DEFAULT_FILTER;
	vectara;
	topK;
	summaryConfig;
	constructor(fields) {
		super(fields);
		this.vectara = fields.vectara;
		this.topK = fields.topK ?? 10;
		this.filter = fields.filter ?? require_vectorstores_vectara.DEFAULT_FILTER;
		this.summaryConfig = fields.summaryConfig ?? {
			enabled: false,
			maxSummarizedResults: 0,
			responseLang: "eng"
		};
	}
	async _getRelevantDocuments(query, _callbacks) {
		const summaryResult = await this.vectara.vectaraQuery(query, this.topK, this.filter, this.summaryConfig ? this.summaryConfig : void 0);
		const docs = summaryResult.documents;
		if (this.summaryConfig.enabled) docs.push(new __langchain_core_documents.Document({
			pageContent: summaryResult.summary,
			metadata: { summary: true }
		}));
		return docs;
	}
};

//#endregion
exports.VectaraSummaryRetriever = VectaraSummaryRetriever;
Object.defineProperty(exports, 'vectara_summary_exports', {
  enumerable: true,
  get: function () {
    return vectara_summary_exports;
  }
});
//# sourceMappingURL=vectara_summary.cjs.map