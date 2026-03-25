import { IncomingMessage, ServerResponse, ServerOptions as ServerOptions$1, createServer, Server } from 'node:http';
import { Http2ServerRequest, Http2ServerResponse, ServerOptions as ServerOptions$3, createServer as createServer$2, SecureServerOptions, createSecureServer, Http2Server, Http2SecureServer } from 'node:http2';
import { ServerOptions as ServerOptions$2, createServer as createServer$1 } from 'node:https';

type HttpBindings = {
    incoming: IncomingMessage;
    outgoing: ServerResponse;
};
type Http2Bindings = {
    incoming: Http2ServerRequest;
    outgoing: Http2ServerResponse;
};
type FetchCallback = (request: Request, env: HttpBindings | Http2Bindings) => Promise<unknown> | unknown;
type NextHandlerOption = {
    fetch: FetchCallback;
};
type ServerType = Server | Http2Server | Http2SecureServer;
type createHttpOptions = {
    serverOptions?: ServerOptions$1;
    createServer?: typeof createServer;
};
type createHttpsOptions = {
    serverOptions?: ServerOptions$2;
    createServer?: typeof createServer$1;
};
type createHttp2Options = {
    serverOptions?: ServerOptions$3;
    createServer?: typeof createServer$2;
};
type createSecureHttp2Options = {
    serverOptions?: SecureServerOptions;
    createServer?: typeof createSecureServer;
};
type ServerOptions = createHttpOptions | createHttpsOptions | createHttp2Options | createSecureHttp2Options;
type Options = {
    fetch: FetchCallback;
    overrideGlobalObjects?: boolean;
    autoCleanupIncoming?: boolean;
    port?: number;
    hostname?: string;
} & ServerOptions;
type CustomErrorHandler = (err: unknown) => void | Response | Promise<void | Response>;

export type { CustomErrorHandler, FetchCallback, Http2Bindings, HttpBindings, NextHandlerOption, Options, ServerOptions, ServerType };
