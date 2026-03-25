import FakeXMLHttpRequest from 'fake-xml-http-request';
import { Params, QueryParams } from 'route-recognizer';

type SetupCallback = (this: Server) => void;
interface SetupConfig {
  forcePassthrough: boolean;
}
export type Config = SetupCallback | SetupConfig;
export class Server {
  public passthrough: ResponseHandler;

  constructor(config?: Config);
  // HTTP request verbs
  public get: RequestHandler;
  public put: RequestHandler;
  public post: RequestHandler;
  public patch: RequestHandler;
  public delete: RequestHandler;
  public options: RequestHandler;
  public head: RequestHandler;

  public shutdown(): void;

  public map(maps: Function): void;

  public handledRequest(verb: string, path: string, request: FakeXMLHttpRequest & ExtraRequestData): void;
  public unhandledRequest(verb: string, path: string, request: FakeXMLHttpRequest & ExtraRequestData): void;
  public passthroughRequest(verb: string, path: string, request: FakeXMLHttpRequest & ExtraRequestData): void;
  public erroredRequest(verb: string, path: string, request: FakeXMLHttpRequest & ExtraRequestData, error: Error): void;

  public prepareBody(body: string): string;
  public prepareHeaders(headers: {[k: string]: string}): {[k: string]: string};
}

export type RequestHandler = (
  urlExpression: string,
  response: ResponseHandler,
  asyncOrDelay?: boolean | number
) => ResponseHandlerInstance;

export type ResponseData = [number, { [k: string]: string }, string];
interface ExtraRequestData {
  params: Params;
  queryParams: QueryParams;
}
export type ResponseHandler = {
  (request: FakeXMLHttpRequest & ExtraRequestData):
    | ResponseData
    | PromiseLike<ResponseData>;
};

export type ResponseHandlerInstance = ResponseHandler & { 
  async: boolean;
  numberOfCalls: number;
}

export default Server;
