import { BaseLLMCallOptions, BaseLLMParams, LLM } from "@langchain/core/language_models/llms";
import { GenerationChunk } from "@langchain/core/outputs";
import { CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
import { SageMakerRuntimeClient, SageMakerRuntimeClientConfig } from "@aws-sdk/client-sagemaker-runtime";

//#region src/llms/sagemaker_endpoint.d.ts

/**
 * A handler class to transform input from LLM to a format that SageMaker
 * endpoint expects. Similarily, the class also handles transforming output from
 * the SageMaker endpoint to a format that LLM class expects.
 *
 * Example:
 * ```
 * class ContentHandler implements ContentHandlerBase<string, string> {
 *   contentType = "application/json"
 *   accepts = "application/json"
 *
 *   transformInput(prompt: string, modelKwargs: Record<string, unknown>) {
 *     const inputString = JSON.stringify({
 *       prompt,
 *      ...modelKwargs
 *     })
 *     return Buffer.from(inputString)
 *   }
 *
 *   transformOutput(output: Uint8Array) {
 *     const responseJson = JSON.parse(Buffer.from(output).toString("utf-8"))
 *     return responseJson[0].generated_text
 *   }
 *
 * }
 * ```
 */
declare abstract class BaseSageMakerContentHandler<InputType, OutputType> {
  contentType: string;
  accepts: string;
  /**
   * Transforms the prompt and model arguments into a specific format for sending to SageMaker.
   * @param {InputType} prompt The prompt to be transformed.
   * @param {Record<string, unknown>} modelKwargs Additional arguments.
   * @returns {Promise<Uint8Array>} A promise that resolves to the formatted data for sending.
   */
  abstract transformInput(prompt: InputType, modelKwargs: Record<string, unknown>): Promise<Uint8Array>;
  /**
   * Transforms SageMaker output into a desired format.
   * @param {Uint8Array} output The raw output from SageMaker.
   * @returns {Promise<OutputType>} A promise that resolves to the transformed data.
   */
  abstract transformOutput(output: Uint8Array): Promise<OutputType>;
}
type SageMakerLLMContentHandler = BaseSageMakerContentHandler<string, string>;
/**
 * The SageMakerEndpointInput interface defines the input parameters for
 * the SageMakerEndpoint class, which includes the endpoint name, client
 * options for the SageMaker client, the content handler, and optional
 * keyword arguments for the model and the endpoint.
 */
interface SageMakerEndpointInput extends BaseLLMParams {
  /**
   * The name of the endpoint from the deployed SageMaker model. Must be unique
   * within an AWS Region.
   */
  endpointName: string;
  /**
   * Options passed to the SageMaker client.
   */
  clientOptions: SageMakerRuntimeClientConfig;
  /**
   * Key word arguments to pass to the model.
   */
  modelKwargs?: Record<string, unknown>;
  /**
   * Optional attributes passed to the InvokeEndpointCommand
   */
  endpointKwargs?: Record<string, unknown>;
  /**
   * The content handler class that provides an input and output transform
   * functions to handle formats between LLM and the endpoint.
   */
  contentHandler: SageMakerLLMContentHandler;
  streaming?: boolean;
}
/**
 * The SageMakerEndpoint class is used to interact with SageMaker
 * Inference Endpoint models. It uses the AWS client for authentication,
 * which automatically loads credentials.
 * If a specific credential profile is to be used, the name of the profile
 * from the ~/.aws/credentials file must be passed. The credentials or
 * roles used should have the required policies to access the SageMaker
 * endpoint.
 */
declare class SageMakerEndpoint extends LLM<BaseLLMCallOptions> {
  lc_serializable: boolean;
  static lc_name(): string;
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  endpointName: string;
  modelKwargs?: Record<string, unknown>;
  endpointKwargs?: Record<string, unknown>;
  client: SageMakerRuntimeClient;
  contentHandler: SageMakerLLMContentHandler;
  streaming: boolean;
  constructor(fields: SageMakerEndpointInput);
  _llmType(): string;
  /**
   * Calls the SageMaker endpoint and retrieves the result.
   * @param {string} prompt The input prompt.
   * @param {this["ParsedCallOptions"]} options Parsed call options.
   * @param {CallbackManagerForLLMRun} runManager Optional run manager.
   * @returns {Promise<string>} A promise that resolves to the generated string.
   */
  /** @ignore */
  _call(prompt: string, options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<string>;
  private streamingCall;
  private noStreamingCall;
  /**
   * Streams response chunks from the SageMaker endpoint.
   * @param {string} prompt The input prompt.
   * @param {this["ParsedCallOptions"]} options Parsed call options.
   * @returns {AsyncGenerator<GenerationChunk>} An asynchronous generator yielding generation chunks.
   */
  _streamResponseChunks(prompt: string, options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<GenerationChunk>;
}
//#endregion
export { BaseSageMakerContentHandler, SageMakerEndpoint, SageMakerEndpointInput, SageMakerLLMContentHandler };
//# sourceMappingURL=sagemaker_endpoint.d.cts.map