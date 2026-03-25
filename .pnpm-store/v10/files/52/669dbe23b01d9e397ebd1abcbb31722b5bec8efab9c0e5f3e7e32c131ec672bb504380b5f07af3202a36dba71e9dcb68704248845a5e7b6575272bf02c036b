import { Request, RequestContext } from '../request';
import type { RequestParams } from '../types';
export interface RequestFactoryArgs extends RequestParams {
    method?: string;
    path?: string;
    context?: RequestContext;
}
/**
 * Create a request to use in tests
 * @returns Request
 */
export declare const requestFactory: ({ method, host, path, auth, body, headers, params, timeout, context, ...rest }?: RequestFactoryArgs) => Request;
