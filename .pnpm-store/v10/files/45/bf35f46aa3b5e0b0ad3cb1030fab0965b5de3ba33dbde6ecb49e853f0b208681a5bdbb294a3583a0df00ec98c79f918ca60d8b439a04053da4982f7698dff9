import { BaseLLMParams, LLM } from "@langchain/core/language_models/llms";
import { GenerationChunk } from "@langchain/core/outputs";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import ReplicateInstance from "replicate";

//#region src/llms/replicate.d.ts

/**
 * Interface defining the structure of the input data for the Replicate
 * class. It includes details about the model to be used, any additional
 * input parameters, and the API key for the Replicate service.
 */
interface ReplicateInput {
  model: `${string}/${string}:${string}`;
  input?: {
    [key: string]: string | number | boolean;
  };
  apiKey?: string;
  /** The key used to pass prompts to the model. */
  promptKey?: string;
}
/**
 * Class responsible for managing the interaction with the Replicate API.
 * It handles the API key and model details, makes the actual API calls,
 * and converts the API response into a format usable by the rest of the
 * LangChain framework.
 * @example
 * ```typescript
 * const model = new Replicate({
 *   model: "replicate/flan-t5-xl:3ae0799123a1fe11f8c89fd99632f843fc5f7a761630160521c4253149754523",
 * });
 *
 * const res = await model.invoke(
 *   "Question: What would be a good company name for a company that makes colorful socks?\nAnswer:"
 * );
 * console.log({ res });
 * ```
 */
declare class Replicate extends LLM implements ReplicateInput {
  static lc_name(): string;
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  lc_serializable: boolean;
  model: ReplicateInput["model"];
  input: ReplicateInput["input"];
  apiKey: string;
  promptKey?: string;
  constructor(fields: ReplicateInput & BaseLLMParams);
  _llmType(): string;
  /** @ignore */
  _call(prompt: string, options: this["ParsedCallOptions"]): Promise<string>;
  _streamResponseChunks(prompt: string, options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<GenerationChunk>;
  /** @ignore */
  static imports(): Promise<{
    Replicate: typeof ReplicateInstance;
  }>;
  private _prepareReplicate;
  private _getReplicateInput;
}
//#endregion
export { Replicate, ReplicateInput };
//# sourceMappingURL=replicate.d.cts.map