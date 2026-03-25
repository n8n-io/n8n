import type { Hono } from '../../hono';
import type { Env } from '../../types';
/**
 * Get dirname
 * @param path File Path
 * @returns Parent dir path
 */
export declare const dirname: (path: string) => string;
export declare const joinPaths: (...paths: string[]) => string;
interface FilterStaticGenerateRouteData {
    path: string;
}
export declare const filterStaticGenerateRoutes: <E extends Env>(hono: Hono<E>) => FilterStaticGenerateRouteData[];
export declare const isDynamicRoute: (path: string) => boolean;
export {};
