import * as http from 'http';
import * as https from 'https';
import * as net from 'net';

interface PlainObject {
  [key: string]: any;
}

declare class _HttpAgent extends http.Agent {
  constructor(opts?: AgentKeepAlive.HttpOptions);
  readonly statusChanged: boolean;
  createConnection(options: net.NetConnectOpts, cb?: Function): net.Socket;
  createSocket(req: http.IncomingMessage, options: http.RequestOptions, cb: Function): void;
  getCurrentStatus(): AgentKeepAlive.AgentStatus;
}

interface Constants {
  CURRENT_ID: Symbol;
  CREATE_ID: Symbol;
  INIT_SOCKET: Symbol;
  CREATE_HTTPS_CONNECTION: Symbol;
  SOCKET_CREATED_TIME: Symbol;
  SOCKET_NAME: Symbol;
  SOCKET_REQUEST_COUNT: Symbol;
  SOCKET_REQUEST_FINISHED_COUNT: Symbol;
}

/**
 * @deprecated instead use `import { HttpAgent } from 'agentkeepalive'; or `const HttpAgent = require('agentkeepalive').HttpAgent;`
 */
declare class AgentKeepAlive extends _HttpAgent {}

declare namespace AgentKeepAlive {
  export interface AgentStatus {
    createSocketCount: number;
    createSocketErrorCount: number;
    closeSocketCount: number;
    errorSocketCount: number;
    timeoutSocketCount: number;
    requestCount: number;
    freeSockets: PlainObject;
    sockets: PlainObject;
    requests: PlainObject;
  }

  interface CommonHttpOption {
    keepAlive?: boolean | undefined;
    freeSocketTimeout?: number | undefined;
    freeSocketKeepAliveTimeout?: number | undefined;
    timeout?: number | undefined;
    socketActiveTTL?: number | undefined;
  }

  export interface HttpOptions extends http.AgentOptions, CommonHttpOption { }
  export interface HttpsOptions extends https.AgentOptions, CommonHttpOption { }

  export class HttpAgent extends _HttpAgent {}
  export class HttpsAgent extends https.Agent {
    constructor(opts?: HttpsOptions);
    readonly statusChanged: boolean;
    createConnection(options: net.NetConnectOpts, cb?: Function): net.Socket;
    createSocket(req: http.IncomingMessage, options: http.RequestOptions, cb: Function): void;
    getCurrentStatus(): AgentStatus;
  }

  export const constants: Constants;
}

export = AgentKeepAlive;
