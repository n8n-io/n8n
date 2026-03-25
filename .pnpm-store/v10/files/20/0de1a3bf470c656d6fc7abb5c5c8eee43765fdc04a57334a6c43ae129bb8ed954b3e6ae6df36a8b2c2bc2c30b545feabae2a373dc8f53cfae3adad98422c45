/**
 * @module
 * Dev Helper for Hono.
 */
import type { Hono } from '../../hono';
import type { Env } from '../../types';
interface ShowRoutesOptions {
    verbose?: boolean;
    colorize?: boolean;
}
interface RouteData {
    path: string;
    method: string;
    name: string;
    isMiddleware: boolean;
}
export declare const inspectRoutes: <E extends Env>(hono: Hono<E>) => RouteData[];
export declare const showRoutes: <E extends Env>(hono: Hono<E>, opts?: ShowRoutesOptions) => void;
export declare const getRouterName: <E extends Env>(app: Hono<E>) => string;
export {};
