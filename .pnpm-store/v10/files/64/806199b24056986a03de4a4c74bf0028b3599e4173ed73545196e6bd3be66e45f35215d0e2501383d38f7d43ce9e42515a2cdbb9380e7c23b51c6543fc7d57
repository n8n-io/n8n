import type { ServeStaticOptions as BaseServeStaticOptions } from '../../middleware/serve-static';
import type { Env, MiddlewareHandler } from '../../types';
export type ServeStaticOptions<E extends Env = Env> = BaseServeStaticOptions<E> & {
    namespace?: unknown;
    manifest: object | string;
};
/**
 * @deprecated
 * `serveStatic` in the Cloudflare Workers adapter is deprecated.
 * You can serve static files directly using Cloudflare Static Assets.
 * @see https://developers.cloudflare.com/workers/static-assets/
 * Cloudflare Static Assets is currently in open beta. If this doesn't work for you,
 * please consider using Cloudflare Pages. You can start to create the Cloudflare Pages
 * application with the `npm create hono@latest` command.
 */
export declare const serveStatic: <E extends Env = Env>(options: ServeStaticOptions<E>) => MiddlewareHandler;
