// === Response ===
// ----------------

/**
 * gRPC response.
 */
export interface Response {
    status: number;

    message: object;

    headers: object;

    trailers: object;

    error: object;
}

export interface ConnectParams {
    /**
     * If `true` will connect to the gRPC server using plaintext i.e. insecure.
     */
    plaintext?: boolean;

    /**
     * If `true` connection will try to use the gRPC server reflection protocol.
     * https://github.com/grpc/grpc/blob/master/doc/server-reflection.md
     */
    reflect?: boolean;

    /**
     * Metadata to send with reflection request.
     */
    reflectMetadata?: object;

    /**
     * Connection timeout to use.
     */
    timeout?: string | number;

    /**
     *  Maximum message size in bytes the client can receive.
     */
    maxReceiveSize?: number;

    /**
     * Maximum message size in bytes the client can send.
     */
    maxSendSize?: number;

    /**
     * TLS settings of the connection.
     */
    tls?: TLSParams;
}

export interface TLSParams {
    /**
     *  PEM formatted client certificate.
     */
    cert: string;

    /**
     * PEM formatted client private key.
     */
    key: string;

    /**
     * Password for decrypting the client's private key.
     */
    password?: string;

    /**
     * PEM formatted string/strings of the certificate authorities.
     */
    cacerts?: string | string[];
}

export interface Params {
    /**
     * @deprecated Use metadata instead.
     */
    headers?: object;

    metadata?: object;

    tags?: object;

    timeout?: string | number;
}

export interface GrpcError {
    code: number;
    details: string[] | object[];
    message: string;
}

/**
 * This module provides a gRPC client for Remote Procedure Calls over HTTP/2.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-net-grpc/
 */
declare namespace grpc {
    /**
     * gRPC client to interact with a gRPC server.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-net-grpc/client/
     */
    class Client {
        protected __brand: never;

        constructor();

        /** Opens a connection to a gRPC server. */
        connect(address: string, params?: ConnectParams): void;

        /** Loads and parses the protocol buffer descriptors. */
        load(importPaths: string[], ...protoFiles: string[]): void;

        /** Loads a protoset and parses the protocol buffer descriptors */
        loadProtoset(protosetPath: string): void;

        /** Invokes an unary RPC request. */
        invoke(url: string, request: object, params?: Params): Response;

        /** Asynchronously invokes an unary RPC request. */
        asyncInvoke(url: string, request: object, params?: Params): Promise<Response>;

        /** Close the connection. */
        close(): void;
    }

    /**
     * StreamEvent describes the possible events that can be emitted
     * by a gRPC stream.
     */
    type StreamEvent =
        /**
         * Event fired when data has been received from the server.
         */
        | "data"
        /**
         * Event fired when a stream has been closed due to an error.
         */
        | "error"
        /**
         * Event fired when the stream closes.
         */
        | "end";

    /**
     * Stream allows you to use streaming RPCs.
     */
    class Stream {
        /**
         * The gRPC stream constructor, representing a single gRPC stream.
         *
         * @param client - the gRPC client to use, it must be connected.
         * @param url - the RPC method to call.
         * @param params - the parameters to use for the RPC call.
         */
        constructor(client: Client, url: string, params?: Params);

        /**
         * Set up handler functions for various events on the gRPC stream.
         *
         * @param event - the event to listen for
         * @param listener - the callback to invoke when the event is emitted
         */
        on(event: StreamEvent, listener: (data: object | GrpcError | undefined) => void): void;

        /**
         * Writes a request to the stream.
         *
         * @param request - the request (message) to send to the server
         */
        write(request: object): void;

        /**
         * Signals to the server that the client has finished sending messages.
         */
        end(): void;
    }

    const StatusOK: number;
    const StatusCanceled: number;
    const StatusUnknown: number;
    const StatusInvalidArgument: number;
    const StatusDeadlineExceeded: number;
    const StatusNotFound: number;
    const StatusAlreadyExists: number;
    const StatusPermissionDenied: number;
    const StatusResourceExhausted: number;
    const StatusFailedPrecondition: number;
    const StatusAborted: number;
    const StatusOutOfRange: number;
    const StatusUnimplemented: number;
    const StatusInternal: number;
    const StatusUnavailable: number;
    const StatusDataLoss: number;
    const StatusUnauthenticated: number;
}

export default grpc;
