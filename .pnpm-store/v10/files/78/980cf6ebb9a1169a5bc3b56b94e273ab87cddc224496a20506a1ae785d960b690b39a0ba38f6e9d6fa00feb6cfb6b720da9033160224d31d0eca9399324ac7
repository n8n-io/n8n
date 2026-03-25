/// <reference types="node" />

import * as http2 from "http2";
import * as net from "net";
import { Stream } from "stream";
import * as tls from "tls";

export {};

declare namespace http2wrapper {
    interface CreateUnixConnectionOptions extends http2.ClientSessionOptions, http2.SecureClientSessionOptions {
        socketPath: string;
    }

    type MappedHeaders = http2.IncomingHttpHeaders & http2.IncomingHttpStatusHeader & {
        "set-cookie"?: string[];
    };

    class Request extends Stream {
        constructor(protocol: "http:" | "https:", options: Http2Options);

        createUnixConnection(authority: any, options: CreateUnixConnectionOptions): net.Socket | tls.TLSSocket;
        setNoDelay(bool: boolean): void;
        getFrame(): http2.ClientHttp2Stream;
        mapToHttpHeader(headers: http2.IncomingHttpHeaders & http2.IncomingHttpStatusHeader): MappedHeaders;
        mapToHttp2Header(headers: MappedHeaders): Record<string, string | undefined>;
        setHeader(name: string, value: string): void;
        getHeader(name: string): string | string[] | undefined;
        write(chunk: any, encoding: BufferEncoding): boolean;
        end(data: any): void;
        abort(data: any): void;
    }

    interface Http2Options {
        port?: number;
        host?: string;
        method: string;
        path: string;
        socketPath?: string;
    }

    interface Http2Wrapper {
        request(options: Http2Options): Request;
    }
}

export type Request = http2wrapper.Request;

export function setProtocol(protocol: "http:" | "https:"): http2wrapper.Http2Wrapper;
