import { BaseStore, IndexConfig, Operation, OperationResults } from "./base.js";

//#region src/store/memory.d.ts

/**
 * In-memory key-value store with optional vector search.
 *
 * A lightweight store implementation using JavaScript Maps. Supports basic
 * key-value operations and vector search when configured with embeddings.
 *
 * @example
 * ```typescript
 * // Basic key-value storage
 * const store = new InMemoryStore();
 * await store.put(["users", "123"], "prefs", { theme: "dark" });
 * const item = await store.get(["users", "123"], "prefs");
 *
 * // Vector search with embeddings
 * import { OpenAIEmbeddings } from "@langchain/openai";
 * const store = new InMemoryStore({
 *   index: {
 *     dims: 1536,
 *     embeddings: new OpenAIEmbeddings({ modelName: "text-embedding-3-small" }),
 *   }
 * });
 *
 * // Store documents
 * await store.put(["docs"], "doc1", { text: "Python tutorial" });
 * await store.put(["docs"], "doc2", { text: "TypeScript guide" });
 *
 * // Search by similarity
 * const results = await store.search(["docs"], { query: "python programming" });
 * ```
 *
 * **Warning**: This store keeps all data in memory. Data is lost when the process exits.
 * For persistence, use a database-backed store.
 */
declare class InMemoryStore extends BaseStore {
  private data;
  // Namespace -> Key -> Path/field -> Vector
  private vectors;
  private _indexConfig?;
  constructor(options?: {
    index?: IndexConfig;
  });
  batch<Op extends readonly Operation[]>(operations: Op): Promise<OperationResults<Op>>;
  private getOperation;
  private putOperation;
  private listNamespacesOperation;
  private doesMatch;
  private filterItems;
  private scoreResults;
  private paginateResults;
  private extractTexts;
  private insertVectors;
  private getVectors;
  private cosineSimilarity;
  get indexConfig(): IndexConfig | undefined;
}
/** @deprecated Alias for InMemoryStore */
declare class MemoryStore extends InMemoryStore {}
//#endregion
export { InMemoryStore, MemoryStore };
//# sourceMappingURL=memory.d.ts.map