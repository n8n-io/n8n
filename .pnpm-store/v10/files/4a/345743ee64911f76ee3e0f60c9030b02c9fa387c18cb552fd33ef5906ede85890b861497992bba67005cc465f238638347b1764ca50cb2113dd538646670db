import { Response } from '../response';
import { Request } from '../request';
import type { Headers } from '../types';
export interface ResponseFactoryArgs {
    method?: string;
    host?: string;
    path?: string;
    request?: Request;
    status?: number;
    data?: string | Record<string, unknown>;
    headers?: Headers;
    errors?: Array<Error | string>;
}
/**
 * Create a response to use in tests
 * @returns Response
 */
export declare const responseFactory: ({ method, host, path, request, status, data, headers, errors, }?: ResponseFactoryArgs) => Response<import("../response").ParsedJSON>;
