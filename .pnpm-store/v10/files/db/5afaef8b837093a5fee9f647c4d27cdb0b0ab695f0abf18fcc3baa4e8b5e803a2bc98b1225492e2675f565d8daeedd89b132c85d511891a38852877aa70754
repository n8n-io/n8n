import { Document } from "@langchain/core/documents";
import { BaseRetriever, BaseRetrieverInput } from "@langchain/core/retrievers";

//#region src/retrievers/arxiv.d.ts
type ArxivRetrieverOptions = {
  getFullDocuments?: boolean;
  maxSearchResults?: number;
} & BaseRetrieverInput;
/**
 * A retriever that searches arXiv for relevant articles based on a query.
 * It can retrieve either full documents (PDFs) or just summaries.
 */
declare class ArxivRetriever extends BaseRetriever {
  static lc_name(): string;
  lc_namespace: string[];
  getFullDocuments: boolean;
  maxSearchResults: number;
  constructor(options?: ArxivRetrieverOptions);
  _getRelevantDocuments(query: string): Promise<Document[]>;
}
//#endregion
export { ArxivRetriever, ArxivRetrieverOptions };
//# sourceMappingURL=arxiv.d.ts.map