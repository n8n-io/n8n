// TypeScript Version: 3.5

import { ReadStream } from 'fs'
import { ClientRequest, IncomingMessage, RequestOptions } from 'http'
import { ParsedUrlQuery } from 'querystring'
import { Url, URLSearchParams } from 'url'

export = nock

declare function nock(
  basePath: string | RegExp | Url | URL,
  options?: nock.Options,
): nock.Scope

declare namespace nock {
  function cleanAll(): void
  function activate(): void
  function isActive(): boolean
  function isDone(): boolean
  function pendingMocks(): string[]
  function activeMocks(): string[]
  function removeInterceptor(interceptor: Interceptor | ReqOptions): boolean
  function disableNetConnect(): void
  function enableNetConnect(
    matcher?: string | RegExp | ((host: string) => boolean),
  ): void
  function load(path: string): Scope[]
  function loadDefs(path: string): Definition[]
  function define(defs: Definition[]): Scope[]
  function restore(): void
  function abortPendingRequests(): void

  let back: Back
  let emitter: NodeJS.EventEmitter
  let recorder: Recorder

  type InterceptFunction = (
    uri: string | RegExp | { (uri: string): boolean },
    requestBody?: RequestBodyMatcher,
    interceptorOptions?: Options,
  ) => Interceptor

  // Essentially valid, decoded JSON with the addition of possible RegExp. TS doesn't currently have
  // a great way to represent JSON type data, this data matcher design is based off this comment.
  // https://github.com/microsoft/TypeScript/issues/1897#issuecomment-338650717
  type DataMatcher =
    | boolean
    | number
    | string
    | null
    | undefined
    | RegExp
    | DataMatcherArray
    | DataMatcherMap
  interface DataMatcherArray extends ReadonlyArray<DataMatcher> {}
  interface DataMatcherMap {
    [key: string]: DataMatcher
  }

  type RequestBodyMatcher =
    | string
    | Buffer
    | RegExp
    | DataMatcherArray
    | DataMatcherMap
    | { (body: any): boolean }

  type RequestHeaderMatcher =
    | string
    | RegExp
    | { (fieldValue: string): boolean }

  type Body = string | Record<string, any> // a string or decoded JSON
  type ReplyBody = Body | Buffer | ReadStream

  type ReplyHeaderFunction = (
    req: ClientRequest,
    res: IncomingMessage,
    body: string | Buffer,
  ) => string | string[]
  type ReplyHeaderValue = string | string[] | ReplyHeaderFunction
  type ReplyHeaders =
    | Record<string, ReplyHeaderValue>
    | Map<string, ReplyHeaderValue>
    | ReplyHeaderValue[]

  type StatusCode = number
  type ReplyFnResult =
    | readonly [StatusCode]
    | readonly [StatusCode, ReplyBody]
    | readonly [StatusCode, ReplyBody, ReplyHeaders]

  interface ReplyFnContext extends Interceptor {
    req: ClientRequest & {
      headers: Record<string, string>
    }
  }

  interface Scope extends NodeJS.EventEmitter {
    get: InterceptFunction
    post: InterceptFunction
    put: InterceptFunction
    head: InterceptFunction
    patch: InterceptFunction
    merge: InterceptFunction
    delete: InterceptFunction
    options: InterceptFunction

    intercept: (
      uri: string | RegExp | { (uri: string): boolean },
      method: string,
      requestBody?: RequestBodyMatcher,
      options?: Options,
    ) => Interceptor

    defaultReplyHeaders(headers: ReplyHeaders): this
    matchHeader(name: string, value: RequestHeaderMatcher): this
    filteringPath(regex: RegExp, replace: string): this
    filteringPath(fn: (path: string) => string): this
    filteringRequestBody(regex: RegExp, replace: string): this
    filteringRequestBody(
      fn: (body: string, recordedBody: string) => string,
    ): this

    persist(flag?: boolean): this
    replyContentLength(): this
    replyDate(d?: Date): this

    done(): void
    isDone(): boolean
    pendingMocks(): string[]
    activeMocks(): string[]
  }

  interface Interceptor {
    query(
      matcher:
        | boolean
        | string
        | DataMatcherMap
        | URLSearchParams
        | { (parsedObj: ParsedUrlQuery): boolean },
    ): this

    // tslint (as of 5.16) is under the impression that the callback types can be unified,
    // however, doing so causes the params to lose their inherited types during use.
    // the order of the overrides is important for determining the param types in the replay fns.
    /* tslint:disable:unified-signatures */
    reply(
      replyFnWithCallback: (
        this: ReplyFnContext,
        uri: string,
        body: Body,
        callback: (
          err: NodeJS.ErrnoException | null,
          result: ReplyFnResult,
        ) => void,
      ) => void,
    ): Scope
    reply(
      replyFn: (
        this: ReplyFnContext,
        uri: string,
        body: Body,
      ) => ReplyFnResult | Promise<ReplyFnResult>,
    ): Scope
    reply(
      statusCode: StatusCode,
      replyBodyFnWithCallback: (
        this: ReplyFnContext,
        uri: string,
        body: Body,
        callback: (
          err: NodeJS.ErrnoException | null,
          result: ReplyBody,
        ) => void,
      ) => void,
      headers?: ReplyHeaders,
    ): Scope
    reply(
      statusCode: StatusCode,
      replyBodyFn: (
        this: ReplyFnContext,
        uri: string,
        body: Body,
      ) => ReplyBody | Promise<ReplyBody>,
      headers?: ReplyHeaders,
    ): Scope
    reply(responseCode?: StatusCode, body?: Body, headers?: ReplyHeaders): Scope
    /* tslint:enable:unified-signatures */

    replyWithError(errorMessage: string | object): Scope
    replyWithFile(
      statusCode: StatusCode,
      fileName: string,
      headers?: ReplyHeaders,
    ): Scope

    matchHeader(name: string, value: RequestHeaderMatcher): this
    basicAuth(options: { user: string; pass?: string }): this

    times(newCounter: number): this
    once(): this
    twice(): this
    thrice(): this
    optionally(flag?: boolean): this

    delay(opts: number): this
    /** @deprecated use delay(number) instead */
    delay(opts: { head?: number; body?: number }): this
    delay(opts: number | { head?: number; body?: number }): this
    /** @deprecated use delay function instead */
    delayBody(timeMs: number): this
    /** @deprecated use delay function instead */
    delayConnection(timeMs: number): this
  }

  interface Options {
    allowUnmocked?: boolean
    reqheaders?: Record<string, RequestHeaderMatcher>
    badheaders?: string[]
    filteringScope?: { (scope: string): boolean }
    encodedQueryParams?: boolean
  }

  interface Recorder {
    rec(options?: boolean | RecorderOptions): void
    clear(): void
    play(): string[] | Definition[]
  }

  interface RecorderOptions {
    dont_print?: boolean
    output_objects?: boolean
    enable_reqheaders_recording?: boolean
    logging?: (content: string) => void
    use_separator?: boolean
  }

  interface Definition {
    scope: string | RegExp
    path: string | RegExp
    port?: number | string
    method?: string
    status?: number
    body?: RequestBodyMatcher
    reqheaders?: Record<string, RequestHeaderMatcher>
    response?: ReplyBody
    headers?: ReplyHeaders
    options?: Options
  }

  type BackMode = 'wild' | 'dryrun' | 'record' | 'update' | 'lockdown'

  interface Back {
    currentMode: BackMode
    fixtures: string
    setMode(mode: BackMode): void

    (fixtureName: string, nockedFn: (nockDone: () => void) => void): void
    (
      fixtureName: string,
      options: BackOptions,
      nockedFn: (nockDone: () => void) => void,
    ): void
    (
      fixtureName: string,
      options?: BackOptions,
    ): Promise<{
      nockDone: () => void
      context: BackContext
    }>
  }

  interface InterceptorSurface {
    method: string
    uri: string
    basePath: string
    path: string
    queries?: string
    counter: number
    body: string
    statusCode: number
    optional: boolean
  }

  interface BackContext {
    isLoaded: boolean
    scopes: Scope[]
    assertScopesFinished(): void
    query: InterceptorSurface[]
  }

  interface BackOptions {
    before?: (def: Definition) => void
    after?: (scope: Scope) => void
    afterRecord?: (defs: Definition[]) => Definition[] | string
    recorder?: RecorderOptions
  }
}

type ReqOptions = RequestOptions & { proto?: string }
