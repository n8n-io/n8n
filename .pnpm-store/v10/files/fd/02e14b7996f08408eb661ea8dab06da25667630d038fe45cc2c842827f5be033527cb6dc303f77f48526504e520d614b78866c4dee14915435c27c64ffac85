import { GoogleAIAPI, GoogleAIAPIConfig, GoogleAIBaseLLMInput, GoogleAIModelRequestParams, GoogleConnectionParams, GoogleLLMResponse, GoogleModelParams, GooglePlatformType, GoogleRawResponse, GoogleResponse, VertexModelFamily } from "./types.js";
import { GoogleAbstractedClient, GoogleAbstractedClientOps, GoogleAbstractedClientOpsMethod } from "./auth.js";
import { BaseLanguageModelCallOptions } from "@langchain/core/language_models/base";
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { BaseRunManager } from "@langchain/core/callbacks/manager";
import { AsyncCaller, AsyncCallerCallOptions } from "@langchain/core/utils/async_caller";

//#region src/connection.d.ts
declare abstract class GoogleConnection<CallOptions extends AsyncCallerCallOptions, ResponseType extends GoogleResponse> {
  caller: AsyncCaller;
  client: GoogleAbstractedClient;
  streaming: boolean;
  constructor(caller: AsyncCaller, client: GoogleAbstractedClient, streaming?: boolean);
  abstract buildUrl(): Promise<string>;
  abstract buildMethod(): GoogleAbstractedClientOpsMethod;
  _clientInfoHeaders(): Promise<Record<string, string>>;
  _getClientInfo(): Promise<{
    userAgent: string;
    clientLibraryVersion: string;
  }>;
  _moduleName(): Promise<string>;
  additionalHeaders(): Promise<Record<string, string>>;
  _buildOpts(data: unknown | undefined, options: CallOptions, requestHeaders?: Record<string, string>): Promise<GoogleAbstractedClientOps>;
  _request(data: unknown | undefined, options: CallOptions, requestHeaders?: Record<string, string>): Promise<ResponseType>;
}
declare abstract class GoogleHostConnection<CallOptions extends AsyncCallerCallOptions, ResponseType extends GoogleResponse, AuthOptions> extends GoogleConnection<CallOptions, ResponseType> implements GoogleConnectionParams<AuthOptions> {
  platformType: GooglePlatformType | undefined;
  _endpoint: string | undefined;
  _location: string | undefined;
  _apiVersion: string | undefined;
  constructor(fields: GoogleConnectionParams<AuthOptions> | undefined, caller: AsyncCaller, client: GoogleAbstractedClient, streaming?: boolean);
  fieldPlatformType(fields: GoogleConnectionParams<any> | undefined): GooglePlatformType | undefined;
  get platform(): GooglePlatformType;
  get computedPlatformType(): GooglePlatformType;
  get computedApiVersion(): string;
  get apiVersion(): string;
  get location(): string;
  get computedLocation(): string;
  get endpoint(): string;
  get computedEndpoint(): string;
  buildMethod(): GoogleAbstractedClientOpsMethod;
}
declare abstract class GoogleRawConnection<CallOptions extends AsyncCallerCallOptions, AuthOptions> extends GoogleHostConnection<CallOptions, GoogleRawResponse, AuthOptions> {
  _buildOpts(data: unknown | undefined, _options: CallOptions, requestHeaders?: Record<string, string>): Promise<GoogleAbstractedClientOps>;
}
declare abstract class GoogleAIConnection<CallOptions extends AsyncCallerCallOptions, InputType, AuthOptions, ResponseType extends GoogleResponse> extends GoogleHostConnection<CallOptions, ResponseType, AuthOptions> implements GoogleAIBaseLLMInput<AuthOptions> {
  model: string;
  modelName: string;
  client: GoogleAbstractedClient;
  _apiName?: string;
  apiConfig?: GoogleAIAPIConfig;
  constructor(fields: GoogleAIBaseLLMInput<AuthOptions> | undefined, caller: AsyncCaller, client: GoogleAbstractedClient, streaming?: boolean);
  get modelFamily(): VertexModelFamily;
  get modelPublisher(): string;
  get computedAPIName(): string;
  get apiName(): string;
  get api(): GoogleAIAPI;
  get isApiKey(): boolean;
  fieldPlatformType(fields: GoogleConnectionParams<any> | undefined): GooglePlatformType | undefined;
  get computedPlatformType(): GooglePlatformType;
  get computedApiVersion(): string;
  get computedLocation(): string;
  abstract buildUrlMethod(): Promise<string>;
  buildUrlGenerativeLanguage(): Promise<string>;
  buildUrlVertexExpress(): Promise<string>;
  buildUrlVertexLocation(): Promise<string>;
  buildUrlVertex(): Promise<string>;
  buildUrl(): Promise<string>;
  abstract formatData(input: InputType, parameters: GoogleModelParams): Promise<unknown>;
  request(input: InputType, parameters: GoogleAIModelRequestParams, options: CallOptions, runManager?: BaseRunManager): Promise<ResponseType>;
}
declare abstract class AbstractGoogleLLMConnection<MessageType, AuthOptions> extends GoogleAIConnection<BaseLanguageModelCallOptions, MessageType, AuthOptions, GoogleLLMResponse> {
  buildUrlMethodGemini(): Promise<string>;
  buildUrlMethodClaude(): Promise<string>;
  buildUrlMethod(): Promise<string>;
  formatData(input: MessageType, parameters: GoogleAIModelRequestParams): Promise<unknown>;
}
interface GoogleCustomEventInfo {
  subEvent: string;
  module: string;
}
declare abstract class GoogleRequestCallbackHandler extends BaseCallbackHandler {
  customEventInfo(eventName: string): GoogleCustomEventInfo;
  abstract handleCustomRequestEvent(eventName: string, eventInfo: GoogleCustomEventInfo, data: any, runId: string, tags?: string[], metadata?: Record<string, any>): any;
  abstract handleCustomResponseEvent(eventName: string, eventInfo: GoogleCustomEventInfo, data: any, runId: string, tags?: string[], metadata?: Record<string, any>): any;
  abstract handleCustomChunkEvent(eventName: string, eventInfo: GoogleCustomEventInfo, data: any, runId: string, tags?: string[], metadata?: Record<string, any>): any;
  handleCustomEvent(eventName: string, data: any, runId: string, tags?: string[], metadata?: Record<string, any>): any;
}
declare class GoogleRequestLogger extends GoogleRequestCallbackHandler {
  name: string;
  log(eventName: string, data: any, tags?: string[]): undefined;
  handleCustomRequestEvent(eventName: string, _eventInfo: GoogleCustomEventInfo, data: any, _runId: string, tags?: string[], _metadata?: Record<string, any>): any;
  handleCustomResponseEvent(eventName: string, _eventInfo: GoogleCustomEventInfo, data: any, _runId: string, tags?: string[], _metadata?: Record<string, any>): any;
  handleCustomChunkEvent(eventName: string, _eventInfo: GoogleCustomEventInfo, data: any, _runId: string, tags?: string[], _metadata?: Record<string, any>): any;
}
declare class GoogleRequestRecorder extends GoogleRequestCallbackHandler {
  name: string;
  request: any;
  response: any;
  chunk: any[];
  handleCustomRequestEvent(_eventName: string, _eventInfo: GoogleCustomEventInfo, data: any, _runId: string, _tags?: string[], _metadata?: Record<string, any>): any;
  handleCustomResponseEvent(_eventName: string, _eventInfo: GoogleCustomEventInfo, data: any, _runId: string, _tags?: string[], _metadata?: Record<string, any>): any;
  handleCustomChunkEvent(_eventName: string, _eventInfo: GoogleCustomEventInfo, data: any, _runId: string, _tags?: string[], _metadata?: Record<string, any>): any;
}
//#endregion
export { AbstractGoogleLLMConnection, GoogleAIConnection, GoogleConnection, GoogleCustomEventInfo, GoogleHostConnection, GoogleRawConnection, GoogleRequestCallbackHandler, GoogleRequestLogger, GoogleRequestRecorder };
//# sourceMappingURL=connection.d.ts.map