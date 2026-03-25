import type { Context } from '../../context';
import type { Env, MiddlewareHandler } from '../../types';
export declare const SSG_CONTEXT = "HONO_SSG_CONTEXT";
export declare const X_HONO_DISABLE_SSG_HEADER_KEY = "x-hono-disable-ssg";
/**
 * @deprecated
 * Use `X_HONO_DISABLE_SSG_HEADER_KEY` instead.
 * This constant will be removed in the next minor version.
 */
export declare const SSG_DISABLED_RESPONSE: Response;
interface SSGParam {
    [key: string]: string;
}
export type SSGParams = SSGParam[];
interface SSGParamsMiddleware {
    <E extends Env = Env>(generateParams: (c: Context<E>) => SSGParams | Promise<SSGParams>): MiddlewareHandler<E>;
    <E extends Env = Env>(params: SSGParams): MiddlewareHandler<E>;
}
export type AddedSSGDataRequest = Request & {
    ssgParams?: SSGParams;
};
/**
 * Define SSG Route
 */
export declare const ssgParams: SSGParamsMiddleware;
/**
 * @experimental
 * `isSSGContext` is an experimental feature.
 * The API might be changed.
 */
export declare const isSSGContext: (c: Context) => boolean;
/**
 * @experimental
 * `disableSSG` is an experimental feature.
 * The API might be changed.
 */
export declare const disableSSG: () => MiddlewareHandler;
/**
 * @experimental
 * `onlySSG` is an experimental feature.
 * The API might be changed.
 */
export declare const onlySSG: () => MiddlewareHandler;
export {};
