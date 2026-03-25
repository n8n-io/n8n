import { GenerationChunk } from "../../outputs.cjs";
import { CallbackManagerForLLMRun } from "../../callbacks/manager.cjs";
import { BaseLLMParams, LLM } from "../../language_models/llms.cjs";

//#region src/utils/testing/llms.d.ts
declare class FakeLLM extends LLM {
  response?: string;
  thrownErrorString?: string;
  constructor(fields: {
    response?: string;
    thrownErrorString?: string;
  } & BaseLLMParams);
  _llmType(): string;
  _call(prompt: string, _options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<string>;
}
declare class FakeStreamingLLM extends LLM {
  sleep?: number;
  responses?: string[];
  thrownErrorString?: string;
  constructor(fields: {
    sleep?: number;
    responses?: string[];
    thrownErrorString?: string;
  } & BaseLLMParams);
  _llmType(): string;
  _call(prompt: string): Promise<string>;
  _streamResponseChunks(input: string, _options?: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<GenerationChunk, void, unknown>;
}
//#endregion
export { FakeLLM, FakeStreamingLLM };
//# sourceMappingURL=llms.d.cts.map