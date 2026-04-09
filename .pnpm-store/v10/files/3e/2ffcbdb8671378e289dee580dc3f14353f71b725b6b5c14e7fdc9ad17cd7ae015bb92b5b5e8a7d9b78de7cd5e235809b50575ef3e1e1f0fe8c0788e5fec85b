import { b as Response, P as ParsedJSON } from '../index-Dky6y1YD.mjs';
import Gateway from './gateway.mjs';
import { Method, HTTPGatewayConfiguration, HTTPRequestParams } from './types.mjs';
import '../types.mjs';

type Chunk = any;
declare class HTTP extends Gateway {
    private canceled;
    get(): void;
    head(): void;
    post(): void;
    put(): void;
    patch(): void;
    delete(): void;
    performRequest(requestMethod: Method): void;
    onResponse(httpResponse: HTTP.IncomingMessage, httpOptions: Partial<HTTPGatewayConfiguration>, requestParams: HTTPRequestParams): void;
    onError(e: Error): void;
    createResponse(httpResponse: HTTP.IncomingMessage, rawData: Chunk): Response<ParsedJSON>;
}

export { HTTP, HTTP as default };
