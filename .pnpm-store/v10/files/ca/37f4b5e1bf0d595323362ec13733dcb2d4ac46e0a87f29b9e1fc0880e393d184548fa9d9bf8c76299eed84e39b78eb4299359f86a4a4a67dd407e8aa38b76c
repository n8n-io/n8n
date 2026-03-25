type ParserType =
  | 'REQUEST'
  | 'RESPONSE'

type RequestMethod =
  | 'DELETE'
  | 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'CONNECT'
  | 'OPTIONS'
  | 'TRACE'
  | 'COPY'
  | 'LOCK'
  | 'MKCOL'
  | 'MOVE'
  | 'PROPFIND'
  | 'PROPPATCH'
  | 'SEARCH'
  | 'UNLOCK'
  | 'BIND'
  | 'REBIND'
  | 'UNBIND'
  | 'ACL'
  | 'REPORT'
  | 'MKACTIVITY'
  | 'CHECKOUT'
  | 'MERGE'
  | 'M-SEARCH'
  | 'NOTIFY'
  | 'SUBSCRIBE'
  | 'UNSUBSCRIBE'
  | 'PATCH'
  | 'PURGE'
  | 'MKCALENDAR'
  | 'LINK'
  | 'UNLINK'
  | string

type StateHeaderKey =
  | 'REQUEST_LINE'
  | 'RESPONSE_LINE'
  | 'HEADER'

type StateFinishAllowedKey =
  | 'REQUEST_LINE'
  | 'RESPONSE_LINE'
  | 'BODY_RAW'

type HeaderObject = Array<string>
type noop<T = void> = ()=> T

type HeaderInfo<HEADER = HeaderObject> = {
  versionMajor: number
  versionMinor: number
  headers: HEADER
  method: number
  url: string
  statusCode: number
  statusMessage: string
  upgrade: boolean
  shouldKeepAlive: boolean
}
export type OnHeadersCompleteParser<HEADER = HeaderObject, Mode_0_12 extends boolean = true> = Mode_0_12 extends true
  ? (info: HeaderInfo<HEADER>)=> number | void
  : (
    versionMajor: number,
    versionMinor: number,
    headers: HEADER,
    method: number,
    url: string,
    statusCode: number,
    statusMessage: string,
    upgrade: boolean,
    shouldKeepAlive: boolean,
  )=> number | void
export type OnBodyParser = (chunk: Buffer, offset: number, length: number)=> void
// Only called in the slow case where slow means
// that the request headers were either fragmented
// across multiple TCP packets or too large to be
// processed in a single run. This method is also
// called to process trailing HTTP headers.
export type OnHeadersParser = (headers: string[], url: string)=> void

declare class HTTPParserJS {
  initialize(type: ParserType, async_resource?: unknown): void

  // Some handler stubs, needed for compatibility
  [HTTPParser.kOnHeaders]: OnHeadersParser
  [HTTPParser.kOnHeadersComplete]: OnHeadersCompleteParser
  [HTTPParser.kOnBody]: OnBodyParser
  [HTTPParser.kOnMessageComplete]: noop

  /**
   * Max number of bytes that will be parsed as headers, 80kb by default
   * @default 81920
   */
  maxHeaderSize: number

  reinitialize: HTTPParserConstructor
  close: noop
  pause: noop
  resume: noop
  free: noop
  private _compatMode0_11: false | boolean
  getAsyncId: noop<0>

  execute(chunk: Buffer, start?: number, length?: number): number | Error
  finish(): void | Error

  // These three methods are used for an internal speed optimization, and it also
  // works if theses are noops. Basically consume() asks us to read the bytes
  // ourselves, but if we don't do it we get them through execute().
  consume: noop
  unconsume: noop
  getCurrentBuffer: noop

  /**
   * For correct error handling - see HTTPParser#execute
   * @example this.userCall()(userFunction('arg'));
   */
  userCall<T = unknown>(): (ret?: T)=> T
  private nextRequest: noop
  private consumeLine: noop<string|void>
  parseHeader(line: string, headers: string[]): void
  private REQUEST_LINE: noop
  private RESPONSE_LINE: noop
  shouldKeepAlive(): boolean
  /**
   * For older versions of node (v6.x and older?), that return `skipBody=1` or `skipBody=true`, need this `return true;` if it's an upgrade request.
   */
  private HEADER(): void | boolean
  private BODY_CHUNKHEAD(): void
  private BODY_CHUNK(): void
  private BODY_CHUNKEMPTYLINE(): void
  private BODY_CHUNKTRAILERS(): void
  private BODY_RAW(): void
  private BODY_SIZED(): void

  get onHeaders(): OnHeadersParser
  set onHeaders(to: OnHeadersParser)

  get onHeadersComplete(): OnHeadersCompleteParser
  set onHeadersComplete(to: OnHeadersCompleteParser)

  get onBody(): OnBodyParser
  set onBody(to: OnBodyParser)

  get onMessageComplete(): noop
  set onMessageComplete(to: noop)
}

interface HTTPParserConstructor extends Function {
  new(type?: ParserType): HTTPParserJS
  (type?: ParserType): void

  readonly prototype: HTTPParserJS

  readonly REQUEST: 'REQUEST'
  readonly RESPONSE: 'RESPONSE'
  readonly methods: RequestMethod[]

  encoding: 'ascii'|string
  /**
   * maxHeaderSize (in bytes) is configurable, but 80kb by default;
   * @default 80 * 1024 = 80kb
   */
  maxHeaderSize: 81920|number

  // Note: *not* starting with kOnHeaders=0 line the Node parser, because any
  // newly added constants (kOnTimeout in Node v12.19.0) will overwrite 0!
  readonly kOnHeaders: 1
  readonly kOnHeadersComplete: 2
  readonly kOnBody: 3
  readonly kOnMessageComplete: 4

  kOnExecute(): void
}
export const HTTPParser: HTTPParserConstructor
export const methods: RequestMethod[]
