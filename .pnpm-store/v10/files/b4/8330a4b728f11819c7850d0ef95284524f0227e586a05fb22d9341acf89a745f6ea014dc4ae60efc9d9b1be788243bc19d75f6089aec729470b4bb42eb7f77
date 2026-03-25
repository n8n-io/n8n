import { PortkeySession } from "../llms/portkey.cjs";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatGenerationChunk, ChatResult } from "@langchain/core/outputs";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { BaseMessage } from "@langchain/core/messages";
import { LLMOptions } from "portkey-ai";

//#region src/chat_models/portkey.d.ts
declare class PortkeyChat extends BaseChatModel {
  apiKey?: string;
  baseURL?: string;
  mode?: string;
  llms?: [LLMOptions] | null;
  session: PortkeySession;
  constructor(init?: Partial<PortkeyChat>);
  _llmType(): string;
  _generate(messages: BaseMessage[], options: this["ParsedCallOptions"], _?: CallbackManagerForLLMRun): Promise<ChatResult>;
  _streamResponseChunks(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<ChatGenerationChunk>;
  _combineLLMOutput(): {};
}
//#endregion
export { PortkeyChat };
//# sourceMappingURL=portkey.d.cts.map