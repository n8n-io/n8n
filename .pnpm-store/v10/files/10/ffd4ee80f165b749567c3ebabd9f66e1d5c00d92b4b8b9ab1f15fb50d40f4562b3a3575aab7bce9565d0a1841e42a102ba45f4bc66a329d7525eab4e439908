import { VERSION } from './version';
import { Stream } from './streaming';
import {
  OpenAIError,
  APIError,
  APIConnectionError,
  APIConnectionTimeoutError,
  APIUserAbortError,
} from './error';
import {
  kind as shimsKind,
  type Readable,
  getDefaultAgent,
  type Agent,
  fetch,
  type RequestInfo,
  type RequestInit,
  type Response,
  type HeadersInit,
} from './_shims/index';
export { type Response };
import { BlobLike, isBlobLike, isMultipartBody } from './uploads';
export {
  maybeMultipartFormRequestOptions,
  multipartFormRequestOptions,
  createForm,
  type Uploadable,
} from './uploads';

export type Fetch = (url: RequestInfo, init?: RequestInit) => Promise<Response>;

type PromiseOrValue<T> = T | Promise<T>;

type APIResponseProps = {
  response: Response;
  options: FinalRequestOptions;
  controller: AbortController;
};

async function defaultParseResponse<T>(props: APIResponseProps): Promise<WithRequestID<T>> {
  const { response } = props;
  if (props.options.stream) {
    debug('response', response.status, response.url, response.headers, response.body);

    // Note: there is an invariant here that isn't represented in the type system
    // that if you set `stream: true` the response type must also be `Stream<T>`

    if (props.options.__streamClass) {
      return props.options.__streamClass.fromSSEResponse(response, props.controller) as any;
    }

    return Stream.fromSSEResponse(response, props.controller) as any;
  }

  // fetch refuses to read the body when the status code is 204.
  if (response.status === 204) {
    return null as WithRequestID<T>;
  }

  if (props.options.__binaryResponse) {
    return response as unknown as WithRequestID<T>;
  }

  const contentType = response.headers.get('content-type');
  const isJSON =
    contentType?.includes('application/json') || contentType?.includes('application/vnd.api+json');
  if (isJSON) {
    const json = await response.json();

    debug('response', response.status, response.url, response.headers, json);

    return _addRequestID(json, response);
  }

  const text = await response.text();
  debug('response', response.status, response.url, response.headers, text);

  // TODO handle blob, arraybuffer, other content types, etc.
  return text as unknown as WithRequestID<T>;
}

type WithRequestID<T> =
  T extends Array<any> | Response | AbstractPage<any> ? T
  : T extends Record<string, any> ? T & { _request_id?: string | null }
  : T;

function _addRequestID<T>(value: T, response: Response): WithRequestID<T> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value as WithRequestID<T>;
  }

  return Object.defineProperty(value, '_request_id', {
    value: response.headers.get('x-request-id'),
    enumerable: false,
  }) as WithRequestID<T>;
}

/**
 * A subclass of `Promise` providing additional helper methods
 * for interacting with the SDK.
 */
export class APIPromise<T> extends Promise<WithRequestID<T>> {
  private parsedPromise: Promise<WithRequestID<T>> | undefined;

  constructor(
    private responsePromise: Promise<APIResponseProps>,
    private parseResponse: (
      props: APIResponseProps,
    ) => PromiseOrValue<WithRequestID<T>> = defaultParseResponse,
  ) {
    super((resolve) => {
      // this is maybe a bit weird but this has to be a no-op to not implicitly
      // parse the response body; instead .then, .catch, .finally are overridden
      // to parse the response
      resolve(null as any);
    });
  }

  _thenUnwrap<U>(transform: (data: T, props: APIResponseProps) => U): APIPromise<U> {
    return new APIPromise(this.responsePromise, async (props) =>
      _addRequestID(transform(await this.parseResponse(props), props), props.response),
    );
  }

  /**
   * Gets the raw `Response` instance instead of parsing the response
   * data.
   *
   * If you want to parse the response body but still get the `Response`
   * instance, you can use {@link withResponse()}.
   *
   * 👋 Getting the wrong TypeScript type for `Response`?
   * Try setting `"moduleResolution": "NodeNext"` if you can,
   * or add one of these imports before your first `import … from 'openai'`:
   * - `import 'openai/shims/node'` (if you're running on Node)
   * - `import 'openai/shims/web'` (otherwise)
   */
  asResponse(): Promise<Response> {
    return this.responsePromise.then((p) => p.response);
  }

  /**
   * Gets the parsed response data, the raw `Response` instance and the ID of the request,
   * returned via the X-Request-ID header which is useful for debugging requests and reporting
   * issues to OpenAI.
   *
   * If you just want to get the raw `Response` instance without parsing it,
   * you can use {@link asResponse()}.
   *
   *
   * 👋 Getting the wrong TypeScript type for `Response`?
   * Try setting `"moduleResolution": "NodeNext"` if you can,
   * or add one of these imports before your first `import … from 'openai'`:
   * - `import 'openai/shims/node'` (if you're running on Node)
   * - `import 'openai/shims/web'` (otherwise)
   */
  async withResponse(): Promise<{ data: T; response: Response; request_id: string | null | undefined }> {
    const [data, response] = await Promise.all([this.parse(), this.asResponse()]);
    return { data, response, request_id: response.headers.get('x-request-id') };
  }

  private parse(): Promise<WithRequestID<T>> {
    if (!this.parsedPromise) {
      this.parsedPromise = this.responsePromise.then(this.parseResponse) as any as Promise<WithRequestID<T>>;
    }
    return this.parsedPromise;
  }

  override then<TResult1 = WithRequestID<T>, TResult2 = never>(
    onfulfilled?: ((value: WithRequestID<T>) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ): Promise<TResult1 | TResult2> {
    return this.parse().then(onfulfilled, onrejected);
  }

  override catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null,
  ): Promise<WithRequestID<T> | TResult> {
    return this.parse().catch(onrejected);
  }

  override finally(onfinally?: (() => void) | undefined | null): Promise<WithRequestID<T>> {
    return this.parse().finally(onfinally);
  }
}

export abstract class APIClient {
  baseURL: string;
  maxRetries: number;
  timeout: number;
  httpAgent: Agent | undefined;

  private fetch: Fetch;
  protected idempotencyHeader?: string;

  constructor({
    baseURL,
    maxRetries = 2,
    timeout = 600000, // 10 minutes
    httpAgent,
    fetch: overridenFetch,
  }: {
    baseURL: string;
    maxRetries?: number | undefined;
    timeout: number | undefined;
    httpAgent: Agent | undefined;
    fetch: Fetch | undefined;
  }) {
    this.baseURL = baseURL;
    this.maxRetries = validatePositiveInteger('maxRetries', maxRetries);
    this.timeout = validatePositiveInteger('timeout', timeout);
    this.httpAgent = httpAgent;

    this.fetch = overridenFetch ?? fetch;
  }

  protected authHeaders(opts: FinalRequestOptions): Headers {
    return {};
  }

  /**
   * Override this to add your own default headers, for example:
   *
   *  {
   *    ...super.defaultHeaders(),
   *    Authorization: 'Bearer 123',
   *  }
   */
  protected defaultHeaders(opts: FinalRequestOptions): Headers {
    return {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': this.getUserAgent(),
      ...getPlatformHeaders(),
      ...this.authHeaders(opts),
    };
  }

  protected abstract defaultQuery(): DefaultQuery | undefined;

  /**
   * Override this to add your own headers validation:
   */
  protected validateHeaders(headers: Headers, customHeaders: Headers) {}

  protected defaultIdempotencyKey(): string {
    return `stainless-node-retry-${uuid4()}`;
  }

  get<Req, Rsp>(path: string, opts?: PromiseOrValue<RequestOptions<Req>>): APIPromise<Rsp> {
    return this.methodRequest('get', path, opts);
  }

  post<Req, Rsp>(path: string, opts?: PromiseOrValue<RequestOptions<Req>>): APIPromise<Rsp> {
    return this.methodRequest('post', path, opts);
  }

  patch<Req, Rsp>(path: string, opts?: PromiseOrValue<RequestOptions<Req>>): APIPromise<Rsp> {
    return this.methodRequest('patch', path, opts);
  }

  put<Req, Rsp>(path: string, opts?: PromiseOrValue<RequestOptions<Req>>): APIPromise<Rsp> {
    return this.methodRequest('put', path, opts);
  }

  delete<Req, Rsp>(path: string, opts?: PromiseOrValue<RequestOptions<Req>>): APIPromise<Rsp> {
    return this.methodRequest('delete', path, opts);
  }

  private methodRequest<Req, Rsp>(
    method: HTTPMethod,
    path: string,
    opts?: PromiseOrValue<RequestOptions<Req>>,
  ): APIPromise<Rsp> {
    return this.request(
      Promise.resolve(opts).then(async (opts) => {
        const body =
          opts && isBlobLike(opts?.body) ? new DataView(await opts.body.arrayBuffer())
          : opts?.body instanceof DataView ? opts.body
          : opts?.body instanceof ArrayBuffer ? new DataView(opts.body)
          : opts && ArrayBuffer.isView(opts?.body) ? new DataView(opts.body.buffer)
          : opts?.body;
        return { method, path, ...opts, body };
      }),
    );
  }

  getAPIList<Item, PageClass extends AbstractPage<Item> = AbstractPage<Item>>(
    path: string,
    Page: new (...args: any[]) => PageClass,
    opts?: RequestOptions<any>,
  ): PagePromise<PageClass, Item> {
    return this.requestAPIList(Page, { method: 'get', path, ...opts });
  }

  private calculateContentLength(body: unknown): string | null {
    if (typeof body === 'string') {
      if (typeof Buffer !== 'undefined') {
        return Buffer.byteLength(body, 'utf8').toString();
      }

      if (typeof TextEncoder !== 'undefined') {
        const encoder = new TextEncoder();
        const encoded = encoder.encode(body);
        return encoded.length.toString();
      }
    } else if (ArrayBuffer.isView(body)) {
      return body.byteLength.toString();
    }

    return null;
  }

  buildRequest<Req>(
    options: FinalRequestOptions<Req>,
    { retryCount = 0 }: { retryCount?: number } = {},
  ): { req: RequestInit; url: string; timeout: number } {
    const { method, path, query, headers: headers = {} } = options;

    const body =
      ArrayBuffer.isView(options.body) || (options.__binaryRequest && typeof options.body === 'string') ?
        options.body
      : isMultipartBody(options.body) ? options.body.body
      : options.body ? JSON.stringify(options.body, null, 2)
      : null;
    const contentLength = this.calculateContentLength(body);

    const url = this.buildURL(path!, query);
    if ('timeout' in options) validatePositiveInteger('timeout', options.timeout);
    const timeout = options.timeout ?? this.timeout;
    const httpAgent = options.httpAgent ?? this.httpAgent ?? getDefaultAgent(url);
    const minAgentTimeout = timeout + 1000;
    if (
      typeof (httpAgent as any)?.options?.timeout === 'number' &&
      minAgentTimeout > ((httpAgent as any).options.timeout ?? 0)
    ) {
      // Allow any given request to bump our agent active socket timeout.
      // This may seem strange, but leaking active sockets should be rare and not particularly problematic,
      // and without mutating agent we would need to create more of them.
      // This tradeoff optimizes for performance.
      (httpAgent as any).options.timeout = minAgentTimeout;
    }

    if (this.idempotencyHeader && method !== 'get') {
      if (!options.idempotencyKey) options.idempotencyKey = this.defaultIdempotencyKey();
      headers[this.idempotencyHeader] = options.idempotencyKey;
    }

    const reqHeaders = this.buildHeaders({ options, headers, contentLength, retryCount });

    const req: RequestInit = {
      method,
      ...(body && { body: body as any }),
      headers: reqHeaders,
      ...(httpAgent && { agent: httpAgent }),
      // @ts-ignore node-fetch uses a custom AbortSignal type that is
      // not compatible with standard web types
      signal: options.signal ?? null,
    };

    return { req, url, timeout };
  }

  private buildHeaders({
    options,
    headers,
    contentLength,
    retryCount,
  }: {
    options: FinalRequestOptions;
    headers: Record<string, string | null | undefined>;
    contentLength: string | null | undefined;
    retryCount: number;
  }): Record<string, string> {
    const reqHeaders: Record<string, string> = {};
    if (contentLength) {
      reqHeaders['content-length'] = contentLength;
    }

    const defaultHeaders = this.defaultHeaders(options);
    applyHeadersMut(reqHeaders, defaultHeaders);
    applyHeadersMut(reqHeaders, headers);

    // let builtin fetch set the Content-Type for multipart bodies
    if (isMultipartBody(options.body) && shimsKind !== 'node') {
      delete reqHeaders['content-type'];
    }

    // Don't set the retry count header if it was already set or removed through default headers or by the
    // caller. We check `defaultHeaders` and `headers`, which can contain nulls, instead of `reqHeaders` to
    // account for the removal case.
    if (
      getHeader(defaultHeaders, 'x-stainless-retry-count') === undefined &&
      getHeader(headers, 'x-stainless-retry-count') === undefined
    ) {
      reqHeaders['x-stainless-retry-count'] = String(retryCount);
    }

    this.validateHeaders(reqHeaders, headers);

    return reqHeaders;
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

  protected parseHeaders(headers: HeadersInit | null | undefined): Record<string, string> {
    return (
      !headers ? {}
      : Symbol.iterator in headers ?
        Object.fromEntries(Array.from(headers as Iterable<string[]>).map((header) => [...header]))
      : { ...headers }
    );
  }

  protected makeStatusError(
    status: number | undefined,
    error: Object | undefined,
    message: string | undefined,
    headers: Headers | undefined,
  ): APIError {
    return APIError.generate(status, error, message, headers);
  }

  request<Req, Rsp>(
    options: PromiseOrValue<FinalRequestOptions<Req>>,
    remainingRetries: number | null = null,
  ): APIPromise<Rsp> {
    return new APIPromise(this.makeRequest(options, remainingRetries));
  }

  private async makeRequest<Req>(
    optionsInput: PromiseOrValue<FinalRequestOptions<Req>>,
    retriesRemaining: number | null,
  ): Promise<APIResponseProps> {
    const options = await optionsInput;
    const maxRetries = options.maxRetries ?? this.maxRetries;
    if (retriesRemaining == null) {
      retriesRemaining = maxRetries;
    }

    await this.prepareOptions(options);

    const { req, url, timeout } = this.buildRequest(options, { retryCount: maxRetries - retriesRemaining });

    await this.prepareRequest(req, { url, options });

    debug('request', url, options, req.headers);

    if (options.signal?.aborted) {
      throw new APIUserAbortError();
    }

    const controller = new AbortController();
    const response = await this.fetchWithTimeout(url, req, timeout, controller).catch(castToError);

    if (response instanceof Error) {
      if (options.signal?.aborted) {
        throw new APIUserAbortError();
      }
      if (retriesRemaining) {
        return this.retryRequest(options, retriesRemaining);
      }
      if (response.name === 'AbortError') {
        throw new APIConnectionTimeoutError();
      }
      throw new APIConnectionError({ cause: response });
    }

    const responseHeaders = createResponseHeaders(response.headers);

    if (!response.ok) {
      if (retriesRemaining && this.shouldRetry(response)) {
        const retryMessage = `retrying, ${retriesRemaining} attempts remaining`;
        debug(`response (error; ${retryMessage})`, response.status, url, responseHeaders);
        return this.retryRequest(options, retriesRemaining, responseHeaders);
      }

      const errText = await response.text().catch((e) => castToError(e).message);
      const errJSON = safeJSON(errText);
      const errMessage = errJSON ? undefined : errText;
      const retryMessage = retriesRemaining ? `(error; no more retries left)` : `(error; not retryable)`;

      debug(`response (error; ${retryMessage})`, response.status, url, responseHeaders, errMessage);

      const err = this.makeStatusError(response.status, errJSON, errMessage, responseHeaders);
      throw err;
    }

    return { response, options, controller };
  }

  requestAPIList<Item = unknown, PageClass extends AbstractPage<Item> = AbstractPage<Item>>(
    Page: new (...args: ConstructorParameters<typeof AbstractPage>) => PageClass,
    options: FinalRequestOptions,
  ): PagePromise<PageClass, Item> {
    const request = this.makeRequest(options, null);
    return new PagePromise<PageClass, Item>(this, request, Page);
  }

  buildURL<Req>(path: string, query: Req | null | undefined): string {
    const url =
      isAbsoluteURL(path) ?
        new URL(path)
      : new URL(this.baseURL + (this.baseURL.endsWith('/') && path.startsWith('/') ? path.slice(1) : path));

    const defaultQuery = this.defaultQuery();
    if (!isEmptyObj(defaultQuery)) {
      query = { ...defaultQuery, ...query } as Req;
    }

    if (typeof query === 'object' && query && !Array.isArray(query)) {
      url.search = this.stringifyQuery(query as Record<string, unknown>);
    }

    return url.toString();
  }

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
        throw new OpenAIError(
          `Cannot stringify type ${typeof value}; Expected string, number, boolean, or null. If you need to pass nested query parameters, you can manually encode them, e.g. { query: { 'foo[key1]': value1, 'foo[key2]': value2 } }, and please open a GitHub issue requesting better support for your use case.`,
        );
      })
      .join('&');
  }

  async fetchWithTimeout(
    url: RequestInfo,
    init: RequestInit | undefined,
    ms: number,
    controller: AbortController,
  ): Promise<Response> {
    const { signal, ...options } = init || {};
    if (signal) signal.addEventListener('abort', () => controller.abort());

    const timeout = setTimeout(() => controller.abort(), ms);

    return (
      this.getRequestClient()
        // use undefined this binding; fetch errors if bound to something else in browser/cloudflare
        .fetch.call(undefined, url, { signal: controller.signal as any, ...options })
        .finally(() => {
          clearTimeout(timeout);
        })
    );
  }

  protected getRequestClient(): RequestClient {
    return { fetch: this.fetch };
  }

  private shouldRetry(response: Response): boolean {
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
    responseHeaders?: Headers | undefined,
  ): Promise<APIResponseProps> {
    let timeoutMillis: number | undefined;

    // Note the `retry-after-ms` header may not be standard, but is a good idea and we'd like proactive support for it.
    const retryAfterMillisHeader = responseHeaders?.['retry-after-ms'];
    if (retryAfterMillisHeader) {
      const timeoutMs = parseFloat(retryAfterMillisHeader);
      if (!Number.isNaN(timeoutMs)) {
        timeoutMillis = timeoutMs;
      }
    }

    // About the Retry-After header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After
    const retryAfterHeader = responseHeaders?.['retry-after'];
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

    return this.makeRequest(options, retriesRemaining - 1);
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

  private getUserAgent(): string {
    return `${this.constructor.name}/JS ${VERSION}`;
  }
}

export type PageInfo = { url: URL } | { params: Record<string, unknown> | null };

export abstract class AbstractPage<Item> implements AsyncIterable<Item> {
  #client: APIClient;
  protected options: FinalRequestOptions;

  protected response: Response;
  protected body: unknown;

  constructor(client: APIClient, response: Response, body: unknown, options: FinalRequestOptions) {
    this.#client = client;
    this.options = options;
    this.response = response;
    this.body = body;
  }

  /**
   * @deprecated Use nextPageInfo instead
   */
  abstract nextPageParams(): Partial<Record<string, unknown>> | null;
  abstract nextPageInfo(): PageInfo | null;

  abstract getPaginatedItems(): Item[];

  hasNextPage(): boolean {
    const items = this.getPaginatedItems();
    if (!items.length) return false;
    return this.nextPageInfo() != null;
  }

  async getNextPage(): Promise<this> {
    const nextInfo = this.nextPageInfo();
    if (!nextInfo) {
      throw new OpenAIError(
        'No next page expected; please check `.hasNextPage()` before calling `.getNextPage()`.',
      );
    }
    const nextOptions = { ...this.options };
    if ('params' in nextInfo && typeof nextOptions.query === 'object') {
      nextOptions.query = { ...nextOptions.query, ...nextInfo.params };
    } else if ('url' in nextInfo) {
      const params = [...Object.entries(nextOptions.query || {}), ...nextInfo.url.searchParams.entries()];
      for (const [key, value] of params) {
        nextInfo.url.searchParams.set(key, value as any);
      }
      nextOptions.query = undefined;
      nextOptions.path = nextInfo.url.toString();
    }
    return await this.#client.requestAPIList(this.constructor as any, nextOptions);
  }

  async *iterPages(): AsyncGenerator<this> {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let page: this = this;
    yield page;
    while (page.hasNextPage()) {
      page = await page.getNextPage();
      yield page;
    }
  }

  async *[Symbol.asyncIterator](): AsyncGenerator<Item> {
    for await (const page of this.iterPages()) {
      for (const item of page.getPaginatedItems()) {
        yield item;
      }
    }
  }
}

/**
 * This subclass of Promise will resolve to an instantiated Page once the request completes.
 *
 * It also implements AsyncIterable to allow auto-paginating iteration on an unawaited list call, eg:
 *
 *    for await (const item of client.items.list()) {
 *      console.log(item)
 *    }
 */
export class PagePromise<
    PageClass extends AbstractPage<Item>,
    Item = ReturnType<PageClass['getPaginatedItems']>[number],
  >
  extends APIPromise<PageClass>
  implements AsyncIterable<Item>
{
  constructor(
    client: APIClient,
    request: Promise<APIResponseProps>,
    Page: new (...args: ConstructorParameters<typeof AbstractPage>) => PageClass,
  ) {
    super(
      request,
      async (props) =>
        new Page(
          client,
          props.response,
          await defaultParseResponse(props),
          props.options,
        ) as WithRequestID<PageClass>,
    );
  }

  /**
   * Allow auto-paginating iteration on an unawaited list call, eg:
   *
   *    for await (const item of client.items.list()) {
   *      console.log(item)
   *    }
   */
  async *[Symbol.asyncIterator](): AsyncGenerator<Item> {
    const page = await this;
    for await (const item of page) {
      yield item;
    }
  }
}

export const createResponseHeaders = (
  headers: Awaited<ReturnType<Fetch>>['headers'],
): Record<string, string> => {
  return new Proxy(
    Object.fromEntries(
      // @ts-ignore
      headers.entries(),
    ),
    {
      get(target, name) {
        const key = name.toString();
        return target[key.toLowerCase()] || target[key];
      },
    },
  );
};

type HTTPMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export type RequestClient = { fetch: Fetch };
export type Headers = Record<string, string | null | undefined>;
export type DefaultQuery = Record<string, string | undefined>;
export type KeysEnum<T> = { [P in keyof Required<T>]: true };

export type RequestOptions<
  Req = unknown | Record<string, unknown> | Readable | BlobLike | ArrayBufferView | ArrayBuffer,
> = {
  method?: HTTPMethod;
  path?: string;
  query?: Req | undefined;
  body?: Req | null | undefined;
  headers?: Headers | undefined;

  maxRetries?: number;
  stream?: boolean | undefined;
  timeout?: number;
  httpAgent?: Agent;
  signal?: AbortSignal | undefined | null;
  idempotencyKey?: string;

  __binaryRequest?: boolean | undefined;
  __binaryResponse?: boolean | undefined;
  __streamClass?: typeof Stream;
};

// This is required so that we can determine if a given object matches the RequestOptions
// type at runtime. While this requires duplication, it is enforced by the TypeScript
// compiler such that any missing / extraneous keys will cause an error.
const requestOptionsKeys: KeysEnum<RequestOptions> = {
  method: true,
  path: true,
  query: true,
  body: true,
  headers: true,

  maxRetries: true,
  stream: true,
  timeout: true,
  httpAgent: true,
  signal: true,
  idempotencyKey: true,

  __binaryRequest: true,
  __binaryResponse: true,
  __streamClass: true,
};

export const isRequestOptions = (obj: unknown): obj is RequestOptions => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    !isEmptyObj(obj) &&
    Object.keys(obj).every((k) => hasOwn(requestOptionsKeys, k))
  );
};

export type FinalRequestOptions<Req = unknown | Record<string, unknown> | Readable | DataView> =
  RequestOptions<Req> & {
    method: HTTPMethod;
    path: string;
  };

declare const Deno: any;
declare const EdgeRuntime: any;
type Arch = 'x32' | 'x64' | 'arm' | 'arm64' | `other:${string}` | 'unknown';
type PlatformName =
  | 'MacOS'
  | 'Linux'
  | 'Windows'
  | 'FreeBSD'
  | 'OpenBSD'
  | 'iOS'
  | 'Android'
  | `Other:${string}`
  | 'Unknown';
type Browser = 'ie' | 'edge' | 'chrome' | 'firefox' | 'safari';
type PlatformProperties = {
  'X-Stainless-Lang': 'js';
  'X-Stainless-Package-Version': string;
  'X-Stainless-OS': PlatformName;
  'X-Stainless-Arch': Arch;
  'X-Stainless-Runtime': 'node' | 'deno' | 'edge' | `browser:${Browser}` | 'unknown';
  'X-Stainless-Runtime-Version': string;
};
const getPlatformProperties = (): PlatformProperties => {
  if (typeof Deno !== 'undefined' && Deno.build != null) {
    return {
      'X-Stainless-Lang': 'js',
      'X-Stainless-Package-Version': VERSION,
      'X-Stainless-OS': normalizePlatform(Deno.build.os),
      'X-Stainless-Arch': normalizeArch(Deno.build.arch),
      'X-Stainless-Runtime': 'deno',
      'X-Stainless-Runtime-Version':
        typeof Deno.version === 'string' ? Deno.version : Deno.version?.deno ?? 'unknown',
    };
  }
  if (typeof EdgeRuntime !== 'undefined') {
    return {
      'X-Stainless-Lang': 'js',
      'X-Stainless-Package-Version': VERSION,
      'X-Stainless-OS': 'Unknown',
      'X-Stainless-Arch': `other:${EdgeRuntime}`,
      'X-Stainless-Runtime': 'edge',
      'X-Stainless-Runtime-Version': process.version,
    };
  }
  // Check if Node.js
  if (Object.prototype.toString.call(typeof process !== 'undefined' ? process : 0) === '[object process]') {
    return {
      'X-Stainless-Lang': 'js',
      'X-Stainless-Package-Version': VERSION,
      'X-Stainless-OS': normalizePlatform(process.platform),
      'X-Stainless-Arch': normalizeArch(process.arch),
      'X-Stainless-Runtime': 'node',
      'X-Stainless-Runtime-Version': process.version,
    };
  }

  const browserInfo = getBrowserInfo();
  if (browserInfo) {
    return {
      'X-Stainless-Lang': 'js',
      'X-Stainless-Package-Version': VERSION,
      'X-Stainless-OS': 'Unknown',
      'X-Stainless-Arch': 'unknown',
      'X-Stainless-Runtime': `browser:${browserInfo.browser}`,
      'X-Stainless-Runtime-Version': browserInfo.version,
    };
  }

  // TODO add support for Cloudflare workers, etc.
  return {
    'X-Stainless-Lang': 'js',
    'X-Stainless-Package-Version': VERSION,
    'X-Stainless-OS': 'Unknown',
    'X-Stainless-Arch': 'unknown',
    'X-Stainless-Runtime': 'unknown',
    'X-Stainless-Runtime-Version': 'unknown',
  };
};

type BrowserInfo = {
  browser: Browser;
  version: string;
};

declare const navigator: { userAgent: string } | undefined;

// Note: modified from https://github.com/JS-DevTools/host-environment/blob/b1ab79ecde37db5d6e163c050e54fe7d287d7c92/src/isomorphic.browser.ts
function getBrowserInfo(): BrowserInfo | null {
  if (typeof navigator === 'undefined' || !navigator) {
    return null;
  }

  // NOTE: The order matters here!
  const browserPatterns = [
    { key: 'edge' as const, pattern: /Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: 'ie' as const, pattern: /MSIE(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: 'ie' as const, pattern: /Trident(?:.*rv\:(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: 'chrome' as const, pattern: /Chrome(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: 'firefox' as const, pattern: /Firefox(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/ },
    { key: 'safari' as const, pattern: /(?:Version\W+(\d+)\.(\d+)(?:\.(\d+))?)?(?:\W+Mobile\S*)?\W+Safari/ },
  ];

  // Find the FIRST matching browser
  for (const { key, pattern } of browserPatterns) {
    const match = pattern.exec(navigator.userAgent);
    if (match) {
      const major = match[1] || 0;
      const minor = match[2] || 0;
      const patch = match[3] || 0;

      return { browser: key, version: `${major}.${minor}.${patch}` };
    }
  }

  return null;
}

const normalizeArch = (arch: string): Arch => {
  // Node docs:
  // - https://nodejs.org/api/process.html#processarch
  // Deno docs:
  // - https://doc.deno.land/deno/stable/~/Deno.build
  if (arch === 'x32') return 'x32';
  if (arch === 'x86_64' || arch === 'x64') return 'x64';
  if (arch === 'arm') return 'arm';
  if (arch === 'aarch64' || arch === 'arm64') return 'arm64';
  if (arch) return `other:${arch}`;
  return 'unknown';
};

const normalizePlatform = (platform: string): PlatformName => {
  // Node platforms:
  // - https://nodejs.org/api/process.html#processplatform
  // Deno platforms:
  // - https://doc.deno.land/deno/stable/~/Deno.build
  // - https://github.com/denoland/deno/issues/14799

  platform = platform.toLowerCase();

  // NOTE: this iOS check is untested and may not work
  // Node does not work natively on IOS, there is a fork at
  // https://github.com/nodejs-mobile/nodejs-mobile
  // however it is unknown at the time of writing how to detect if it is running
  if (platform.includes('ios')) return 'iOS';
  if (platform === 'android') return 'Android';
  if (platform === 'darwin') return 'MacOS';
  if (platform === 'win32') return 'Windows';
  if (platform === 'freebsd') return 'FreeBSD';
  if (platform === 'openbsd') return 'OpenBSD';
  if (platform === 'linux') return 'Linux';
  if (platform) return `Other:${platform}`;
  return 'Unknown';
};

let _platformHeaders: PlatformProperties;
const getPlatformHeaders = () => {
  return (_platformHeaders ??= getPlatformProperties());
};

export const safeJSON = (text: string) => {
  try {
    return JSON.parse(text);
  } catch (err) {
    return undefined;
  }
};

// https://stackoverflow.com/a/19709846
const startsWithSchemeRegexp = new RegExp('^(?:[a-z]+:)?//', 'i');
const isAbsoluteURL = (url: string): boolean => {
  return startsWithSchemeRegexp.test(url);
};

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const validatePositiveInteger = (name: string, n: unknown): number => {
  if (typeof n !== 'number' || !Number.isInteger(n)) {
    throw new OpenAIError(`${name} must be an integer`);
  }
  if (n < 0) {
    throw new OpenAIError(`${name} must be a positive integer`);
  }
  return n;
};

export const castToError = (err: any): Error => {
  if (err instanceof Error) return err;
  if (typeof err === 'object' && err !== null) {
    try {
      return new Error(JSON.stringify(err));
    } catch {}
  }
  return new Error(err);
};

export const ensurePresent = <T>(value: T | null | undefined): T => {
  if (value == null) throw new OpenAIError(`Expected a value to be given but received ${value} instead.`);
  return value;
};

/**
 * Read an environment variable.
 *
 * Trims beginning and trailing whitespace.
 *
 * Will return undefined if the environment variable doesn't exist or cannot be accessed.
 */
export const readEnv = (env: string): string | undefined => {
  if (typeof process !== 'undefined') {
    return process.env?.[env]?.trim() ?? undefined;
  }
  if (typeof Deno !== 'undefined') {
    return Deno.env?.get?.(env)?.trim();
  }
  return undefined;
};

export const coerceInteger = (value: unknown): number => {
  if (typeof value === 'number') return Math.round(value);
  if (typeof value === 'string') return parseInt(value, 10);

  throw new OpenAIError(`Could not coerce ${value} (type: ${typeof value}) into a number`);
};

export const coerceFloat = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);

  throw new OpenAIError(`Could not coerce ${value} (type: ${typeof value}) into a number`);
};

export const coerceBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true';
  return Boolean(value);
};

export const maybeCoerceInteger = (value: unknown): number | undefined => {
  if (value === undefined) {
    return undefined;
  }
  return coerceInteger(value);
};

export const maybeCoerceFloat = (value: unknown): number | undefined => {
  if (value === undefined) {
    return undefined;
  }
  return coerceFloat(value);
};

export const maybeCoerceBoolean = (value: unknown): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }
  return coerceBoolean(value);
};

// https://stackoverflow.com/a/34491287
export function isEmptyObj(obj: Object | null | undefined): boolean {
  if (!obj) return true;
  for (const _k in obj) return false;
  return true;
}

// https://eslint.org/docs/latest/rules/no-prototype-builtins
export function hasOwn(obj: Object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * Copies headers from "newHeaders" onto "targetHeaders",
 * using lower-case for all properties,
 * ignoring any keys with undefined values,
 * and deleting any keys with null values.
 */
function applyHeadersMut(targetHeaders: Headers, newHeaders: Headers): void {
  for (const k in newHeaders) {
    if (!hasOwn(newHeaders, k)) continue;
    const lowerKey = k.toLowerCase();
    if (!lowerKey) continue;

    const val = newHeaders[k];

    if (val === null) {
      delete targetHeaders[lowerKey];
    } else if (val !== undefined) {
      targetHeaders[lowerKey] = val;
    }
  }
}

export function debug(action: string, ...args: any[]) {
  if (typeof process !== 'undefined' && process?.env?.['DEBUG'] === 'true') {
    console.log(`OpenAI:DEBUG:${action}`, ...args);
  }
}

/**
 * https://stackoverflow.com/a/2117523
 */
const uuid4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const isRunningInBrowser = () => {
  return (
    // @ts-ignore
    typeof window !== 'undefined' &&
    // @ts-ignore
    typeof window.document !== 'undefined' &&
    // @ts-ignore
    typeof navigator !== 'undefined'
  );
};

export interface HeadersProtocol {
  get: (header: string) => string | null | undefined;
}
export type HeadersLike = Record<string, string | string[] | undefined> | HeadersProtocol;

export const isHeadersProtocol = (headers: any): headers is HeadersProtocol => {
  return typeof headers?.get === 'function';
};

export const getRequiredHeader = (headers: HeadersLike | Headers, header: string): string => {
  const foundHeader = getHeader(headers, header);
  if (foundHeader === undefined) {
    throw new Error(`Could not find ${header} header`);
  }
  return foundHeader;
};

export const getHeader = (headers: HeadersLike | Headers, header: string): string | undefined => {
  const lowerCasedHeader = header.toLowerCase();
  if (isHeadersProtocol(headers)) {
    // to deal with the case where the header looks like Stainless-Event-Id
    const intercapsHeader =
      header[0]?.toUpperCase() +
      header.substring(1).replace(/([^\w])(\w)/g, (_m, g1, g2) => g1 + g2.toUpperCase());
    for (const key of [header, lowerCasedHeader, header.toUpperCase(), intercapsHeader]) {
      const value = headers.get(key);
      if (value) {
        return value;
      }
    }
  }

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lowerCasedHeader) {
      if (Array.isArray(value)) {
        if (value.length <= 1) return value[0];
        console.warn(`Received ${value.length} entries for the ${header} header, using the first entry.`);
        return value[0];
      }
      return value;
    }
  }

  return undefined;
};

/**
 * Encodes a string to Base64 format.
 */
export const toBase64 = (str: string | null | undefined): string => {
  if (!str) return '';
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str).toString('base64');
  }

  if (typeof btoa !== 'undefined') {
    return btoa(str);
  }

  throw new OpenAIError('Cannot generate b64 string; Expected `Buffer` or `btoa` to be defined');
};

export function isObj(obj: unknown): obj is Record<string, unknown> {
  return obj != null && typeof obj === 'object' && !Array.isArray(obj);
}
