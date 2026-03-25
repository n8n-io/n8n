/// <reference types="node" />
import { IncomingMessage } from "http";
import { ClientHttp2Stream } from "http2";
import { InvokeFunction, InvokeMethod } from "../client";
import { HttpHandlerOptions } from "../http";
import { SdkStream } from "../serde";
import { NarrowedInvokeFunction, NarrowedInvokeMethod } from "./client-method-transforms";
/**
 * @public
 *
 * Creates a type with a given client type that narrows payload blob output
 * types to SdkStream<IncomingMessage>.
 *
 * This can be used for clients with the NodeHttpHandler requestHandler,
 * the default in Node.js when not using HTTP2.
 *
 * Usage example:
 * ```typescript
 * const client = new YourClient({}) as NodeJsClient<YourClient>;
 * ```
 */
export type NodeJsClient<ClientType extends object> = NarrowPayloadBlobOutputType<SdkStream<IncomingMessage>, ClientType>;
/**
 * @public
 * Variant of NodeJsClient for node:http2.
 */
export type NodeJsHttp2Client<ClientType extends object> = NarrowPayloadBlobOutputType<SdkStream<ClientHttp2Stream>, ClientType>;
/**
 * @public
 *
 * Creates a type with a given client type that narrows payload blob output
 * types to SdkStream<ReadableStream>.
 *
 * This can be used for clients with the FetchHttpHandler requestHandler,
 * which is the default in browser environments.
 *
 * Usage example:
 * ```typescript
 * const client = new YourClient({}) as BrowserClient<YourClient>;
 * ```
 */
export type BrowserClient<ClientType extends object> = NarrowPayloadBlobOutputType<SdkStream<ReadableStream>, ClientType>;
/**
 * @public
 *
 * Variant of BrowserClient for XMLHttpRequest.
 */
export type BrowserXhrClient<ClientType extends object> = NarrowPayloadBlobOutputType<SdkStream<ReadableStream | Blob>, ClientType>;
/**
 * @public
 *
 * Narrow a given Client's blob payload outputs to the given type T.
 */
export type NarrowPayloadBlobOutputType<T, ClientType extends object> = {
    [key in keyof ClientType]: [
        ClientType[key]
    ] extends [
        InvokeFunction<infer InputTypes, infer OutputTypes, infer ConfigType>
    ] ? NarrowedInvokeFunction<T, HttpHandlerOptions, InputTypes, OutputTypes, ConfigType> : [
        ClientType[key]
    ] extends [
        InvokeMethod<infer FunctionInputTypes, infer FunctionOutputTypes>
    ] ? NarrowedInvokeMethod<T, HttpHandlerOptions, FunctionInputTypes, FunctionOutputTypes> : ClientType[key];
};
