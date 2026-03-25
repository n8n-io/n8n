import { WatsonxAuth, WatsonxEmbeddingsBasicOptions, XOR } from "../types/ibm.js";
import { WatsonXAI } from "@ibm-cloud/watsonx-ai";
import { CreateEmbeddingsParams, Gateway } from "@ibm-cloud/watsonx-ai/gateway";
import { Embeddings, EmbeddingsParams } from "@langchain/core/embeddings";

//#region src/embeddings/ibm.d.ts
interface WatsonxEmbeddingsParams extends EmbeddingsParams, Omit<WatsonXAI.TextEmbeddingsParams, "modelId" | "inputs" | "parameters"> {
  /** Represents the maximum number of input tokens accepted. This can be used to avoid requests failing due to
   *  input being longer than configured limits. If the text is truncated, then it truncates the end of the input (on
   *  the right), so the start of the input will remain the same. If this value exceeds the `maximum sequence length`
   *  (refer to the documentation to find this value for the model) then the call will fail if the total number of
   *  tokens exceeds the `maximum sequence length`.
   */
  truncateInputTokens?: number;
  /** The return options for text embeddings. */
  returnOptions?: WatsonXAI.EmbeddingReturnOptions;
  /** The `id` of the model to be used for this request. Please refer to the [list of
   *  models](https://dataplatform.cloud.ibm.com/docs/content/wsj/analyze-data/fm-models-embed.html?context=wx&audience=wdp).
   */
  model: string;
}
interface WatsonxInputEmbeddings extends WatsonxEmbeddingsBasicOptions, WatsonxEmbeddingsParams {}
type WatsonxEmbeddingsGatewayKwargs = Omit<CreateEmbeddingsParams, "input" | keyof WatsonxEmbeddingsParams>;
interface WatsonxEmbeddingsGatewayParams extends EmbeddingsParams {
  modelGatewayKwargs?: WatsonxEmbeddingsGatewayKwargs;
  modelGateway: boolean;
}
interface WatsonxInputGatewayEmbeddings extends WatsonxEmbeddingsBasicOptions, WatsonxEmbeddingsGatewayParams, Omit<CreateEmbeddingsParams, keyof WatsonxEmbeddingsGatewayKwargs | "input"> {}
type WatsonxEmbeddingsConstructor = XOR<WatsonxInputEmbeddings, WatsonxInputGatewayEmbeddings> & WatsonxAuth;
declare class WatsonxEmbeddings extends Embeddings implements WatsonxEmbeddingsParams, WatsonxInputGatewayEmbeddings {
  model: string;
  serviceUrl: string;
  version: string;
  spaceId?: string;
  projectId?: string;
  truncateInputTokens?: number;
  returnOptions?: WatsonXAI.EmbeddingReturnOptions;
  maxRetries?: number;
  maxConcurrency: number;
  modelGatewayKwargs?: WatsonxEmbeddingsGatewayKwargs | undefined;
  modelGateway: boolean;
  protected service?: WatsonXAI;
  protected gateway?: Gateway;
  private checkValidProperties;
  constructor(fields: WatsonxEmbeddingsConstructor);
  scopeId(): {
    projectId: string;
    modelId: string;
  } | {
    spaceId: string;
    modelId: string;
  } | {
    model: string;
  };
  invocationParams(): {
    truncate_input_tokens: number | undefined;
    return_options: WatsonXAI.EmbeddingReturnOptions | undefined;
  };
  listModels(): Promise<string[] | undefined>;
  private embedSingleText;
  embedDocuments(documents: string[]): Promise<number[][]>;
  embedQuery(document: string): Promise<number[]>;
}
//#endregion
export { WatsonxEmbeddings, WatsonxEmbeddingsConstructor, WatsonxEmbeddingsGatewayKwargs, WatsonxEmbeddingsGatewayParams, WatsonxEmbeddingsParams, WatsonxInputEmbeddings, WatsonxInputGatewayEmbeddings };
//# sourceMappingURL=ibm.d.ts.map