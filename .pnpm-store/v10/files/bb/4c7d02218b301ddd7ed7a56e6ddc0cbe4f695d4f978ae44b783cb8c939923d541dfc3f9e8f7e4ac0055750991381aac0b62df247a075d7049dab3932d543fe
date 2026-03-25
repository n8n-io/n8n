import { SerializedAnalyzeDocumentChain } from "./serde.cjs";
import { BaseChain, ChainInputs } from "./base.cjs";
import { ChainValues } from "@langchain/core/utils/types";
import { CallbackManagerForChainRun } from "@langchain/core/callbacks/manager";
import { TextSplitter } from "@langchain/textsplitters";

//#region src/chains/analyze_documents_chain.d.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LoadValues = Record<string, any>;
/**
 * Interface for the input parameters required by the AnalyzeDocumentChain
 * class.
 */
interface AnalyzeDocumentChainInput extends Omit<ChainInputs, "memory"> {
  combineDocumentsChain: BaseChain;
  textSplitter?: TextSplitter;
  inputKey?: string;
}
/**
 * Chain that combines documents by stuffing into context.
 * @augments BaseChain
 * @augments StuffDocumentsChainInput
 * @example
 * ```typescript
 * const model = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
 * const combineDocsChain = loadSummarizationChain(model);
 * const chain = new AnalyzeDocumentChain({
 *   combineDocumentsChain: combineDocsChain,
 * });
 *
 * // Read the text from a file (this is a placeholder for actual file reading)
 * const text = readTextFromFile("state_of_the_union.txt");
 *
 * // Invoke the chain to analyze the document
 * const res = await chain.call({
 *   input_document: text,
 * });
 *
 * console.log({ res });
 * ```
 */
declare class AnalyzeDocumentChain extends BaseChain implements AnalyzeDocumentChainInput {
  static lc_name(): string;
  inputKey: string;
  combineDocumentsChain: BaseChain;
  textSplitter: TextSplitter;
  constructor(fields: AnalyzeDocumentChainInput);
  get inputKeys(): string[];
  get outputKeys(): string[];
  /** @ignore */
  _call(values: ChainValues, runManager?: CallbackManagerForChainRun): Promise<ChainValues>;
  _chainType(): "analyze_document_chain";
  static deserialize(data: SerializedAnalyzeDocumentChain, values: LoadValues): Promise<AnalyzeDocumentChain>;
  serialize(): SerializedAnalyzeDocumentChain;
}
//#endregion
export { AnalyzeDocumentChain, AnalyzeDocumentChainInput };
//# sourceMappingURL=analyze_documents_chain.d.cts.map