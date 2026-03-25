import { Client } from '../client-builder.mjs';
import { R as Request } from '../index-D3_z6QHM.mjs';
import { Params, Headers } from '../types.mjs';
export { RequestFactoryArgs, requestFactory } from './request-factory.mjs';
export { ResponseFactoryArgs, responseFactory } from './response-factory.mjs';
import '../manifest.mjs';
import '../gateway/types.mjs';
import '../gateway/gateway.mjs';

interface MockAssert {
  calls(): Request[]
  callsCount(): number
  mostRecentCall(): Request | null
}

type StatusHandler = (request: Request, mock: MockAssert) => void

type ResponseHandler = (request: Request, mock: MockAssert) => void

interface MockClient<ResourcesType, ResourceName extends keyof ResourcesType> {
  resource<ResourceName extends keyof ResourcesType>(
    name: ResourceName
  ): MockClient<ResourcesType, ResourceName>
  method(name: keyof ResourcesType[ResourceName]): this
  with(args: Partial<Params>): this
  status(responder: StatusHandler | number): this
  headers(responseHeaders: Headers): this
  response(responder: ResponseHandler | object | string): this
  assertObject(): MockAssert
  assertObjectAsync(): Promise<MockAssert>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare function lookupResponseAsync(req: any): Promise<any>
declare function clear(): void
declare function install(): void
declare function uninstall(): void
declare function unusedMocks(): number
declare function mockClient<
  ResourcesType,
  ResourceName extends keyof ResourcesType = keyof ResourcesType,
>(client: Client<ResourcesType>): MockClient<ResourcesType, ResourceName>

type MockRequestUrlFunction = (requestUrl: string, params: object) => string
type MockRequestBody = string | object
type MockRequestBodyFunction = (requestBody: MockRequestBody) => MockRequestBody
type MockRequestHeaders = Headers
type MockRequestHeadersFunction = (requestHeaders: MockRequestHeaders) => MockRequestHeaders

type TestMatchPredicate = (value: string) => boolean

interface TestMatchFunctions {
  stringMatching(value: RegExp): TestMatchPredicate
  stringContaining(value: string): TestMatchPredicate
  uuid4(): TestMatchPredicate
  anything(): TestMatchPredicate
}

interface MockRequestArgs {
  method: string
  url: string | MockRequestUrlFunction | TestMatchPredicate
  body?: MockRequestBody | MockRequestBodyFunction
  headers?: MockRequestHeaders | MockRequestHeadersFunction
  response?: {
    status?: number
    body?: MockRequestBody
    headers?: Headers
  }
}

declare function mockRequest(args: MockRequestArgs): MockAssert

declare const m: TestMatchFunctions

export { type MockAssert, type MockClient, type MockRequestArgs, type MockRequestBody, type MockRequestBodyFunction, type MockRequestHeaders, type MockRequestHeadersFunction, type MockRequestUrlFunction, type ResponseHandler, type StatusHandler, type TestMatchFunctions, type TestMatchPredicate, clear, install, lookupResponseAsync, m, mockClient, mockRequest, uninstall, unusedMocks };
