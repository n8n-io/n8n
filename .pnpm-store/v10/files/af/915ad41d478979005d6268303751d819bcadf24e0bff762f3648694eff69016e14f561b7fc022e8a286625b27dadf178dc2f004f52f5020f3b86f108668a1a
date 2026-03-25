import { GoogleAbstractedClient, GoogleAbstractedClientOpsMethod, GoogleResponse, GoogleVertexAIBasePrediction, GoogleVertexAIConnectionParams, GoogleVertexAILLMPredictions } from "../types/googlevertexai-types.cjs";
import { BaseLanguageModelCallOptions } from "@langchain/core/language_models/base";
import { AsyncCaller, AsyncCallerCallOptions } from "@langchain/core/utils/async_caller";

//#region src/utils/googlevertexai-connection.d.ts
declare abstract class GoogleConnection<CallOptions extends AsyncCallerCallOptions, ResponseType extends GoogleResponse> {
  caller: AsyncCaller;
  client: GoogleAbstractedClient;
  streaming: boolean;
  constructor(caller: AsyncCaller, client: GoogleAbstractedClient, streaming?: boolean);
  abstract buildUrl(): Promise<string>;
  abstract buildMethod(): GoogleAbstractedClientOpsMethod;
  _request(data: unknown | undefined, options: CallOptions): Promise<ResponseType>;
}
declare abstract class GoogleVertexAIConnection<CallOptions extends AsyncCallerCallOptions, ResponseType extends GoogleResponse, AuthOptions> extends GoogleConnection<CallOptions, ResponseType> implements GoogleVertexAIConnectionParams<AuthOptions> {
  endpoint: string;
  location: string;
  apiVersion: string;
  constructor(fields: GoogleVertexAIConnectionParams<AuthOptions> | undefined, caller: AsyncCaller, client: GoogleAbstractedClient, streaming?: boolean);
  buildMethod(): GoogleAbstractedClientOpsMethod;
}
interface GoogleVertexAILLMResponse<PredictionType extends GoogleVertexAIBasePrediction> extends GoogleResponse {
  data: GoogleVertexAIStream | GoogleVertexAILLMPredictions<PredictionType>;
}
declare class GoogleVertexAIStream {
  _buffer: string;
  _bufferOpen: boolean;
  _firstRun: boolean;
  /**
   * Add data to the buffer. This may cause chunks to be generated, if available.
   * @param data
   */
  appendBuffer(data: string): void;
  /**
   * Indicate there is no more data that will be added to the text buffer.
   * This should be called when all the data has been read and added to indicate
   * that we should process everything remaining in the buffer.
   */
  closeBuffer(): void;
  /**
   * Skip characters in the buffer till we get to the start of an object.
   * Then attempt to read a full object.
   * If we do read a full object, turn it into a chunk and send it to the chunk handler.
   * Repeat this for as much as we can.
   */
  _parseBuffer(): void;
  /**
   * If the string is present, move the start of the buffer to the first occurrence
   * of that string. This is useful for skipping over elements or parts that we're not
   * really interested in parsing. (ie - the opening characters, comma separators, etc.)
   * @param start The string to start the buffer with
   */
  _skipTo(start: string): void;
  /**
   * Given what is in the buffer, parse a single object out of it.
   * If a complete object isn't available, return null.
   * Assumes that we are at the start of an object to parse.
   */
  _getFullObject(): object | null;
  _simplifyObject(obj: unknown): object;
  _chunkResolution: (chunk: any) => void;
  _chunkPending: Promise<any> | null;
  _chunkQueue: any[];
  /**
   * Register that we have another chunk available for consumption.
   * If we are waiting for a chunk, resolve the promise waiting for it immediately.
   * If not, then add it to the queue.
   * @param chunk
   */
  _handleChunk(chunk: any): void;
  /**
   * Get the next chunk that is coming from the stream.
   * This chunk may be null, usually indicating the last chunk in the stream.
   */
  nextChunk(): Promise<any>;
  /**
   * Is the stream done?
   * A stream is only done if all of the following are true:
   * - There is no more data to be added to the text buffer
   * - There is no more data in the text buffer
   * - There are no chunks that are waiting to be consumed
   */
  get streamDone(): boolean;
}
//#endregion
export { GoogleVertexAIConnection, GoogleVertexAILLMResponse };
//# sourceMappingURL=googlevertexai-connection.d.cts.map