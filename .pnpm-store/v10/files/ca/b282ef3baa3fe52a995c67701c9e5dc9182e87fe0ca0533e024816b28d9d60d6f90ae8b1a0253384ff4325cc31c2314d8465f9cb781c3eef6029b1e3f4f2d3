/* @flow strict */

type CredentialsType = 'omit' | 'same-origin' | 'include'

type ResponseType =  'default' | 'error'

type BodyInit = string | URLSearchParams | FormData | Blob | ArrayBuffer | $ArrayBufferView

type RequestInfo = Request | URL | string

type RequestOptions = {|
  body?: ?BodyInit;

  credentials?: CredentialsType;
  headers?: HeadersInit;
  method?: string;
  mode?: string;
  referrer?: string;
  signal?: ?AbortSignal;
|}

type ResponseOptions = {|
  status?: number;
  statusText?: string;
  headers?: HeadersInit;
|}

type HeadersInit = Headers | {[string]: string}

// https://github.com/facebook/flow/blob/f68b89a5012bd995ab3509e7a41b7325045c4045/lib/bom.js#L902-L914
declare class Headers {
  @@iterator(): Iterator<[string, string]>;
  constructor(init?: HeadersInit): void;
  append(name: string, value: string): void;
  delete(name: string): void;
  entries(): Iterator<[string, string]>;
  forEach((value: string, name: string, headers: Headers) => any, thisArg?: any): void;
  get(name: string): null | string;
  has(name: string): boolean;
  keys(): Iterator<string>;
  set(name: string, value: string): void;
  values(): Iterator<string>;
}

// https://github.com/facebook/flow/pull/6548
interface AbortSignal {
  aborted: boolean;
  addEventListener(type: string, listener: (Event) => mixed, options?: EventListenerOptionsOrUseCapture): void;
  removeEventListener(type: string, listener: (Event) => mixed, options?: EventListenerOptionsOrUseCapture): void;
}

// https://github.com/facebook/flow/blob/f68b89a5012bd995ab3509e7a41b7325045c4045/lib/bom.js#L994-L1018
// unsupported in polyfill:
// - cache
// - integrity
// - redirect
// - referrerPolicy
declare class Request {
  constructor(input: RequestInfo, init?: RequestOptions): void;
  clone(): Request;

  url: string;

  credentials: CredentialsType;
  headers: Headers;
  method: string;
  mode: ModeType;
  referrer: string;
  signal: ?AbortSignal;

  // Body methods and attributes
  bodyUsed: boolean;

  arrayBuffer(): Promise<ArrayBuffer>;
  blob(): Promise<Blob>;
  formData(): Promise<FormData>;
  json(): Promise<any>;
  text(): Promise<string>;
}

// https://github.com/facebook/flow/blob/f68b89a5012bd995ab3509e7a41b7325045c4045/lib/bom.js#L968-L992
// unsupported in polyfill:
// - body
// - redirected
// - trailer
declare class Response {
  constructor(input?: ?BodyInit, init?: ResponseOptions): void;
  clone(): Response;
  static error(): Response;
  static redirect(url: string, status?: number): Response;

  type: ResponseType;
  url: string;
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;

  // Body methods and attributes
  bodyUsed: boolean;

  arrayBuffer(): Promise<ArrayBuffer>;
  blob(): Promise<Blob>;
  formData(): Promise<FormData>;
  json(): Promise<any>;
  text(): Promise<string>;
}

declare class DOMException extends Error {
  constructor(message?: string, name?: string): void;
}

declare module.exports: {
  fetch(input: RequestInfo, init?: RequestOptions): Promise<Response>;
  Headers: typeof Headers;
  Request: typeof Request;
  Response: typeof Response;
  DOMException: typeof DOMException;
}
