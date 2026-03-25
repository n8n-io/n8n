import { __export } from "../_virtual/rolldown_runtime.js";
import { DEFAULT_FILTER } from "../vectorstores/vectara.js";
import { Document } from "@langchain/core/documents";
import { BaseRetriever } from "@langchain/core/retrievers";

//#region src/retrievers/vectara_summary.ts
var vectara_summary_exports = {};
__export(vectara_summary_exports, { VectaraSummaryRetriever: () => VectaraSummaryRetriever });
var VectaraSummaryRetriever = class extends BaseRetriever {
	static lc_name() {
		return "VectaraSummaryRetriever";
	}
	lc_namespace = ["langchain", "retrievers"];
	filter = DEFAULT_FILTER;
	vectara;
	topK;
	summaryConfig;
	constructor(fields) {
		super(fields);
		this.vectara = fields.vectara;
		this.topK = fields.topK ?? 10;
		this.filter = fields.filter ?? DEFAULT_FILTER;
		this.summaryConfig = fields.summaryConfig ?? {
			enabled: false,
			maxSummarizedResults: 0,
			responseLang: "eng"
		};
	}
	async _getRelevantDocuments(query, _callbacks) {
		const summaryResult = await this.vectara.vectaraQuery(query, this.topK, this.filter, this.summaryConfig ? this.summaryConfig : void 0);
		const docs = summaryResult.documents;
		if (this.summaryConfig.enabled) docs.push(new Document({
			pageContent: summaryResult.summary,
			metadata: { summary: true }
		}));
		return docs;
	}
};

//#endregion
export { VectaraSummaryRetriever, vectara_summary_exports };
//# sourceMappingURL=vectara_summary.js.map