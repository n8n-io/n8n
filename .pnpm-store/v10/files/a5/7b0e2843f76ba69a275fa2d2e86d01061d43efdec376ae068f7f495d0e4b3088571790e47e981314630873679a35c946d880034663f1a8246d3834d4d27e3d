// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import type { RequestInit, RequestInfo, BodyInit } from './internal/builtin-types';
import type { HTTPMethod, PromiseOrValue, MergedRequestInit, FinalizedRequestInit } from './internal/types';
import { uuid4 } from './internal/utils/uuid';
import { validatePositiveInteger, isAbsoluteURL, safeJSON } from './internal/utils/values';
import { sleep } from './internal/utils/sleep';
export type { Logger, LogLevel } from './internal/utils/log';
import { castToError, isAbortError } from './internal/errors';
import type { APIResponseProps } from './internal/parse';
import { getPlatformHeaders } from './internal/detect-platform';
import * as Shims from './internal/shims';
import * as Opts from './internal/request-options';
import { VERSION } from './version';
import * as Errors from './core/error';
import * as Pagination from './core/pagination';
import {
  type PageParams,
  PageResponse,
  type PageCursorParams,
  PageCursorResponse,
  type TokenPageParams,
  TokenPageResponse,
} from './core/pagination';
import * as Uploads from './core/uploads';
import * as API from './resources/index';
import { APIPromise } from './core/api-promise';
import {
  Completion,
  CompletionCreateParams,
  CompletionCreateParamsNonStreaming,
  CompletionCreateParamsStreaming,
  Completions,
} from './resources/completions';
import { ModelInfo, ModelInfosPage, ModelListParams, ModelRetrieveParams, Models } from './resources/models';
import {
  AnthropicBeta,
  Beta,
  BetaAPIError,
  BetaAuthenticationError,
  BetaBillingError,
  BetaError,
  BetaErrorResponse,
  BetaGatewayTimeoutError,
  BetaInvalidRequestError,
  BetaNotFoundError,
  BetaOverloadedError,
  BetaPermissionError,
  BetaRateLimitError,
} from './resources/beta/beta';
import {
  Base64ImageSource,
  Base64PDFSource,
  CacheControlEphemeral,
  CacheCreation,
  CitationCharLocation,
  CitationCharLocationParam,
  CitationContentBlockLocation,
  CitationContentBlockLocationParam,
  CitationPageLocation,
  CitationPageLocationParam,
  CitationSearchResultLocationParam,
  CitationWebSearchResultLocationParam,
  CitationsConfigParam,
  CitationsDelta,
  CitationsSearchResultLocation,
  CitationsWebSearchResultLocation,
  ContentBlock,
  ContentBlockDeltaEvent,
  ContentBlockParam,
  ContentBlockStartEvent,
  ContentBlockStopEvent,
  ContentBlockSource,
  ContentBlockSourceContent,
  DocumentBlockParam,
  ImageBlockParam,
  InputJSONDelta,
  Message,
  MessageStreamParams,
  MessageCountTokensParams,
  MessageCountTokensTool,
  MessageCreateParams,
  MessageCreateParamsNonStreaming,
  MessageCreateParamsStreaming,
  MessageDeltaEvent,
  MessageDeltaUsage,
  MessageParam,
  MessageStartEvent,
  MessageStopEvent,
  MessageStreamEvent,
  MessageTokensCount,
  Messages,
  Metadata,
  Model,
  PlainTextSource,
  RawContentBlockDelta,
  RawContentBlockDeltaEvent,
  RawContentBlockStartEvent,
  RawContentBlockStopEvent,
  RawMessageDeltaEvent,
  RawMessageStartEvent,
  RawMessageStopEvent,
  RawMessageStreamEvent,
  RedactedThinkingBlock,
  RedactedThinkingBlockParam,
  SearchResultBlockParam,
  ServerToolUsage,
  ServerToolUseBlock,
  ServerToolUseBlockParam,
  SignatureDelta,
  StopReason,
  TextBlock,
  TextBlockParam,
  TextCitation,
  TextCitationParam,
  TextDelta,
  ThinkingBlock,
  ThinkingBlockParam,
  ThinkingConfigDisabled,
  ThinkingConfigEnabled,
  ThinkingConfigParam,
  ThinkingDelta,
  Tool,
  ToolBash20250124,
  ToolChoice,
  ToolChoiceAny,
  ToolChoiceAuto,
  ToolChoiceNone,
  ToolChoiceTool,
  ToolResultBlockParam,
  ToolTextEditor20250124,
  ToolTextEditor20250429,
  ToolTextEditor20250728,
  ToolUnion,
  ToolUseBlock,
  ToolUseBlockParam,
  URLImageSource,
  URLPDFSource,
  Usage,
  WebSearchResultBlock,
  WebSearchResultBlockParam,
  WebSearchTool20250305,
  WebSearchToolRequestError,
  WebSearchToolResultBlock,
  WebSearchToolResultBlockContent,
  WebSearchToolResultBlockParam,
  WebSearchToolResultBlockParamContent,
  WebSearchToolResultError,
} from './resources/messages/messages';
import { type Fetch } from './internal/builtin-types';
import { isRunningInBrowser } from './internal/detect-platform';
import { HeadersLike, NullableHeaders, buildHeaders } from './internal/headers';
import { FinalRequestOptions, RequestOptions } from './internal/request-options';
import { readEnv } from './internal/utils/env';
import {
  type LogLevel,
  type Logger,
  formatRequestDetails,
  loggerFor,
  parseLogLevel,
} from './internal/utils/log';
import { isEmptyObj } from './internal/utils/values';

export type ApiKeySetter = () => Promise<string>;

export interface ClientOptions {
  /**
   * API key used for authentication.
   *
   * - Accepts either a static string or an async function that resolves to a string.
   * - Defaults to process.env['ANTHROPIC_API_KEY'].
   * - When a function is provided, it is invoked before each request so you can rotate
   *   or refresh credentials at runtime.
   * - The function must return a non-empty string; otherwise an AnthropicError is thrown.
   * - If the function throws, the error is wrapped in an AnthropicError with the original
   *   error available as `cause`.
   */
  apiKey?: string | ApiKeySetter | null | undefined;

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
   *
   * @unit milliseconds
   */
  timeout?: number | undefined;
  /**
   * Additional `RequestInit` options to be passed to `fetch` calls.
   * Properties will be overridden by per-request `fetchOptions`.
   */
  fetchOptions?: MergedRequestInit | undefined;

  /**
   * Specify a custom `fetch` function implementation.
   *
   * If not provided, we expect that `fetch` is defined globally.
   */
  fetch?: Fetch | undefined;

  /**
   * The maximum number of times that the client will retry a request in case of a
   * temporary failure, like a network error or a 5XX error from the server.
   *
   * @default 2
   */
  maxRetries?: number | undefined;

  /**
   * Default headers to include with every request to the API.
   *
   * These can be removed in individual requests by explicitly setting the
   * header to `null` in request options.
   */
  defaultHeaders?: HeadersLike | undefined;

  /**
   * Default query parameters to include with every request to the API.
   *
   * These can be removed in individual requests by explicitly setting the
   * param to `undefined` in request options.
   */
  defaultQuery?: Record<string, string | undefined> | undefined;

  /**
   * By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
   * Only set this option to `true` if you understand the risks and have appropriate mitigations in place.
   */
  dangerouslyAllowBrowser?: boolean | undefined;

  /**
   * Set the log level.
   *
   * Defaults to process.env['ANTHROPIC_LOG'] or 'warn' if it isn't set.
   */
  logLevel?: LogLevel | undefined;

  /**
   * Set the logger.
   *
   * Defaults to globalThis.console.
   */
  logger?: Logger | undefined;
}

export const HUMAN_PROMPT = '\\n\\nHuman:';
export const AI_PROMPT = '\\n\\nAssistant:';

/**
 * Base class for Anthropic API clients.
 */
export class BaseAnthropic {
  apiKey: string | null;
  authToken: string | null;

  baseURL: string;
  maxRetries: number;
  timeout: number;
  logger: Logger;
  logLevel: LogLevel | undefined;
  fetchOptions: MergedRequestInit | undefined;

  private fetch: Fetch;
  #encoder: Opts.RequestEncoder;
  protected idempotencyHeader?: string;
  protected _options: ClientOptions;

  /**
   * API Client for interfacing with the Anthropic API.
   *
   * @param {string | null | undefined} [opts.apiKey=process.env['ANTHROPIC_API_KEY'] ?? null]
   * @param {string | null | undefined} [opts.authToken=process.env['ANTHROPIC_AUTH_TOKEN'] ?? null]
   * @param {string} [opts.baseURL=process.env['ANTHROPIC_BASE_URL'] ?? https://api.anthropic.com] - Override the default base URL for the API.
   * @param {number} [opts.timeout=10 minutes] - The maximum amount of time (in milliseconds) the client will wait for a response before timing out.
   * @param {MergedRequestInit} [opts.fetchOptions] - Additional `RequestInit` options to be passed to `fetch` calls.
   * @param {Fetch} [opts.fetch] - Specify a custom `fetch` function implementation.
   * @param {number} [opts.maxRetries=2] - The maximum number of times the client will retry a request.
   * @param {HeadersLike} opts.defaultHeaders - Default headers to include with every request to the API.
   * @param {Record<string, string | undefined>} opts.defaultQuery - Default query parameters to include with every request to the API.
   * @param {boolean} [opts.dangerouslyAllowBrowser=false] - By default, client-side use of this library is not allowed, as it risks exposing your secret API credentials to attackers.
   */
  constructor({
    baseURL = readEnv('ANTHROPIC_BASE_URL'),
    apiKey = readEnv('ANTHROPIC_API_KEY') ?? null,
    authToken = readEnv('ANTHROPIC_AUTH_TOKEN') ?? null,
    ...opts
  }: ClientOptions = {}) {
    const options: ClientOptions = {
      apiKey,
      authToken,
      ...opts,
      baseURL: baseURL || `https://api.anthropic.com`,
    };

    if (!options.dangerouslyAllowBrowser && isRunningInBrowser()) {
      throw new Errors.AnthropicError(
        "It looks like you're running in a browser-like environment.\n\nThis is disabled by default, as it risks exposing your secret API credentials to attackers.\nIf you understand the risks and have appropriate mitigations in place,\nyou can set the `dangerouslyAllowBrowser` option to `true`, e.g.,\n\nnew Anthropic({ apiKey, dangerouslyAllowBrowser: true });\n",
      );
    }

    this.baseURL = options.baseURL!;
    this.timeout = options.timeout ?? BaseAnthropic.DEFAULT_TIMEOUT /* 10 minutes */;
    this.logger = options.logger ?? console;
    const defaultLogLevel = 'warn';
    // Set default logLevel early so that we can log a warning in parseLogLevel.
    this.logLevel = defaultLogLevel;
    this.logLevel =
      parseLogLevel(options.logLevel, 'ClientOptions.logLevel', this) ??
      parseLogLevel(readEnv('ANTHROPIC_LOG'), "process.env['ANTHROPIC_LOG']", this) ??
      defaultLogLevel;
    this.fetchOptions = options.fetchOptions;
    this.maxRetries = options.maxRetries ?? 2;
    this.fetch = options.fetch ?? Shims.getDefaultFetch();
    this.#encoder = Opts.FallbackEncoder;

    this._options = options;

    this.apiKey = typeof apiKey === 'string' ? apiKey : null;
    this.authToken = authToken;
  }

  /**
   * Create a new client instance re-using the same options given to the current client with optional overriding.
   */
  withOptions(options: Partial<ClientOptions>): this {
    const client = new (this.constructor as any as new (props: ClientOptions) => typeof this)({
      ...this._options,
      baseURL: this.baseURL,
      maxRetries: this.maxRetries,
      timeout: this.timeout,
      logger: this.logger,
      logLevel: this.logLevel,
      fetch: this.fetch,
      fetchOptions: this.fetchOptions,
      apiKey: this.apiKey,
      authToken: this.authToken,
      ...options,
    });
    return client;
  }

  /**
   * Check whether the base URL is set to its default.
   */
  #baseURLOverridden(): boolean {
    return this.baseURL !== 'https://api.anthropic.com';
  }

  protected defaultQuery(): Record<string, string | undefined> | undefined {
    return this._options.defaultQuery;
  }

  protected validateHeaders({ values, nulls }: NullableHeaders) {
    if (values.get('x-api-key') || values.get('authorization')) {
      return;
    }

    if (this.apiKey && values.get('x-api-key')) {
      return;
    }
    if (nulls.has('x-api-key')) {
      return;
    }

    if (this.authToken && values.get('authorization')) {
      return;
    }
    if (nulls.has('authorization')) {
      return;
    }

    throw new Error(
      'Could not resolve authentication method. Expected either apiKey or authToken to be set. Or for one of the "X-Api-Key" or "Authorization" headers to be explicitly omitted',
    );
  }

  protected async authHeaders(opts: FinalRequestOptions): Promise<NullableHeaders | undefined> {
    return buildHeaders([await this.apiKeyAuth(opts), await this.bearerAuth(opts)]);
  }

  protected async apiKeyAuth(opts: FinalRequestOptions): Promise<NullableHeaders | undefined> {
    if (this.apiKey == null) {
      return undefined;
    }
    return buildHeaders([{ 'X-Api-Key': this.apiKey }]);
  }

  protected async bearerAuth(opts: FinalRequestOptions): Promise<NullableHeaders | undefined> {
    if (this.authToken == null) {
      return undefined;
    }
    return buildHeaders([{ Authorization: `Bearer ${this.authToken}` }]);
  }

  /**
   * Basic re-implementation of `qs.stringify` for primitive types.
   */
  protected stringifyQuery(query: Record<string, unknown>): string {
    return Object.entries(query)
      .filter(([_, value]) => typeof value !== 'undefined')
      .map(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
        }
        if (value === null) {
          return `${encodeURIComponent(key)}=`;
        }
        throw new Errors.AnthropicError(
          `Cannot stringify type ${typeof value}; Expected string, number, boolean, or null. If you need to pass nested query parameters, you can manually encode them, e.g. { query: { 'foo[key1]': value1, 'foo[key2]': value2 } }, and please open a GitHub issue requesting better support for your use case.`,
        );
      })
      .join('&');
  }

  private getUserAgent(): string {
    return `${this.constructor.name}/JS ${VERSION}`;
  }

  protected defaultIdempotencyKey(): string {
    return `stainless-node-retry-${uuid4()}`;
  }

  protected makeStatusError(
    status: number,
    error: Object,
    message: string | undefined,
    headers: Headers,
  ): Errors.APIError {
    return Errors.APIError.generate(status, error, message, headers);
  }

  buildURL(
    path: string,
    query: Record<string, unknown> | null | undefined,
    defaultBaseURL?: string | undefined,
  ): string {
    const baseURL = (!this.#baseURLOverridden() && defaultBaseURL) || this.baseURL;
    const url =
      isAbsoluteURL(path) ?
        new URL(path)
      : new URL(baseURL + (baseURL.endsWith('/') && path.startsWith('/') ? path.slice(1) : path));

    const defaultQuery = this.defaultQuery();
    if (!isEmptyObj(defaultQuery)) {
      query = { ...defaultQuery, ...query };
    }

    if (typeof query === 'object' && query && !Array.isArray(query)) {
      url.search = this.stringifyQuery(query as Record<string, unknown>);
    }

    return url.toString();
  }

  _calculateNonstreamingTimeout(maxTokens: number): number {
    const defaultTimeout = 10 * 60;
    const expectedTimeout = (60 * 60 * maxTokens) / 128_000;
    if (expectedTimeout > defaultTimeout) {
      throw new Errors.AnthropicError(
        'Streaming is required for operations that may take longer than 10 minutes. ' +
          'See https://github.com/anthropics/anthropic-sdk-typescript#streaming-responses for more details',
      );
    }
    return defaultTimeout * 1000;
  }

  /**
   * Used as a callback for mutating the given `FinalRequestOptions` object.
   */
  protected async prepareOptions(options: FinalRequestOptions): Promise<void> {}

  /**
   * Used as a callback for mutating the given `RequestInit` object.
   *
   * This is useful for cases where you want to add certain headers based off of
   * the request properties, e.g. `method` or `url`.
   */
  protected async prepareRequest(
    request: RequestInit,
    { url, options }: { url: string; options: FinalRequestOptions },
  ): Promise<void> {}

  get<Rsp>(path: string, opts?: PromiseOrValue<RequestOptions>): APIPromise<Rsp> {
    return this.methodRequest('get', path, opts);
  }

  post<Rsp>(path: string, opts?: PromiseOrValue<RequestOptions>): APIPromise<Rsp> {
    return this.methodRequest('post', path, opts);
  }

  patch<Rsp>(path: string, opts?: PromiseOrValue<RequestOptions>): APIPromise<Rsp> {
    return this.methodRequest('patch', path, opts);
  }

  put<Rsp>(path: string, opts?: PromiseOrValue<RequestOptions>): APIPromise<Rsp> {
    return this.methodRequest('put', path, opts);
  }

  delete<Rsp>(path: string, opts?: PromiseOrValue<RequestOptions>): APIPromise<Rsp> {
    return this.methodRequest('delete', path, opts);
  }

  private methodRequest<Rsp>(
    method: HTTPMethod,
    path: string,
    opts?: PromiseOrValue<RequestOptions>,
  ): APIPromise<Rsp> {
    return this.request(
      Promise.resolve(opts).then((opts) => {
        return { method, path, ...opts };
      }),
    );
  }

  request<Rsp>(
    options: PromiseOrValue<FinalRequestOptions>,
    remainingRetries: number | null = null,
  ): APIPromise<Rsp> {
    return new APIPromise(this, this.makeRequest(options, remainingRetries, undefined));
  }

  private async makeRequest(
    optionsInput: PromiseOrValue<FinalRequestOptions>,
    retriesRemaining: number | null,
    retryOfRequestLogID: string | undefined,
  ): Promise<APIResponseProps> {
    const options = await optionsInput;
    const maxRetries = options.maxRetries ?? this.maxRetries;
    if (retriesRemaining == null) {
      retriesRemaining = maxRetries;
    }

    await this.prepareOptions(options);

    const { req, url, timeout } = await this.buildRequest(options, {
      retryCount: maxRetries - retriesRemaining,
    });

    await this.prepareRequest(req, { url, options });

    /** Not an API request ID, just for correlating local log entries. */
    const requestLogID = 'log_' + ((Math.random() * (1 << 24)) | 0).toString(16).padStart(6, '0');
    const retryLogStr = retryOfRequestLogID === undefined ? '' : `, retryOf: ${retryOfRequestLogID}`;
    const startTime = Date.now();

    loggerFor(this).debug(
      `[${requestLogID}] sending request`,
      formatRequestDetails({
        retryOfRequestLogID,
        method: options.method,
        url,
        options,
        headers: req.headers,
      }),
    );

    if (options.signal?.aborted) {
      throw new Errors.APIUserAbortError();
    }

    const controller = new AbortController();
    const response = await this.fetchWithTimeout(url, req, timeout, controller).catch(castToError);
    const headersTime = Date.now();

    if (response instanceof globalThis.Error) {
      const retryMessage = `retrying, ${retriesRemaining} attempts remaining`;
      if (options.signal?.aborted) {
        throw new Errors.APIUserAbortError();
      }
      // detect native connection timeout errors
      // deno throws "TypeError: error sending request for url (https://example/): client error (Connect): tcp connect error: Operation timed out (os error 60): Operation timed out (os error 60)"
      // undici throws "TypeError: fetch failed" with cause "ConnectTimeoutError: Connect Timeout Error (attempted address: example:443, timeout: 1ms)"
      // others do not provide enough information to distinguish timeouts from other connection errors
      const isTimeout =
        isAbortError(response) ||
        /timed? ?out/i.test(String(response) + ('cause' in response ? String(response.cause) : ''));
      if (retriesRemaining) {
        loggerFor(this).info(
          `[${requestLogID}] connection ${isTimeout ? 'timed out' : 'failed'} - ${retryMessage}`,
        );
        loggerFor(this).debug(
          `[${requestLogID}] connection ${isTimeout ? 'timed out' : 'failed'} (${retryMessage})`,
          formatRequestDetails({
            retryOfRequestLogID,
            url,
            durationMs: headersTime - startTime,
            message: response.message,
          }),
        );
        return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID);
      }
      loggerFor(this).info(
        `[${requestLogID}] connection ${isTimeout ? 'timed out' : 'failed'} - error; no more retries left`,
      );
      loggerFor(this).debug(
        `[${requestLogID}] connection ${isTimeout ? 'timed out' : 'failed'} (error; no more retries left)`,
        formatRequestDetails({
          retryOfRequestLogID,
          url,
          durationMs: headersTime - startTime,
          message: response.message,
        }),
      );
      if (isTimeout) {
        throw new Errors.APIConnectionTimeoutError();
      }
      throw new Errors.APIConnectionError({ cause: response });
    }

    const specialHeaders = [...response.headers.entries()]
      .filter(([name]) => name === 'request-id')
      .map(([name, value]) => ', ' + name + ': ' + JSON.stringify(value))
      .join('');
    const responseInfo = `[${requestLogID}${retryLogStr}${specialHeaders}] ${req.method} ${url} ${
      response.ok ? 'succeeded' : 'failed'
    } with status ${response.status} in ${headersTime - startTime}ms`;

    if (!response.ok) {
      const shouldRetry = await this.shouldRetry(response);
      if (retriesRemaining && shouldRetry) {
        const retryMessage = `retrying, ${retriesRemaining} attempts remaining`;

        // We don't need the body of this response.
        await Shims.CancelReadableStream(response.body);
        loggerFor(this).info(`${responseInfo} - ${retryMessage}`);
        loggerFor(this).debug(
          `[${requestLogID}] response error (${retryMessage})`,
          formatRequestDetails({
            retryOfRequestLogID,
            url: response.url,
            status: response.status,
            headers: response.headers,
            durationMs: headersTime - startTime,
          }),
        );
        return this.retryRequest(
          options,
          retriesRemaining,
          retryOfRequestLogID ?? requestLogID,
          response.headers,
        );
      }

      const retryMessage = shouldRetry ? `error; no more retries left` : `error; not retryable`;

      loggerFor(this).info(`${responseInfo} - ${retryMessage}`);

      const errText = await response.text().catch((err: any) => castToError(err).message);
      const errJSON = safeJSON(errText);
      const errMessage = errJSON ? undefined : errText;

      loggerFor(this).debug(
        `[${requestLogID}] response error (${retryMessage})`,
        formatRequestDetails({
          retryOfRequestLogID,
          url: response.url,
          status: response.status,
          headers: response.headers,
          message: errMessage,
          durationMs: Date.now() - startTime,
        }),
      );

      const err = this.makeStatusError(response.status, errJSON, errMessage, response.headers);
      throw err;
    }

    loggerFor(this).info(responseInfo);
    loggerFor(this).debug(
      `[${requestLogID}] response start`,
      formatRequestDetails({
        retryOfRequestLogID,
        url: response.url,
        status: response.status,
        headers: response.headers,
        durationMs: headersTime - startTime,
      }),
    );

    return { response, options, controller, requestLogID, retryOfRequestLogID, startTime };
  }

  getAPIList<Item, PageClass extends Pagination.AbstractPage<Item> = Pagination.AbstractPage<Item>>(
    path: string,
    Page: new (...args: any[]) => PageClass,
    opts?: RequestOptions,
  ): Pagination.PagePromise<PageClass, Item> {
    return this.requestAPIList(Page, { method: 'get', path, ...opts });
  }

  requestAPIList<
    Item = unknown,
    PageClass extends Pagination.AbstractPage<Item> = Pagination.AbstractPage<Item>,
  >(
    Page: new (...args: ConstructorParameters<typeof Pagination.AbstractPage>) => PageClass,
    options: FinalRequestOptions,
  ): Pagination.PagePromise<PageClass, Item> {
    const request = this.makeRequest(options, null, undefined);
    return new Pagination.PagePromise<PageClass, Item>(this as any as Anthropic, request, Page);
  }

  async fetchWithTimeout(
    url: RequestInfo,
    init: RequestInit | undefined,
    ms: number,
    controller: AbortController,
  ): Promise<Response> {
    const { signal, method, ...options } = init || {};
    if (signal) signal.addEventListener('abort', () => controller.abort());

    const timeout = setTimeout(() => controller.abort(), ms);

    const isReadableBody =
      ((globalThis as any).ReadableStream && options.body instanceof (globalThis as any).ReadableStream) ||
      (typeof options.body === 'object' && options.body !== null && Symbol.asyncIterator in options.body);

    const fetchOptions: RequestInit = {
      signal: controller.signal as any,
      ...(isReadableBody ? { duplex: 'half' } : {}),
      method: 'GET',
      ...options,
    };
    if (method) {
      // Custom methods like 'patch' need to be uppercased
      // See https://github.com/nodejs/undici/issues/2294
      fetchOptions.method = method.toUpperCase();
    }

    try {
      // use undefined this binding; fetch errors if bound to something else in browser/cloudflare
      return await this.fetch.call(undefined, url, fetchOptions);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async shouldRetry(response: Response): Promise<boolean> {
    // Note this is not a standard header.
    const shouldRetryHeader = response.headers.get('x-should-retry');

    // If the server explicitly says whether or not to retry, obey.
    if (shouldRetryHeader === 'true') return true;
    if (shouldRetryHeader === 'false') return false;

    // Retry on request timeouts.
    if (response.status === 408) return true;

    // Retry on lock timeouts.
    if (response.status === 409) return true;

    // Retry on rate limits.
    if (response.status === 429) return true;

    // Retry internal errors.
    if (response.status >= 500) return true;

    return false;
  }

  private async retryRequest(
    options: FinalRequestOptions,
    retriesRemaining: number,
    requestLogID: string,
    responseHeaders?: Headers | undefined,
  ): Promise<APIResponseProps> {
    let timeoutMillis: number | undefined;

    // Note the `retry-after-ms` header may not be standard, but is a good idea and we'd like proactive support for it.
    const retryAfterMillisHeader = responseHeaders?.get('retry-after-ms');
    if (retryAfterMillisHeader) {
      const timeoutMs = parseFloat(retryAfterMillisHeader);
      if (!Number.isNaN(timeoutMs)) {
        timeoutMillis = timeoutMs;
      }
    }

    // About the Retry-After header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After
    const retryAfterHeader = responseHeaders?.get('retry-after');
    if (retryAfterHeader && !timeoutMillis) {
      const timeoutSeconds = parseFloat(retryAfterHeader);
      if (!Number.isNaN(timeoutSeconds)) {
        timeoutMillis = timeoutSeconds * 1000;
      } else {
        timeoutMillis = Date.parse(retryAfterHeader) - Date.now();
      }
    }

    // If the API asks us to wait a certain amount of time (and it's a reasonable amount),
    // just do what it says, but otherwise calculate a default
    if (!(timeoutMillis && 0 <= timeoutMillis && timeoutMillis < 60 * 1000)) {
      const maxRetries = options.maxRetries ?? this.maxRetries;
      timeoutMillis = this.calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries);
    }
    await sleep(timeoutMillis);

    return this.makeRequest(options, retriesRemaining - 1, requestLogID);
  }

  private calculateDefaultRetryTimeoutMillis(retriesRemaining: number, maxRetries: number): number {
    const initialRetryDelay = 0.5;
    const maxRetryDelay = 8.0;

    const numRetries = maxRetries - retriesRemaining;

    // Apply exponential backoff, but not more than the max.
    const sleepSeconds = Math.min(initialRetryDelay * Math.pow(2, numRetries), maxRetryDelay);

    // Apply some jitter, take up to at most 25 percent of the retry time.
    const jitter = 1 - Math.random() * 0.25;

    return sleepSeconds * jitter * 1000;
  }

  public calculateNonstreamingTimeout(maxTokens: number, maxNonstreamingTokens?: number): number {
    const maxTime = 60 * 60 * 1000; // 60 minutes
    const defaultTime = 60 * 10 * 1000; // 10 minutes

    const expectedTime = (maxTime * maxTokens) / 128000;
    if (expectedTime > defaultTime || (maxNonstreamingTokens != null && maxTokens > maxNonstreamingTokens)) {
      throw new Errors.AnthropicError(
        'Streaming is required for operations that may take longer than 10 minutes. See https://github.com/anthropics/anthropic-sdk-typescript#long-requests for more details',
      );
    }

    return defaultTime;
  }

  async buildRequest(
    inputOptions: FinalRequestOptions,
    { retryCount = 0 }: { retryCount?: number } = {},
  ): Promise<{ req: FinalizedRequestInit; url: string; timeout: number }> {
    const options = { ...inputOptions };
    const { method, path, query, defaultBaseURL } = options;

    const url = this.buildURL(path!, query as Record<string, unknown>, defaultBaseURL);
    if ('timeout' in options) validatePositiveInteger('timeout', options.timeout);
    options.timeout = options.timeout ?? this.timeout;
    const { bodyHeaders, body } = this.buildBody({ options });
    const reqHeaders = await this.buildHeaders({ options: inputOptions, method, bodyHeaders, retryCount });

    const req: FinalizedRequestInit = {
      method,
      headers: reqHeaders,
      ...(options.signal && { signal: options.signal }),
      ...((globalThis as any).ReadableStream &&
        body instanceof (globalThis as any).ReadableStream && { duplex: 'half' }),
      ...(body && { body }),
      ...((this.fetchOptions as any) ?? {}),
      ...((options.fetchOptions as any) ?? {}),
    };

    return { req, url, timeout: options.timeout };
  }

  private async buildHeaders({
    options,
    method,
    bodyHeaders,
    retryCount,
  }: {
    options: FinalRequestOptions;
    method: HTTPMethod;
    bodyHeaders: HeadersLike;
    retryCount: number;
  }): Promise<Headers> {
    let idempotencyHeaders: HeadersLike = {};
    if (this.idempotencyHeader && method !== 'get') {
      if (!options.idempotencyKey) options.idempotencyKey = this.defaultIdempotencyKey();
      idempotencyHeaders[this.idempotencyHeader] = options.idempotencyKey;
    }

    const headers = buildHeaders([
      idempotencyHeaders,
      {
        Accept: 'application/json',
        'User-Agent': this.getUserAgent(),
        'X-Stainless-Retry-Count': String(retryCount),
        ...(options.timeout ? { 'X-Stainless-Timeout': String(Math.trunc(options.timeout / 1000)) } : {}),
        ...getPlatformHeaders(),
        ...(this._options.dangerouslyAllowBrowser ?
          { 'anthropic-dangerous-direct-browser-access': 'true' }
        : undefined),
        'anthropic-version': '2023-06-01',
      },
      await this.authHeaders(options),
      this._options.defaultHeaders,
      bodyHeaders,
      options.headers,
    ]);

    this.validateHeaders(headers);

    return headers.values;
  }

  private buildBody({ options: { body, headers: rawHeaders } }: { options: FinalRequestOptions }): {
    bodyHeaders: HeadersLike;
    body: BodyInit | undefined;
  } {
    if (!body) {
      return { bodyHeaders: undefined, body: undefined };
    }
    const headers = buildHeaders([rawHeaders]);
    if (
      // Pass raw type verbatim
      ArrayBuffer.isView(body) ||
      body instanceof ArrayBuffer ||
      body instanceof DataView ||
      (typeof body === 'string' &&
        // Preserve legacy string encoding behavior for now
        headers.values.has('content-type')) ||
      // `Blob` is superset of `File`
      ((globalThis as any).Blob && body instanceof (globalThis as any).Blob) ||
      // `FormData` -> `multipart/form-data`
      body instanceof FormData ||
      // `URLSearchParams` -> `application/x-www-form-urlencoded`
      body instanceof URLSearchParams ||
      // Send chunked stream (each chunk has own `length`)
      ((globalThis as any).ReadableStream && body instanceof (globalThis as any).ReadableStream)
    ) {
      return { bodyHeaders: undefined, body: body as BodyInit };
    } else if (
      typeof body === 'object' &&
      (Symbol.asyncIterator in body ||
        (Symbol.iterator in body && 'next' in body && typeof body.next === 'function'))
    ) {
      return { bodyHeaders: undefined, body: Shims.ReadableStreamFrom(body as AsyncIterable<Uint8Array>) };
    } else {
      return this.#encoder({ body, headers });
    }
  }

  static Anthropic = this;
  static HUMAN_PROMPT = HUMAN_PROMPT;
  static AI_PROMPT = AI_PROMPT;
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
}

/**
 * API Client for interfacing with the Anthropic API.
 */
export class Anthropic extends BaseAnthropic {
  completions: API.Completions = new API.Completions(this);
  messages: API.Messages = new API.Messages(this);
  models: API.Models = new API.Models(this);
  beta: API.Beta = new API.Beta(this);
}

Anthropic.Completions = Completions;
Anthropic.Messages = Messages;
Anthropic.Models = Models;
Anthropic.Beta = Beta;

export declare namespace Anthropic {
  export type RequestOptions = Opts.RequestOptions;

  export type { ApiKeySetter };

  export import Page = Pagination.Page;
  export { type PageParams as PageParams, type PageResponse as PageResponse };

  export import TokenPage = Pagination.TokenPage;
  export { type TokenPageParams as TokenPageParams, type TokenPageResponse as TokenPageResponse };

  export import PageCursor = Pagination.PageCursor;
  export { type PageCursorParams as PageCursorParams, type PageCursorResponse as PageCursorResponse };

  export {
    Completions as Completions,
    type Completion as Completion,
    type CompletionCreateParams as CompletionCreateParams,
    type CompletionCreateParamsNonStreaming as CompletionCreateParamsNonStreaming,
    type CompletionCreateParamsStreaming as CompletionCreateParamsStreaming,
  };

  export {
    Messages as Messages,
    type Base64ImageSource as Base64ImageSource,
    type Base64PDFSource as Base64PDFSource,
    type CacheControlEphemeral as CacheControlEphemeral,
    type CacheCreation as CacheCreation,
    type CitationCharLocation as CitationCharLocation,
    type CitationCharLocationParam as CitationCharLocationParam,
    type CitationContentBlockLocation as CitationContentBlockLocation,
    type CitationContentBlockLocationParam as CitationContentBlockLocationParam,
    type CitationPageLocation as CitationPageLocation,
    type CitationPageLocationParam as CitationPageLocationParam,
    type CitationSearchResultLocationParam as CitationSearchResultLocationParam,
    type CitationWebSearchResultLocationParam as CitationWebSearchResultLocationParam,
    type CitationsConfigParam as CitationsConfigParam,
    type CitationsDelta as CitationsDelta,
    type CitationsSearchResultLocation as CitationsSearchResultLocation,
    type CitationsWebSearchResultLocation as CitationsWebSearchResultLocation,
    type ContentBlock as ContentBlock,
    type ContentBlockDeltaEvent as ContentBlockDeltaEvent,
    type ContentBlockParam as ContentBlockParam,
    type ContentBlockStartEvent as ContentBlockStartEvent,
    type ContentBlockStopEvent as ContentBlockStopEvent,
    type ContentBlockSource as ContentBlockSource,
    type ContentBlockSourceContent as ContentBlockSourceContent,
    type DocumentBlockParam as DocumentBlockParam,
    type ImageBlockParam as ImageBlockParam,
    type InputJSONDelta as InputJSONDelta,
    type Message as Message,
    type MessageCountTokensTool as MessageCountTokensTool,
    type MessageDeltaEvent as MessageDeltaEvent,
    type MessageDeltaUsage as MessageDeltaUsage,
    type MessageParam as MessageParam,
    type MessageStartEvent as MessageStartEvent,
    type MessageStopEvent as MessageStopEvent,
    type MessageStreamEvent as MessageStreamEvent,
    type MessageTokensCount as MessageTokensCount,
    type Metadata as Metadata,
    type Model as Model,
    type PlainTextSource as PlainTextSource,
    type RawContentBlockDelta as RawContentBlockDelta,
    type RawContentBlockDeltaEvent as RawContentBlockDeltaEvent,
    type RawContentBlockStartEvent as RawContentBlockStartEvent,
    type RawContentBlockStopEvent as RawContentBlockStopEvent,
    type RawMessageDeltaEvent as RawMessageDeltaEvent,
    type RawMessageStartEvent as RawMessageStartEvent,
    type RawMessageStopEvent as RawMessageStopEvent,
    type RawMessageStreamEvent as RawMessageStreamEvent,
    type RedactedThinkingBlock as RedactedThinkingBlock,
    type RedactedThinkingBlockParam as RedactedThinkingBlockParam,
    type SearchResultBlockParam as SearchResultBlockParam,
    type ServerToolUsage as ServerToolUsage,
    type ServerToolUseBlock as ServerToolUseBlock,
    type ServerToolUseBlockParam as ServerToolUseBlockParam,
    type SignatureDelta as SignatureDelta,
    type StopReason as StopReason,
    type TextBlock as TextBlock,
    type TextBlockParam as TextBlockParam,
    type TextCitation as TextCitation,
    type TextCitationParam as TextCitationParam,
    type TextDelta as TextDelta,
    type ThinkingBlock as ThinkingBlock,
    type ThinkingBlockParam as ThinkingBlockParam,
    type ThinkingConfigDisabled as ThinkingConfigDisabled,
    type ThinkingConfigEnabled as ThinkingConfigEnabled,
    type ThinkingConfigParam as ThinkingConfigParam,
    type ThinkingDelta as ThinkingDelta,
    type Tool as Tool,
    type ToolBash20250124 as ToolBash20250124,
    type ToolChoice as ToolChoice,
    type ToolChoiceAny as ToolChoiceAny,
    type ToolChoiceAuto as ToolChoiceAuto,
    type ToolChoiceNone as ToolChoiceNone,
    type ToolChoiceTool as ToolChoiceTool,
    type ToolResultBlockParam as ToolResultBlockParam,
    type ToolTextEditor20250124 as ToolTextEditor20250124,
    type ToolTextEditor20250429 as ToolTextEditor20250429,
    type ToolTextEditor20250728 as ToolTextEditor20250728,
    type ToolUnion as ToolUnion,
    type ToolUseBlock as ToolUseBlock,
    type ToolUseBlockParam as ToolUseBlockParam,
    type URLImageSource as URLImageSource,
    type URLPDFSource as URLPDFSource,
    type Usage as Usage,
    type WebSearchResultBlock as WebSearchResultBlock,
    type WebSearchResultBlockParam as WebSearchResultBlockParam,
    type WebSearchTool20250305 as WebSearchTool20250305,
    type WebSearchToolRequestError as WebSearchToolRequestError,
    type WebSearchToolResultBlock as WebSearchToolResultBlock,
    type WebSearchToolResultBlockContent as WebSearchToolResultBlockContent,
    type WebSearchToolResultBlockParam as WebSearchToolResultBlockParam,
    type WebSearchToolResultBlockParamContent as WebSearchToolResultBlockParamContent,
    type WebSearchToolResultError as WebSearchToolResultError,
    type MessageCreateParams as MessageCreateParams,
    type MessageCreateParamsNonStreaming as MessageCreateParamsNonStreaming,
    type MessageCreateParamsStreaming as MessageCreateParamsStreaming,
    type MessageStreamParams as MessageStreamParams,
    type MessageCountTokensParams as MessageCountTokensParams,
  };

  export {
    Models as Models,
    type ModelInfo as ModelInfo,
    type ModelInfosPage as ModelInfosPage,
    type ModelRetrieveParams as ModelRetrieveParams,
    type ModelListParams as ModelListParams,
  };

  export {
    Beta as Beta,
    type AnthropicBeta as AnthropicBeta,
    type BetaAPIError as BetaAPIError,
    type BetaAuthenticationError as BetaAuthenticationError,
    type BetaBillingError as BetaBillingError,
    type BetaError as BetaError,
    type BetaErrorResponse as BetaErrorResponse,
    type BetaGatewayTimeoutError as BetaGatewayTimeoutError,
    type BetaInvalidRequestError as BetaInvalidRequestError,
    type BetaNotFoundError as BetaNotFoundError,
    type BetaOverloadedError as BetaOverloadedError,
    type BetaPermissionError as BetaPermissionError,
    type BetaRateLimitError as BetaRateLimitError,
  };

  export type APIErrorObject = API.APIErrorObject;
  export type AuthenticationError = API.AuthenticationError;
  export type BillingError = API.BillingError;
  export type ErrorObject = API.ErrorObject;
  export type ErrorResponse = API.ErrorResponse;
  export type GatewayTimeoutError = API.GatewayTimeoutError;
  export type InvalidRequestError = API.InvalidRequestError;
  export type NotFoundError = API.NotFoundError;
  export type OverloadedError = API.OverloadedError;
  export type PermissionError = API.PermissionError;
  export type RateLimitError = API.RateLimitError;
}
