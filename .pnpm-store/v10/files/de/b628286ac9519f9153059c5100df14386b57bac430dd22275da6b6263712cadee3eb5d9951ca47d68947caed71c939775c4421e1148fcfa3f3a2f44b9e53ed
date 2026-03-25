import type { Hono } from '../../hono';
import type { BlankSchema, Env, Input, MiddlewareHandler, Schema } from '../../types';
type Params<P extends string = any> = Record<P, string | string[]>;
export type EventContext<Env = {}, P extends string = any, Data = Record<string, unknown>> = {
    request: Request;
    functionPath: string;
    waitUntil: (promise: Promise<unknown>) => void;
    passThroughOnException: () => void;
    props: any;
    next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
    env: Env & {
        ASSETS: {
            fetch: typeof fetch;
        };
    };
    params: Params<P>;
    data: Data;
};
declare type PagesFunction<Env = unknown, Params extends string = any, Data extends Record<string, unknown> = Record<string, unknown>> = (context: EventContext<Env, Params, Data>) => Response | Promise<Response>;
export declare const handle: <E extends Env = Env, S extends Schema = BlankSchema, BasePath extends string = "/">(app: Hono<E, S, BasePath>) => PagesFunction<E["Bindings"]>;
export declare function handleMiddleware<E extends Env = {}, P extends string = any, I extends Input = {}>(middleware: MiddlewareHandler<E & {
    Bindings: {
        eventContext: EventContext;
    };
}, P, I>): PagesFunction<E['Bindings']>;
/**
 *
 * @description `serveStatic()` is for advanced mode:
 * https://developers.cloudflare.com/pages/platform/functions/advanced-mode/#set-up-a-function
 *
 */
export declare const serveStatic: () => MiddlewareHandler;
export {};
