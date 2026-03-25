import { OpenAPIV3 } from './types';
import { Spec, RouteMetadata } from './openapi.spec.loader';
export interface RoutePair {
    expressRoute: string;
    openApiRoute: string;
}
export declare class OpenApiContext {
    readonly apiDoc: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1;
    readonly expressRouteMap: {};
    readonly openApiRouteMap: {};
    readonly routes: RouteMetadata[];
    readonly ignoreUndocumented: boolean;
    readonly useRequestUrl: boolean;
    readonly serial: number;
    private readonly basePaths;
    private readonly ignorePaths;
    constructor(spec: Spec, ignorePaths: RegExp | Function, ignoreUndocumented?: boolean, useRequestUrl?: boolean);
    isManagedRoute(path: string): boolean;
    shouldIgnoreRoute(path: string): any;
    routePair(route: string): RoutePair;
    private methods;
    private buildRouteMaps;
}
