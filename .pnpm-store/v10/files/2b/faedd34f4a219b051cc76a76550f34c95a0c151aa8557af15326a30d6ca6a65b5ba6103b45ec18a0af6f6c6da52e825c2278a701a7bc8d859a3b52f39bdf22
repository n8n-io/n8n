// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { type Agent, type RequestInit } from './_shims/index';
import * as qs from './internal/qs';
import * as Core from './core';
import * as Errors from './error';
import * as Pagination from './pagination';
import { type CursorPageParams, CursorPageResponse, PageResponse } from './pagination';
import * as Uploads from './uploads';
import * as API from './resources/index';
import {
  Batch,
  BatchCreateParams,
  BatchError,
  BatchListParams,
  BatchRequestCounts,
  Batches,
  BatchesPage,
} from './resources/batches';
import {
  Completion,
  CompletionChoice,
  CompletionCreateParams,
  CompletionCreateParamsNonStreaming,
  CompletionCreateParamsStreaming,
  CompletionUsage,
  Completions,
} from './resources/completions';
import {
  CreateEmbeddingResponse,
  Embedding,
  EmbeddingCreateParams,
  EmbeddingModel,
  Embeddings,
} from './resources/embeddings';
import {
  FileContent,
  FileCreateParams,
  FileDeleted,
  FileListParams,
  FileObject,
  FileObjectsPage,
  FilePurpose,
  Files,
} from './resources/files';
import {
  Image,
  ImageCreateVariationParams,
  ImageEditParams,
  ImageGenerateParams,
  ImageModel,
  Images,
  ImagesResponse,
} from './resources/images';
import { Model, ModelDeleted, Models, ModelsPage } from './resources/models';
import {
  Moderation,
  ModerationCreateParams,
  ModerationCreateResponse,
  ModerationImageURLInput,
  ModerationModel,
  ModerationMultiModalInput,
  ModerationTextInput,
  Moderations,
} from './resources/moderations';
import { Audio, AudioModel, AudioResponseFormat } from './resources/audio/audio';
import { Beta } from './resources/beta/beta';
import { Chat, ChatModel } from './resources/chat/chat';
import {
  ChatCompletion,
  ChatCompletionAssistantMessageParam,
  ChatCompletionAudio,
  ChatCompletionAudioParam,
  ChatCompletionChunk,
  ChatCompletionContentPart,
  ChatCompletionContentPartImage,
  ChatCompletionContentPartInputAudio,
  ChatCompletionContentPartRefusal,
  ChatCompletionContentPartText,
  ChatCompletionCreateParams,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionFunctionCallOption,
  ChatCompletionFunctionMessageParam,
  ChatCompletionMessage,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
  ChatCompletionModality,
  ChatCompletionNamedToolChoice,
  ChatCompletionPredictionContent,
  ChatCompletionRole,
  ChatCompletionStreamOptions,
  ChatCompletionSystemMessageParam,
  ChatCompletionTokenLogprob,
  ChatCompletionTool,
  ChatCompletionToolChoiceOption,
  ChatCompletionToolMessageParam,
  ChatCompletionUserMessageParam,
} from './resources/chat/completions';
import { FineTuning } from './resources/fine-tuning/fine-tuning';
import {
  Upload,
  UploadCompleteParams,
  UploadCreateParams,
  Uploads as UploadsAPIUploads,
} from './resources/uploads/uploads';

export interface ClientOptions {
  /**
   * Defaults to process.env['OPENAI_API_KEY'].
   */
  apiKey?: string | undefined;

  /**
   * Defaults to process.env['OPENAI_ORG_ID'].
   */
  organization?: string | null | undefined;

  /**
   * Defaults to process.env['OPENAI_PROJECT_ID'].
   */
  project?: string | null | undefined;

  /**
   * Override the default base URL for the API, e.g., "https://api.example.com/v2/"
   *
   * Defaults to process.env['OPENAI_BASE_URL'].
   */
  baseURL?: string | null | undefined;

  /**
   * The maximum amount of time (in milliseconds) that the client should wait for a response
   * from the server before timing out a single request.
   *
   * Note that request timeouts are retried by default, so in a worst-case scenario you may wait
   * much longer than this timeout before the promise succeeds or fails.
   */
  timeout?: number;

  /**
   * An HTTP agent used to manage HTTP(S) connections.
   *
   * If not provided, an agent will be constructed by default in the Node.js environment,
   * otherwise no agent is used.
   */
  httpAgent?: Agent;

  /**
   * Specify a custom `fetch` function implementation.
   *
   * If not provided, we use `node-fetch` on Node.js and otherwise expect that `fetch` is
   * defined globally.
   */
  fetch?: Core.Fetch | undefined;

  /**
   * The maximum number of times that the client will retry a request in case of a
   * temporary failure, like a network error or a 5XX error from the server.
   *
   * @default 2
   */
  maxRetries?: number;

  /**
   * Default headers to include with every request to the API.
   *
   * These can be removed in individual requests by explicitly setting the
   * header to `undefined` or `null` in request options.
   */
  defaultHeaders?: Core.Headers;

  /**
   * Default query parameters to include with every request to the API.
   *
   * These can be removed in individual requests by explicitly setting the
   * param to `undefined` in request options.
   */
  defaultQuery?: Core.DefaultQuery;

  /**
   * By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
   * Only set this option to `true` if you understand the risks and have appropriate mitigations in place.
   */
  dangerouslyAllowBrowser?: boolean;
}

/**
 * API Client for interfacing with the OpenAI API.
 */
export class OpenAI extends Core.APIClient {
  apiKey: string;
  organization: string | null;
  project: string | null;

  private _options: ClientOptions;

  /**
   * API Client for interfacing with the OpenAI API.
   *
   * @param {string | undefined} [opts.apiKey=process.env['OPENAI_API_KEY'] ?? undefined]
   * @param {string | null | undefined} [opts.organization=process.env['OPENAI_ORG_ID'] ?? null]
   * @param {string | null | undefined} [opts.project=process.env['OPENAI_PROJECT_ID'] ?? null]
   * @param {string} [opts.baseURL=process.env['OPENAI_BASE_URL'] ?? https://api.openai.com/v1] - Override the default base URL for the API.
   * @param {number} [opts.timeout=10 minutes] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
   * @param {number} [opts.httpAgent] - An HTTP agent used to manage HTTP(s) connections.
   * @param {Core.Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
   * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
   * @param {Core.Headers} opts.defaultHeaders - Default headers to include with every request to the API.
   * @param {Core.DefaultQuery} opts.defaultQuery - Default query parameters to include with every request to the API.
   * @param {boolean} [opts.dangerouslyAllowBrowser=false] - By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
   */
  constructor({
    baseURL = Core.readEnv('OPENAI_BASE_URL'),
    apiKey = Core.readEnv('OPENAI_API_KEY'),
    organization = Core.readEnv('OPENAI_ORG_ID') ?? null,
    project = Core.readEnv('OPENAI_PROJECT_ID') ?? null,
    ...opts
  }: ClientOptions = {}) {
    if (apiKey === undefined) {
      throw new Errors.OpenAIError(
        "The OPENAI_API_KEY environment variable is missing or empty; either provide it, or instantiate the OpenAI client with an apiKey option, like new OpenAI({ apiKey: 'My API Key' }).",
      );
    }

    const options: ClientOptions = {
      apiKey,
      organization,
      project,
      ...opts,
      baseURL: baseURL || `https://api.openai.com/v1`,
    };

    if (!options.dangerouslyAllowBrowser && Core.isRunningInBrowser()) {
      throw new Errors.OpenAIError(
        "It looks like you're running in a browser-like environment.\n\nThis is disabled by default, as it risks exposing your secret API credentials to attackers.\nIf you understand the risks and have appropriate mitigations in place,\nyou can set the `dangerouslyAllowBrowser` option to `true`, e.g.,\n\nnew OpenAI({ apiKey, dangerouslyAllowBrowser: true });\n\nhttps://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety\n",
      );
    }

    super({
      baseURL: options.baseURL!,
      timeout: options.timeout ?? 600000 /* 10 minutes */,
      httpAgent: options.httpAgent,
      maxRetries: options.maxRetries,
      fetch: options.fetch,
    });

    this._options = options;

    this.apiKey = apiKey;
    this.organization = organization;
    this.project = project;
  }

  completions: API.Completions = new API.Completions(this);
  chat: API.Chat = new API.Chat(this);
  embeddings: API.Embeddings = new API.Embeddings(this);
  files: API.Files = new API.Files(this);
  images: API.Images = new API.Images(this);
  audio: API.Audio = new API.Audio(this);
  moderations: API.Moderations = new API.Moderations(this);
  models: API.Models = new API.Models(this);
  fineTuning: API.FineTuning = new API.FineTuning(this);
  beta: API.Beta = new API.Beta(this);
  batches: API.Batches = new API.Batches(this);
  uploads: API.Uploads = new API.Uploads(this);

  protected override defaultQuery(): Core.DefaultQuery | undefined {
    return this._options.defaultQuery;
  }

  protected override defaultHeaders(opts: Core.FinalRequestOptions): Core.Headers {
    return {
      ...super.defaultHeaders(opts),
      'OpenAI-Organization': this.organization,
      'OpenAI-Project': this.project,
      ...this._options.defaultHeaders,
    };
  }

  protected override authHeaders(opts: Core.FinalRequestOptions): Core.Headers {
    return { Authorization: `Bearer ${this.apiKey}` };
  }

  protected override stringifyQuery(query: Record<string, unknown>): string {
    return qs.stringify(query, { arrayFormat: 'brackets' });
  }

  static OpenAI = this;
  static DEFAULT_TIMEOUT = 600000; // 10 minutes

  static OpenAIError = Errors.OpenAIError;
  static APIError = Errors.APIError;
  static APIConnectionError = Errors.APIConnectionError;
  static APIConnectionTimeoutError = Errors.APIConnectionTimeoutError;
  static APIUserAbortError = Errors.APIUserAbortError;
  static NotFoundError = Errors.NotFoundError;
  static ConflictError = Errors.ConflictError;
  static RateLimitError = Errors.RateLimitError;
  static BadRequestError = Errors.BadRequestError;
  static AuthenticationError = Errors.AuthenticationError;
  static InternalServerError = Errors.InternalServerError;
  static PermissionDeniedError = Errors.PermissionDeniedError;
  static UnprocessableEntityError = Errors.UnprocessableEntityError;

  static toFile = Uploads.toFile;
  static fileFromPath = Uploads.fileFromPath;
}

OpenAI.Completions = Completions;
OpenAI.Chat = Chat;
OpenAI.Embeddings = Embeddings;
OpenAI.Files = Files;
OpenAI.FileObjectsPage = FileObjectsPage;
OpenAI.Images = Images;
OpenAI.Audio = Audio;
OpenAI.Moderations = Moderations;
OpenAI.Models = Models;
OpenAI.ModelsPage = ModelsPage;
OpenAI.FineTuning = FineTuning;
OpenAI.Beta = Beta;
OpenAI.Batches = Batches;
OpenAI.BatchesPage = BatchesPage;
OpenAI.Uploads = UploadsAPIUploads;
export declare namespace OpenAI {
  export type RequestOptions = Core.RequestOptions;

  export import Page = Pagination.Page;
  export { type PageResponse as PageResponse };

  export import CursorPage = Pagination.CursorPage;
  export { type CursorPageParams as CursorPageParams, type CursorPageResponse as CursorPageResponse };

  export {
    Completions as Completions,
    type Completion as Completion,
    type CompletionChoice as CompletionChoice,
    type CompletionUsage as CompletionUsage,
    type CompletionCreateParams as CompletionCreateParams,
    type CompletionCreateParamsNonStreaming as CompletionCreateParamsNonStreaming,
    type CompletionCreateParamsStreaming as CompletionCreateParamsStreaming,
  };

  export {
    Chat as Chat,
    type ChatModel as ChatModel,
    type ChatCompletion as ChatCompletion,
    type ChatCompletionAssistantMessageParam as ChatCompletionAssistantMessageParam,
    type ChatCompletionAudio as ChatCompletionAudio,
    type ChatCompletionAudioParam as ChatCompletionAudioParam,
    type ChatCompletionChunk as ChatCompletionChunk,
    type ChatCompletionContentPart as ChatCompletionContentPart,
    type ChatCompletionContentPartImage as ChatCompletionContentPartImage,
    type ChatCompletionContentPartInputAudio as ChatCompletionContentPartInputAudio,
    type ChatCompletionContentPartRefusal as ChatCompletionContentPartRefusal,
    type ChatCompletionContentPartText as ChatCompletionContentPartText,
    type ChatCompletionFunctionCallOption as ChatCompletionFunctionCallOption,
    type ChatCompletionFunctionMessageParam as ChatCompletionFunctionMessageParam,
    type ChatCompletionMessage as ChatCompletionMessage,
    type ChatCompletionMessageParam as ChatCompletionMessageParam,
    type ChatCompletionMessageToolCall as ChatCompletionMessageToolCall,
    type ChatCompletionModality as ChatCompletionModality,
    type ChatCompletionNamedToolChoice as ChatCompletionNamedToolChoice,
    type ChatCompletionPredictionContent as ChatCompletionPredictionContent,
    type ChatCompletionRole as ChatCompletionRole,
    type ChatCompletionStreamOptions as ChatCompletionStreamOptions,
    type ChatCompletionSystemMessageParam as ChatCompletionSystemMessageParam,
    type ChatCompletionTokenLogprob as ChatCompletionTokenLogprob,
    type ChatCompletionTool as ChatCompletionTool,
    type ChatCompletionToolChoiceOption as ChatCompletionToolChoiceOption,
    type ChatCompletionToolMessageParam as ChatCompletionToolMessageParam,
    type ChatCompletionUserMessageParam as ChatCompletionUserMessageParam,
    type ChatCompletionCreateParams as ChatCompletionCreateParams,
    type ChatCompletionCreateParamsNonStreaming as ChatCompletionCreateParamsNonStreaming,
    type ChatCompletionCreateParamsStreaming as ChatCompletionCreateParamsStreaming,
  };

  export {
    Embeddings as Embeddings,
    type CreateEmbeddingResponse as CreateEmbeddingResponse,
    type Embedding as Embedding,
    type EmbeddingModel as EmbeddingModel,
    type EmbeddingCreateParams as EmbeddingCreateParams,
  };

  export {
    Files as Files,
    type FileContent as FileContent,
    type FileDeleted as FileDeleted,
    type FileObject as FileObject,
    type FilePurpose as FilePurpose,
    FileObjectsPage as FileObjectsPage,
    type FileCreateParams as FileCreateParams,
    type FileListParams as FileListParams,
  };

  export {
    Images as Images,
    type Image as Image,
    type ImageModel as ImageModel,
    type ImagesResponse as ImagesResponse,
    type ImageCreateVariationParams as ImageCreateVariationParams,
    type ImageEditParams as ImageEditParams,
    type ImageGenerateParams as ImageGenerateParams,
  };

  export { Audio as Audio, type AudioModel as AudioModel, type AudioResponseFormat as AudioResponseFormat };

  export {
    Moderations as Moderations,
    type Moderation as Moderation,
    type ModerationImageURLInput as ModerationImageURLInput,
    type ModerationModel as ModerationModel,
    type ModerationMultiModalInput as ModerationMultiModalInput,
    type ModerationTextInput as ModerationTextInput,
    type ModerationCreateResponse as ModerationCreateResponse,
    type ModerationCreateParams as ModerationCreateParams,
  };

  export {
    Models as Models,
    type Model as Model,
    type ModelDeleted as ModelDeleted,
    ModelsPage as ModelsPage,
  };

  export { FineTuning as FineTuning };

  export { Beta as Beta };

  export {
    Batches as Batches,
    type Batch as Batch,
    type BatchError as BatchError,
    type BatchRequestCounts as BatchRequestCounts,
    BatchesPage as BatchesPage,
    type BatchCreateParams as BatchCreateParams,
    type BatchListParams as BatchListParams,
  };

  export {
    UploadsAPIUploads as Uploads,
    type Upload as Upload,
    type UploadCreateParams as UploadCreateParams,
    type UploadCompleteParams as UploadCompleteParams,
  };

  export type ErrorObject = API.ErrorObject;
  export type FunctionDefinition = API.FunctionDefinition;
  export type FunctionParameters = API.FunctionParameters;
  export type ResponseFormatJSONObject = API.ResponseFormatJSONObject;
  export type ResponseFormatJSONSchema = API.ResponseFormatJSONSchema;
  export type ResponseFormatText = API.ResponseFormatText;
}

// ---------------------- Azure ----------------------

/** API Client for interfacing with the Azure OpenAI API. */
export interface AzureClientOptions extends ClientOptions {
  /**
   * Defaults to process.env['OPENAI_API_VERSION'].
   */
  apiVersion?: string | undefined;

  /**
   * Your Azure endpoint, including the resource, e.g. `https://example-resource.azure.openai.com/`
   */
  endpoint?: string | undefined;

  /**
   * A model deployment, if given, sets the base client URL to include `/deployments/{deployment}`.
   * Note: this means you won't be able to use non-deployment endpoints. Not supported with Assistants APIs.
   */
  deployment?: string | undefined;

  /**
   * Defaults to process.env['AZURE_OPENAI_API_KEY'].
   */
  apiKey?: string | undefined;

  /**
   * A function that returns an access token for Microsoft Entra (formerly known as Azure Active Directory),
   * which will be invoked on every request.
   */
  azureADTokenProvider?: (() => Promise<string>) | undefined;
}

/** API Client for interfacing with the Azure OpenAI API. */
export class AzureOpenAI extends OpenAI {
  private _azureADTokenProvider: (() => Promise<string>) | undefined;
  private _deployment: string | undefined;
  apiVersion: string = '';
  /**
   * API Client for interfacing with the Azure OpenAI API.
   *
   * @param {string | undefined} [opts.apiVersion=process.env['OPENAI_API_VERSION'] ?? undefined]
   * @param {string | undefined} [opts.endpoint=process.env['AZURE_OPENAI_ENDPOINT'] ?? undefined] - Your Azure endpoint, including the resource, e.g. `https://example-resource.azure.openai.com/`
   * @param {string | undefined} [opts.apiKey=process.env['AZURE_OPENAI_API_KEY'] ?? undefined]
   * @param {string | undefined} opts.deployment - A model deployment, if given, sets the base client URL to include `/deployments/{deployment}`.
   * @param {string | null | undefined} [opts.organization=process.env['OPENAI_ORG_ID'] ?? null]
   * @param {string} [opts.baseURL=process.env['OPENAI_BASE_URL']] - Sets the base URL for the API, e.g. `https://example-resource.azure.openai.com/openai/`.
   * @param {number} [opts.timeout=10 minutes] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
   * @param {number} [opts.httpAgent] - An HTTP agent used to manage HTTP(s) connections.
   * @param {Core.Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
   * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
   * @param {Core.Headers} opts.defaultHeaders - Default headers to include with every request to the API.
   * @param {Core.DefaultQuery} opts.defaultQuery - Default query parameters to include with every request to the API.
   * @param {boolean} [opts.dangerouslyAllowBrowser=false] - By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
   */
  constructor({
    baseURL = Core.readEnv('OPENAI_BASE_URL'),
    apiKey = Core.readEnv('AZURE_OPENAI_API_KEY'),
    apiVersion = Core.readEnv('OPENAI_API_VERSION'),
    endpoint,
    deployment,
    azureADTokenProvider,
    dangerouslyAllowBrowser,
    ...opts
  }: AzureClientOptions = {}) {
    if (!apiVersion) {
      throw new Errors.OpenAIError(
        "The OPENAI_API_VERSION environment variable is missing or empty; either provide it, or instantiate the AzureOpenAI client with an apiVersion option, like new AzureOpenAI({ apiVersion: 'My API Version' }).",
      );
    }

    if (typeof azureADTokenProvider === 'function') {
      dangerouslyAllowBrowser = true;
    }

    if (!azureADTokenProvider && !apiKey) {
      throw new Errors.OpenAIError(
        'Missing credentials. Please pass one of `apiKey` and `azureADTokenProvider`, or set the `AZURE_OPENAI_API_KEY` environment variable.',
      );
    }

    if (azureADTokenProvider && apiKey) {
      throw new Errors.OpenAIError(
        'The `apiKey` and `azureADTokenProvider` arguments are mutually exclusive; only one can be passed at a time.',
      );
    }

    // define a sentinel value to avoid any typing issues
    apiKey ??= API_KEY_SENTINEL;

    opts.defaultQuery = { ...opts.defaultQuery, 'api-version': apiVersion };

    if (!baseURL) {
      if (!endpoint) {
        endpoint = process.env['AZURE_OPENAI_ENDPOINT'];
      }

      if (!endpoint) {
        throw new Errors.OpenAIError(
          'Must provide one of the `baseURL` or `endpoint` arguments, or the `AZURE_OPENAI_ENDPOINT` environment variable',
        );
      }

      baseURL = `${endpoint}/openai`;
    } else {
      if (endpoint) {
        throw new Errors.OpenAIError('baseURL and endpoint are mutually exclusive');
      }
    }

    super({
      apiKey,
      baseURL,
      ...opts,
      ...(dangerouslyAllowBrowser !== undefined ? { dangerouslyAllowBrowser } : {}),
    });

    this._azureADTokenProvider = azureADTokenProvider;
    this.apiVersion = apiVersion;
    this._deployment = deployment;
  }

  override buildRequest(options: Core.FinalRequestOptions<unknown>): {
    req: RequestInit;
    url: string;
    timeout: number;
  } {
    if (_deployments_endpoints.has(options.path) && options.method === 'post' && options.body !== undefined) {
      if (!Core.isObj(options.body)) {
        throw new Error('Expected request body to be an object');
      }
      const model = this._deployment || options.body['model'];
      if (model !== undefined && !this.baseURL.includes('/deployments')) {
        options.path = `/deployments/${model}${options.path}`;
      }
    }
    return super.buildRequest(options);
  }

  private async _getAzureADToken(): Promise<string | undefined> {
    if (typeof this._azureADTokenProvider === 'function') {
      const token = await this._azureADTokenProvider();
      if (!token || typeof token !== 'string') {
        throw new Errors.OpenAIError(
          `Expected 'azureADTokenProvider' argument to return a string but it returned ${token}`,
        );
      }
      return token;
    }
    return undefined;
  }

  protected override authHeaders(opts: Core.FinalRequestOptions): Core.Headers {
    return {};
  }

  protected override async prepareOptions(opts: Core.FinalRequestOptions<unknown>): Promise<void> {
    /**
     * The user should provide a bearer token provider if they want
     * to use Azure AD authentication. The user shouldn't set the
     * Authorization header manually because the header is overwritten
     * with the Azure AD token if a bearer token provider is provided.
     */
    if (opts.headers?.['api-key']) {
      return super.prepareOptions(opts);
    }
    const token = await this._getAzureADToken();
    opts.headers ??= {};
    if (token) {
      opts.headers['Authorization'] = `Bearer ${token}`;
    } else if (this.apiKey !== API_KEY_SENTINEL) {
      opts.headers['api-key'] = this.apiKey;
    } else {
      throw new Errors.OpenAIError('Unable to handle auth');
    }
    return super.prepareOptions(opts);
  }
}

const _deployments_endpoints = new Set([
  '/completions',
  '/chat/completions',
  '/embeddings',
  '/audio/transcriptions',
  '/audio/translations',
  '/audio/speech',
  '/images/generations',
]);

const API_KEY_SENTINEL = '<Missing Key>';

// ---------------------- End Azure ----------------------

export { toFile, fileFromPath } from './uploads';
export {
  OpenAIError,
  APIError,
  APIConnectionError,
  APIConnectionTimeoutError,
  APIUserAbortError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  BadRequestError,
  AuthenticationError,
  InternalServerError,
  PermissionDeniedError,
  UnprocessableEntityError,
} from './error';

export default OpenAI;
