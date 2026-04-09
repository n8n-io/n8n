import { HttpRequest } from "@smithy/protocol-http";
import { HttpResponse } from "@smithy/protocol-http";
import {
  Logger,
  Provider,
  RequestHandler,
  RequestHandlerMetadata,
} from "@smithy/types";
export interface WebSocketFetchHandlerOptions {
  connectionTimeout?: number;
  logger?: Logger;
}
export declare class WebSocketFetchHandler {
  readonly metadata: RequestHandlerMetadata;
  private config;
  private configPromise;
  private readonly httpHandler;
  private readonly sockets;
  static create(
    instanceOrOptions?:
      | WebSocketFetchHandler
      | WebSocketFetchHandlerOptions
      | Provider<WebSocketFetchHandlerOptions | void>,
    httpHandler?: RequestHandler<any, any>
  ): WebSocketFetchHandler;
  constructor(
    options?:
      | WebSocketFetchHandlerOptions
      | Provider<WebSocketFetchHandlerOptions>,
    httpHandler?: RequestHandler<any, any>
  );
  destroy(): void;
  handle(request: HttpRequest): Promise<{
    response: HttpResponse;
  }>;
  updateHttpClientConfig(
    key: keyof WebSocketFetchHandlerOptions,
    value: WebSocketFetchHandlerOptions[typeof key]
  ): void;
  httpHandlerConfigs(): WebSocketFetchHandlerOptions;
  private removeNotUsableSockets;
  private waitForReady;
  private connect;
}
