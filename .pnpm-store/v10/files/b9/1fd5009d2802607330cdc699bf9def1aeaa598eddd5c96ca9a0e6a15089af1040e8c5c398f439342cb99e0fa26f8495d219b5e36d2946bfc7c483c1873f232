import { AzureOpenAIChatInput, OpenAICoreRequestOptions } from "../../types.cjs";
import { ChatOpenAICompletions, ChatOpenAICompletionsCallOptions } from "../../chat_models/completions.cjs";
import { AzureChatOpenAIFields } from "./common.cjs";
import { Serialized } from "@langchain/core/load/serializable";
import { LangSmithParams } from "@langchain/core/language_models/chat_models";

//#region src/azure/chat_models/completions.d.ts
declare class AzureChatOpenAICompletions<CallOptions extends ChatOpenAICompletionsCallOptions = ChatOpenAICompletionsCallOptions> extends ChatOpenAICompletions<CallOptions> implements Partial<AzureOpenAIChatInput> {
  azureOpenAIApiVersion?: string;
  azureOpenAIApiKey?: string;
  azureADTokenProvider?: () => Promise<string>;
  azureOpenAIApiInstanceName?: string;
  azureOpenAIApiDeploymentName?: string;
  azureOpenAIBasePath?: string;
  azureOpenAIEndpoint?: string;
  _llmType(): string;
  get lc_aliases(): Record<string, string>;
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  get lc_serializable_keys(): string[];
  getLsParams(options: this["ParsedCallOptions"]): LangSmithParams;
  constructor(fields?: AzureChatOpenAIFields);
  _getClientOptions(options: OpenAICoreRequestOptions | undefined): OpenAICoreRequestOptions;
  toJSON(): Serialized;
}
//#endregion
export { AzureChatOpenAICompletions };
//# sourceMappingURL=completions.d.cts.map