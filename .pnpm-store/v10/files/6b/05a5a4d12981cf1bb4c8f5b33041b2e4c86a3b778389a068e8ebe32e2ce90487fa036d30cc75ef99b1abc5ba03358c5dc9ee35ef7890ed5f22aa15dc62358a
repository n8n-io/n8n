import { Gateway } from './gateway';
import Response from '../response';
import type { Method } from './types';
import type { Headers } from '../types';
export declare class XHR extends Gateway {
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
    createResponse(xmlHttpRequest: XMLHttpRequest): Response<import("../response").ParsedJSON>;
    setHeaders(xmlHttpRequest: XMLHttpRequest, customHeaders: Headers): void;
    createXHR(): XMLHttpRequest;
}
export default XHR;
