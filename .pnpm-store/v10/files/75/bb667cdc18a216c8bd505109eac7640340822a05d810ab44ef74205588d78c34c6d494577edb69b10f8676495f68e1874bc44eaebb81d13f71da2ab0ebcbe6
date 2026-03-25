/// <reference types="koa__router" />
import type { Middleware, ParameterizedContext, DefaultState } from 'koa';
import type * as Router from '@koa/router';
/**
 * Type compatibility note:
 *
 * This package uses @types/koa@3.x, but @types/koa__router@12.x depends on
 * @types/koa@2.x. This creates type conflicts when working with router middleware.
 * At runtime, koa@3.x is used throughout, so all methods exist and work correctly.
 *
 * The type casts in instrumentation.ts are necessary to bridge this gap.
 *
 * TODO: Remove type casts when @types/koa__router@13+ with @types/koa@3.x support is available
 */
export type KoaContext = ParameterizedContext<DefaultState, Router.RouterParamContext>;
export type KoaMiddleware = Middleware<DefaultState, KoaContext> & {
    router?: Router;
};
/**
 * This symbol is used to mark a Koa layer as being already instrumented
 * since its possible to use a given layer multiple times (ex: middlewares)
 */
export declare const kLayerPatched: unique symbol;
export type KoaPatchedMiddleware = KoaMiddleware & {
    [kLayerPatched]?: boolean;
};
//# sourceMappingURL=internal-types.d.ts.map