import { VectaraFilter, VectaraStore, VectaraSummary } from "../vectorstores/vectara.cjs";
import { CallbackManagerForRetrieverRun } from "@langchain/core/callbacks/manager";
import { Document } from "@langchain/core/documents";
import { BaseRetriever, BaseRetrieverInput } from "@langchain/core/retrievers";

//#region src/retrievers/vectara_summary.d.ts
interface VectaraRetrieverInput extends BaseRetrieverInput {
  vectara: VectaraStore;
  filter?: VectaraFilter;
  topK?: number;
  summaryConfig?: VectaraSummary;
}
declare class VectaraSummaryRetriever extends BaseRetriever {
  static lc_name(): string;
  lc_namespace: string[];
  private filter;
  private vectara;
  private topK;
  private summaryConfig;
  constructor(fields: VectaraRetrieverInput);
  _getRelevantDocuments(query: string, _callbacks?: CallbackManagerForRetrieverRun): Promise<Document[]>;
}
//#endregion
export { VectaraRetrieverInput, VectaraSummaryRetriever };
//# sourceMappingURL=vectara_summary.d.cts.map