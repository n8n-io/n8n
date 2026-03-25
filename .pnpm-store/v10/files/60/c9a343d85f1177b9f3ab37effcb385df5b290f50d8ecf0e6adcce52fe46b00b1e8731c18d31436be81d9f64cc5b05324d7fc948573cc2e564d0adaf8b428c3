import { AzureOpenAIChatInput, OpenAICoreRequestOptions } from "../../types.cjs";
import { ChatOpenAIResponses, ChatOpenAIResponsesCallOptions } from "../../chat_models/responses.cjs";
import { AzureChatOpenAIFields } from "./common.cjs";
import { Serialized } from "@langchain/core/load/serializable";
import { LangSmithParams } from "@langchain/core/language_models/chat_models";

//#region src/azure/chat_models/responses.d.ts
declare class AzureChatOpenAIResponses<CallOptions extends ChatOpenAIResponsesCallOptions = ChatOpenAIResponsesCallOptions> extends ChatOpenAIResponses<CallOptions> implements Partial<AzureOpenAIChatInput> {
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
export { AzureChatOpenAIResponses };
//# sourceMappingURL=responses.d.cts.map