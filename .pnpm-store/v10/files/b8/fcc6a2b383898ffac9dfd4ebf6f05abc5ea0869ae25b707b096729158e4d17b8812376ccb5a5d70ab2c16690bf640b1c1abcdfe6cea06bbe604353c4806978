import { b as Response, P as ParsedJSON } from '../index-Dky6y1YD.mjs';
import Gateway from './gateway.mjs';
import { Method } from './types.mjs';
import { Headers } from '../types.mjs';

declare class XHR extends Gateway {
    private canceled;
    private timer?;
    get(): void;
    head(): void;
    post(): void;
    put(): void;
    patch(): void;
    delete(): void;
    configureBinary(xmlHttpRequest: XMLHttpRequest): void;
    configureTimeout(xmlHttpRequest: XMLHttpRequest): void;
    configureAbort(xmlHttpRequest: XMLHttpRequest): void;
    configureCallbacks(xmlHttpRequest: XMLHttpRequest): void;
    performRequest(method: Method): void;
    createResponse(xmlHttpRequest: XMLHttpRequest): Response<ParsedJSON>;
    setHeaders(xmlHttpRequest: XMLHttpRequest, customHeaders: Headers): void;
    createXHR(): XMLHttpRequest;
}

export { XHR, XHR as default };
