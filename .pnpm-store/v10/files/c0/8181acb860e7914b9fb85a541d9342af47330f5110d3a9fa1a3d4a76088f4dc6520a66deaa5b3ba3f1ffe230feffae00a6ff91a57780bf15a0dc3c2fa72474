import { Embeddings } from "../embeddings.js";
import { Example } from "../prompts/base.js";
import { BaseExampleSelector } from "./base.js";
import { VectorStore, VectorStoreInterface, VectorStoreRetrieverInterface } from "../vectorstores.js";

//#region src/example_selectors/semantic_similarity.d.ts
/**
 * Interface for the input data of the SemanticSimilarityExampleSelector
 * class.
 */
type SemanticSimilarityExampleSelectorInput<V extends VectorStoreInterface = VectorStoreInterface> = {
  vectorStore: V;
  k?: number;
  filter?: V["FilterType"];
  exampleKeys?: string[];
  inputKeys?: string[];
  vectorStoreRetriever?: never;
} | {
  vectorStoreRetriever: VectorStoreRetrieverInterface<V>;
  exampleKeys?: string[];
  inputKeys?: string[];
  vectorStore?: never;
  k?: never;
  filter?: never;
};
/**
 * Class that selects examples based on semantic similarity. It extends
 * the BaseExampleSelector class.
 * @example
 * ```typescript
 * const exampleSelector = await SemanticSimilarityExampleSelector.fromExamples(
 *   [
 *     { input: "happy", output: "sad" },
 *     { input: "tall", output: "short" },
 *     { input: "energetic", output: "lethargic" },
 *     { input: "sunny", output: "gloomy" },
 *     { input: "windy", output: "calm" },
 *   ],
 *   new OpenAIEmbeddings(),
 *   HNSWLib,
 *   { k: 1 },
 * );
 * const dynamicPrompt = new FewShotPromptTemplate({
 *   exampleSelector,
 *   examplePrompt: PromptTemplate.fromTemplate(
 *     "Input: {input}\nOutput: {output}",
 *   ),
 *   prefix: "Give the antonym of every input",
 *   suffix: "Input: {adjective}\nOutput:",
 *   inputVariables: ["adjective"],
 * });
 * console.log(await dynamicPrompt.format({ adjective: "rainy" }));
 * ```
 */
declare class SemanticSimilarityExampleSelector<V extends VectorStoreInterface = VectorStoreInterface> extends BaseExampleSelector {
  vectorStoreRetriever: VectorStoreRetrieverInterface<V>;
  exampleKeys?: string[];
  inputKeys?: string[];
  constructor(data: SemanticSimilarityExampleSelectorInput<V>);
  /**
   * Method that adds a new example to the vectorStore. The example is
   * converted to a string and added to the vectorStore as a document.
   * @param example The example to be added to the vectorStore.
   * @returns Promise that resolves when the example has been added to the vectorStore.
   */
  addExample(example: Example): Promise<void>;
  /**
   * Method that selects which examples to use based on semantic similarity.
   * It performs a similarity search in the vectorStore using the input
   * variables and returns the examples with the highest similarity.
   * @param inputVariables The input variables used for the similarity search.
   * @returns Promise that resolves with an array of the selected examples.
   */
  selectExamples<T>(inputVariables: Record<string, T>): Promise<Example[]>;
  /**
   * Static method that creates a new instance of
   * SemanticSimilarityExampleSelector. It takes a list of examples, an
   * instance of Embeddings, a VectorStore class, and an options object as
   * parameters. It converts the examples to strings, creates a VectorStore
   * from the strings and the embeddings, and returns a new
   * SemanticSimilarityExampleSelector with the created VectorStore and the
   * options provided.
   * @param examples The list of examples to be used.
   * @param embeddings The instance of Embeddings to be used.
   * @param vectorStoreCls The VectorStore class to be used.
   * @param options The options object for the SemanticSimilarityExampleSelector.
   * @returns Promise that resolves with a new instance of SemanticSimilarityExampleSelector.
   */
  static fromExamples<C extends typeof VectorStore>(examples: Record<string, string>[], embeddings: Embeddings, vectorStoreCls: C, options?: {
    k?: number;
    inputKeys?: string[];
  } & Parameters<C["fromTexts"]>[3]): Promise<SemanticSimilarityExampleSelector>;
}
//#endregion
export { SemanticSimilarityExampleSelector, SemanticSimilarityExampleSelectorInput };
//# sourceMappingURL=semantic_similarity.d.ts.map