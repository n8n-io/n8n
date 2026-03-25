import { Document, DocumentInterface } from "@langchain/core/documents";
import { CallbackManagerForRetrieverRun } from "@langchain/core/callbacks/manager";
import { BaseRetriever, BaseRetrieverInput } from "@langchain/core/retrievers";

//#region src/retrievers/ensemble.d.ts
interface EnsembleRetrieverInput extends BaseRetrieverInput {
  /** A list of retrievers to ensemble. */
  retrievers: BaseRetriever[];
  /**
   * A list of weights corresponding to the retrievers. Defaults to equal
   * weighting for all retrievers.
   */
  weights?: number[];
  /**
   * A constant added to the rank, controlling the balance between the importance
   * of high-ranked items and the consideration given to lower-ranked items.
   * Default is 60.
   */
  c?: number;
}
/**
 * Ensemble retriever that aggregates and orders the results of
 * multiple retrievers by using weighted Reciprocal Rank Fusion.
 */
declare class EnsembleRetriever extends BaseRetriever {
  static lc_name(): string;
  lc_namespace: string[];
  retrievers: BaseRetriever[];
  weights: number[];
  c: number;
  constructor(args: EnsembleRetrieverInput);
  _getRelevantDocuments(query: string, runManager?: CallbackManagerForRetrieverRun): Promise<Document<Record<string, any>>[]>;
  _rankFusion(query: string, runManager?: CallbackManagerForRetrieverRun): Promise<Document<Record<string, any>>[]>;
  _weightedReciprocalRank(docList: DocumentInterface[][]): Promise<Document<Record<string, any>>[]>;
  private _uniqueUnion;
}
//#endregion
export { EnsembleRetriever, EnsembleRetrieverInput };
//# sourceMappingURL=ensemble.d.ts.map