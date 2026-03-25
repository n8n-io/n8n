/// <reference types="node" />
import http from 'http';
import { Gateway } from './gateway';
import type { Method, HTTPGatewayConfiguration, HTTPRequestParams } from './types';
import Response from '../response';
type Chunk = any;
export declare class HTTP extends Gateway {
    private canceled;
    get(): void;
    head(): void;
    post(): void;
    put(): void;
    patch(): void;
    delete(): void;
    performRequest(requestMethod: Method): void;
    onResponse(httpResponse: http.IncomingMessage, httpOptions: Partial<HTTPGatewayConfiguration>, requestParams: HTTPRequestParams): void;
    onError(e: Error): void;
    createResponse(httpResponse: http.IncomingMessage, rawData: Chunk): Response<import("../response").ParsedJSON>;
}
export default HTTP;
