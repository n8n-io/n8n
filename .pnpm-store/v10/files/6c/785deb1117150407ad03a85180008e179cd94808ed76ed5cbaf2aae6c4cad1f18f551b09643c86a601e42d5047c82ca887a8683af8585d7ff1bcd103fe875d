// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import * as Errors from "./error.js";
import * as Uploads from "./uploads.js";
import { type Agent } from "./_shims/index.js";
import * as Core from "./core.js";
import * as API from "./resources/index.js";

export interface ClientOptions {
  /**
   * Defaults to process.env['ANTHROPIC_API_KEY'].
   */
  apiKey?: string | null | undefined;

  /**
   * Defaults to process.env['ANTHROPIC_AUTH_TOKEN'].
   */
  authToken?: string | null | undefined;

  /**
   * Override the default base URL for the API, e.g., "https://api.example.com/v2/"
   *
   * Defaults to process.env['ANTHROPIC_BASE_URL'].
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
 * API Client for interfacing with the Anthropic API.
 */
export class Anthropic extends Core.APIClient {
  apiKey: string | null;
  authToken: string | null;

  private _options: ClientOptions;

  /**
   * API Client for interfacing with the Anthropic API.
   *
   * @param {string | null | undefined} [opts.apiKey=process.env['ANTHROPIC_API_KEY'] ?? null]
   * @param {string | null | undefined} [opts.authToken=process.env['ANTHROPIC_AUTH_TOKEN'] ?? null]
   * @param {string} [opts.baseURL=process.env['ANTHROPIC_BASE_URL'] ?? https://api.anthropic.com] - Override the default base URL for the API.
   * @param {number} [opts.timeout=10 minutes] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
   * @param {number} [opts.httpAgent] - An HTTP agent used to manage HTTP(s) connections.
   * @param {Core.Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
   * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
   * @param {Core.Headers} opts.defaultHeaders - Default headers to include with every request to the API.
   * @param {Core.DefaultQuery} opts.defaultQuery - Default query parameters to include with every request to the API.
   * @param {boolean} [opts.dangerouslyAllowBrowser=false] - By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
   */
  constructor({
    baseURL = Core.readEnv('ANTHROPIC_BASE_URL'),
    apiKey = Core.readEnv('ANTHROPIC_API_KEY') ?? null,
    authToken = Core.readEnv('ANTHROPIC_AUTH_TOKEN') ?? null,
    ...opts
  }: ClientOptions = {}) {
    const options: ClientOptions = {
      apiKey,
      authToken,
      ...opts,
      baseURL: baseURL || `https://api.anthropic.com`,
    };

    if (!options.dangerouslyAllowBrowser && Core.isRunningInBrowser()) {
      throw new Errors.AnthropicError(
        "It looks like you're running in a browser-like environment.\n\nThis is disabled by default, as it risks exposing your secret API credentials to attackers.\nIf you understand the risks and have appropriate mitigations in place,\nyou can set the `dangerouslyAllowBrowser` option to `true`, e.g.,\n\nnew Anthropic({ apiKey, dangerouslyAllowBrowser: true });\n\nTODO: link!\n",
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
    this.authToken = authToken;
  }

  completions: API.Completions = new API.Completions(this);
  messages: API.Messages = new API.Messages(this);
  beta: API.Beta = new API.Beta(this);

  protected override defaultQuery(): Core.DefaultQuery | undefined {
    return this._options.defaultQuery;
  }

  protected override defaultHeaders(opts: Core.FinalRequestOptions): Core.Headers {
    return {
      ...super.defaultHeaders(opts),
      ...(this._options.dangerouslyAllowBrowser ?
        { 'anthropic-dangerous-direct-browser-access': 'true' }
      : undefined),
      'anthropic-version': '2023-06-01',
      ...this._options.defaultHeaders,
    };
  }

  protected override validateHeaders(headers: Core.Headers, customHeaders: Core.Headers) {
    if (this.apiKey && headers['x-api-key']) {
      return;
    }
    if (customHeaders['x-api-key'] === null) {
      return;
    }

    if (this.authToken && headers['authorization']) {
      return;
    }
    if (customHeaders['authorization'] === null) {
      return;
    }

    throw new Error(
      'Could not resolve authentication method. Expected either apiKey or authToken to be set. Or for one of the "X-Api-Key" or "Authorization" headers to be explicitly omitted',
    );
  }

  protected override authHeaders(opts: Core.FinalRequestOptions): Core.Headers {
    const apiKeyAuth = this.apiKeyAuth(opts);
    const bearerAuth = this.bearerAuth(opts);

    if (apiKeyAuth != null && !Core.isEmptyObj(apiKeyAuth)) {
      return apiKeyAuth;
    }

    if (bearerAuth != null && !Core.isEmptyObj(bearerAuth)) {
      return bearerAuth;
    }
    return {};
  }

  protected apiKeyAuth(opts: Core.FinalRequestOptions): Core.Headers {
    if (this.apiKey == null) {
      return {};
    }
    return { 'X-Api-Key': this.apiKey };
  }

  protected bearerAuth(opts: Core.FinalRequestOptions): Core.Headers {
    if (this.authToken == null) {
      return {};
    }
    return { Authorization: `Bearer ${this.authToken}` };
  }

  static Anthropic = this;
  static HUMAN_PROMPT = '\n\nHuman:';
  static AI_PROMPT = '\n\nAssistant:';
  static DEFAULT_TIMEOUT = 600000; // 10 minutes

  static AnthropicError = Errors.AnthropicError;
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

export const { HUMAN_PROMPT, AI_PROMPT } = Anthropic;

export const {
  AnthropicError,
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
} = Errors;

export import toFile = Uploads.toFile;
export import fileFromPath = Uploads.fileFromPath;

export namespace Anthropic {
  export import RequestOptions = Core.RequestOptions;

  export import Completions = API.Completions;
  export import Completion = API.Completion;
  export import CompletionCreateParams = API.CompletionCreateParams;
  export import CompletionCreateParamsNonStreaming = API.CompletionCreateParamsNonStreaming;
  export import CompletionCreateParamsStreaming = API.CompletionCreateParamsStreaming;

  export import Messages = API.Messages;
  export import ContentBlock = API.ContentBlock;
  export import ContentBlockDeltaEvent = API.ContentBlockDeltaEvent;
  export import ContentBlockStartEvent = API.ContentBlockStartEvent;
  export import ContentBlockStopEvent = API.ContentBlockStopEvent;
  export import ImageBlockParam = API.ImageBlockParam;
  export import InputJSONDelta = API.InputJSONDelta;
  export import Message = API.Message;
  export import MessageDeltaEvent = API.MessageDeltaEvent;
  export import MessageDeltaUsage = API.MessageDeltaUsage;
  export import MessageParam = API.MessageParam;
  export import MessageStartEvent = API.MessageStartEvent;
  export import MessageStopEvent = API.MessageStopEvent;
  export import MessageStreamEvent = API.MessageStreamEvent;
  export import Model = API.Model;
  export import RawContentBlockDeltaEvent = API.RawContentBlockDeltaEvent;
  export import RawContentBlockStartEvent = API.RawContentBlockStartEvent;
  export import RawContentBlockStopEvent = API.RawContentBlockStopEvent;
  export import RawMessageDeltaEvent = API.RawMessageDeltaEvent;
  export import RawMessageStartEvent = API.RawMessageStartEvent;
  export import RawMessageStopEvent = API.RawMessageStopEvent;
  export import RawMessageStreamEvent = API.RawMessageStreamEvent;
  export import TextBlock = API.TextBlock;
  export import TextBlockParam = API.TextBlockParam;
  export import TextDelta = API.TextDelta;
  export import Tool = API.Tool;
  export import ToolResultBlockParam = API.ToolResultBlockParam;
  export import ToolUseBlock = API.ToolUseBlock;
  export import ToolUseBlockParam = API.ToolUseBlockParam;
  export import Usage = API.Usage;
  export import MessageCreateParams = API.MessageCreateParams;
  export import MessageCreateParamsNonStreaming = API.MessageCreateParamsNonStreaming;
  export import MessageCreateParamsStreaming = API.MessageCreateParamsStreaming;
  export import MessageStreamParams = API.MessageStreamParams;

  export import Beta = API.Beta;
}

export default Anthropic;
