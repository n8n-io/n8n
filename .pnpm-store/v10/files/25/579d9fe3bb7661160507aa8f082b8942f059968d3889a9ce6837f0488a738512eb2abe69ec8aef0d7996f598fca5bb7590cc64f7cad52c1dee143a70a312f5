import { BaseLLM } from "@langchain/core/language_models/llms";
import { GenerationChunk, LLMResult } from "@langchain/core/outputs";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { LLMOptions, Portkey as Portkey$1 } from "portkey-ai";

//#region src/llms/portkey.d.ts
interface PortkeyOptions {
  apiKey?: string;
  baseURL?: string;
  mode?: string;
  llms?: [LLMOptions] | null;
}
declare class PortkeySession {
  portkey: Portkey$1;
  constructor(options?: PortkeyOptions);
}
/**
 * Get a session for the Portkey API. If one already exists with the same options,
 * it will be returned. Otherwise, a new session will be created.
 * @param options
 * @returns
 */
declare function getPortkeySession(options?: PortkeyOptions): PortkeySession;
/**
 * @example
 * ```typescript
 * const model = new Portkey({
 *   mode: "single",
 *   llms: [
 *     {
 *       provider: "openai",
 *       virtual_key: "open-ai-key-1234",
 *       model: "gpt-3.5-turbo-instruct",
 *       max_tokens: 2000,
 *     },
 *   ],
 * });
 *
 * // Stream the output of the model and process it
 * const res = await model.stream(
 *   "Question: Write a story about a king\nAnswer:"
 * );
 * for await (const i of res) {
 *   process.stdout.write(i);
 * }
 * ```
 */
declare class Portkey extends BaseLLM {
  apiKey?: string;
  baseURL?: string;
  mode?: string;
  llms?: [LLMOptions] | null;
  session: PortkeySession;
  constructor(init?: Partial<Portkey>);
  _llmType(): string;
  _generate(prompts: string[], options: this["ParsedCallOptions"], _?: CallbackManagerForLLMRun): Promise<LLMResult>;
  _streamResponseChunks(input: string, options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<GenerationChunk>;
}
//#endregion
export { Portkey, PortkeySession, getPortkeySession };
//# sourceMappingURL=portkey.d.cts.map