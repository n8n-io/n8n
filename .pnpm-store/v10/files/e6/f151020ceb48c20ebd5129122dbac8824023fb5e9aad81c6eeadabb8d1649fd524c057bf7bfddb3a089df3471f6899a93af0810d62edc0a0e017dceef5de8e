/// <reference types="node" />
import { Gateway } from './gateway';
import Response from '../response';
import type { Method } from './types';
/**
 * Gateway which uses the "fetch" implementation configured in "configs.fetch".
 * By default "configs.fetch" will receive the global fetch, this gateway doesn't
 * use browser specific code, with a proper "fetch" implementation it can also be
 * used with node.js
 */
export declare class Fetch extends Gateway {
    get(): void;
    head(): void;
    post(): void;
    put(): void;
    patch(): void;
    delete(): void;
    performRequest(requestMethod: Method): void;
    createResponse(fetchResponse: globalThis.Response, data: string | ArrayBuffer | Buffer): Response<import("../response").ParsedJSON>;
}
export default Fetch;
