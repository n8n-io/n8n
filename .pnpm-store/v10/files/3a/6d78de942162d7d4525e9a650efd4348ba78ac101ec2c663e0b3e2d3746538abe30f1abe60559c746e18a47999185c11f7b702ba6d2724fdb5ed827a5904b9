import { BaseLLMParams } from "@langchain/core/language_models/llms";

//#region src/types/googlevertexai-types.d.ts
interface GoogleConnectionParams<AuthOptions> {
  authOptions?: AuthOptions;
}
interface GoogleVertexAIConnectionParams<AuthOptions> extends GoogleConnectionParams<AuthOptions> {
  /** Hostname for the API call */
  endpoint?: string;
  /** Region where the LLM is stored */
  location?: string;
  /** The version of the API functions. Part of the path. */
  apiVersion?: string;
  /**
   * If you are planning to connect to a model that lives under a custom endpoint
   * provide the "customModelURL" which will override the automatic URL building
   *
   * This is necessary in cases when you want to point to a fine-tuned model or
   * a model that has been hidden under VertexAI Endpoints.
   *
   * In those cases, specifying the `GoogleVertexAIModelParams.model` param
   * will not be necessary and will be ignored.
   *
   * @see GoogleVertexAILLMConnection.buildUrl
   * */
  customModelURL?: string;
}
interface GoogleVertexAIModelParams {
  /** Model to use */
  model?: string;
  /** Sampling temperature to use */
  temperature?: number;
  /**
   * Maximum number of tokens to generate in the completion.
   */
  maxOutputTokens?: number;
  /**
   * Top-p changes how the model selects tokens for output.
   *
   * Tokens are selected from most probable to least until the sum
   * of their probabilities equals the top-p value.
   *
   * For example, if tokens A, B, and C have a probability of
   * .3, .2, and .1 and the top-p value is .5, then the model will
   * select either A or B as the next token (using temperature).
   */
  topP?: number;
  /**
   * Top-k changes how the model selects tokens for output.
   *
   * A top-k of 1 means the selected token is the most probable among
   * all tokens in the model’s vocabulary (also called greedy decoding),
   * while a top-k of 3 means that the next token is selected from
   * among the 3 most probable tokens (using temperature).
   */
  topK?: number;
}
interface GoogleVertexAIBaseLLMInput<AuthOptions> extends BaseLLMParams, GoogleVertexAIConnectionParams<AuthOptions>, GoogleVertexAIModelParams {}
interface GoogleResponse {
  data: any;
}
interface GoogleVertexAIBasePrediction {
  safetyAttributes?: any;
}
interface GoogleVertexAILLMPredictions<PredictionType extends GoogleVertexAIBasePrediction> {
  predictions: PredictionType[];
}
type GoogleAbstractedClientOpsMethod = "GET" | "POST";
type GoogleAbstractedClientOpsResponseType = "json" | "stream";
type GoogleAbstractedClientOps = {
  url?: string;
  method?: GoogleAbstractedClientOpsMethod;
  data?: unknown;
  responseType?: GoogleAbstractedClientOpsResponseType;
};
interface GoogleAbstractedClient {
  request: (opts: GoogleAbstractedClientOps) => unknown;
  getProjectId: () => Promise<string>;
}
//#endregion
export { GoogleAbstractedClient, GoogleAbstractedClientOpsMethod, GoogleResponse, GoogleVertexAIBaseLLMInput, GoogleVertexAIBasePrediction, GoogleVertexAIConnectionParams, GoogleVertexAILLMPredictions };
//# sourceMappingURL=googlevertexai-types.d.cts.map