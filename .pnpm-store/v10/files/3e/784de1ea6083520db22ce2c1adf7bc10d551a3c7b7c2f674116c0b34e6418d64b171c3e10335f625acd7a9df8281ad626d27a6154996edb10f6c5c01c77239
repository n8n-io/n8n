import { AzureOpenAIInput, OpenAICoreRequestOptions, OpenAIInput } from "../types.js";
import { OpenAI } from "../llms.js";
import { ClientOptions } from "openai";
import { BaseLLMParams } from "@langchain/core/language_models/llms";

//#region src/azure/llms.d.ts
declare class AzureOpenAI$1 extends OpenAI {
  azureOpenAIApiVersion?: string;
  azureOpenAIApiKey?: string;
  azureADTokenProvider?: () => Promise<string>;
  azureOpenAIApiInstanceName?: string;
  azureOpenAIApiDeploymentName?: string;
  azureOpenAIBasePath?: string;
  azureOpenAIEndpoint?: string;
  get lc_aliases(): Record<string, string>;
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  constructor(fields?: Partial<OpenAIInput> & {
    openAIApiKey?: string;
    openAIApiVersion?: string;
    openAIBasePath?: string;
    deploymentName?: string;
  } & Partial<AzureOpenAIInput> & BaseLLMParams & {
    configuration?: ClientOptions;
  });
  protected _getClientOptions(options: OpenAICoreRequestOptions | undefined): OpenAICoreRequestOptions;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toJSON(): any;
}
//#endregion
export { AzureOpenAI$1 as AzureOpenAI };
//# sourceMappingURL=llms.d.ts.map