import { Env, Context, MiddlewareHandler } from 'hono';

type ServeStaticOptions<E extends Env = Env> = {
    /**
     * Root path, relative to current working directory from which the app was started. Absolute paths are not supported.
     */
    root?: string;
    path?: string;
    index?: string;
    precompressed?: boolean;
    rewriteRequestPath?: (path: string, c: Context<E>) => string;
    onFound?: (path: string, c: Context<E>) => void | Promise<void>;
    onNotFound?: (path: string, c: Context<E>) => void | Promise<void>;
};
declare const serveStatic: <E extends Env = any>(options?: ServeStaticOptions<E>) => MiddlewareHandler<E>;

export { type ServeStaticOptions, serveStatic };
