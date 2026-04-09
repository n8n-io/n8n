import { b as Response, P as ParsedJSON } from '../index-Dky6y1YD.mjs';
import Gateway from './gateway.mjs';
import { Method } from './types.mjs';
import '../types.mjs';

/**
 * Gateway which uses the "fetch" implementation configured in "configs.fetch".
 * By default "configs.fetch" will receive the global fetch, this gateway doesn't
 * use browser specific code, with a proper "fetch" implementation it can also be
 * used with node.js
 */
declare class Fetch extends Gateway {
    get(): void;
    head(): void;
    post(): void;
    put(): void;
    patch(): void;
    delete(): void;
    performRequest(requestMethod: Method): void;
    createResponse(fetchResponse: globalThis.Response, data: string | ArrayBuffer | Buffer): Response<ParsedJSON>;
}

export { Fetch, Fetch as default };
