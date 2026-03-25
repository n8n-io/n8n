import { Document } from "@langchain/core/documents";
import { VectorStore, VectorStoreRetriever, VectorStoreRetrieverInput } from "@langchain/core/vectorstores";

//#region src/retrievers/score_threshold.d.ts
type ScoreThresholdRetrieverInput<V extends VectorStore> = Omit<VectorStoreRetrieverInput<V>, "k"> & {
  maxK?: number;
  kIncrement?: number;
  minSimilarityScore: number;
};
declare class ScoreThresholdRetriever<V extends VectorStore> extends VectorStoreRetriever<V> {
  minSimilarityScore: number;
  kIncrement: number;
  maxK: number;
  constructor(input: ScoreThresholdRetrieverInput<V>);
  invoke(query: string): Promise<Document[]>;
  static fromVectorStore<V extends VectorStore>(vectorStore: V, options: Omit<ScoreThresholdRetrieverInput<V>, "vectorStore">): ScoreThresholdRetriever<V>;
}
//#endregion
export { ScoreThresholdRetriever, ScoreThresholdRetrieverInput };
//# sourceMappingURL=score_threshold.d.ts.map