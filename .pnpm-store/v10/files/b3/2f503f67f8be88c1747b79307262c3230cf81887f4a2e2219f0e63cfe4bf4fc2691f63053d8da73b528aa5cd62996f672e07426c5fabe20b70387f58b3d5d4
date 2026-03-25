import { Document } from "@langchain/core/documents";
import { BaseRetriever, BaseRetrieverInput } from "@langchain/core/retrievers";

//#region src/retrievers/bm25.d.ts
type BM25RetrieverOptions = {
  docs: Document[];
  k: number;
  includeScore?: boolean;
} & BaseRetrieverInput;
/**
 * A retriever that uses the BM25 algorithm to rank documents based on their
 * similarity to a query. It uses the "okapibm25" package for BM25 scoring.
 * The k parameter determines the number of documents to return for each query.
 */
declare class BM25Retriever extends BaseRetriever {
  includeScore: boolean;
  static lc_name(): string;
  lc_namespace: string[];
  static fromDocuments(documents: Document[], options: Omit<BM25RetrieverOptions, "docs">): BM25Retriever;
  docs: Document[];
  k: number;
  constructor(options: BM25RetrieverOptions);
  private preprocessFunc;
  _getRelevantDocuments(query: string): Promise<(Document<Record<string, any>> | Document<{
    bm25Score: number;
  }>)[]>;
}
//#endregion
export { BM25Retriever, BM25RetrieverOptions };
//# sourceMappingURL=bm25.d.cts.map