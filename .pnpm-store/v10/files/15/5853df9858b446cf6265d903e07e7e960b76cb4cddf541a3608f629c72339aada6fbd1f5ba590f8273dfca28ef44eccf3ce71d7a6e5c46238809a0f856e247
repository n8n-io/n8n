import { OpenAPIV3, OpenAPIFrameworkArgs } from './types';
export interface Spec {
    apiDoc: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1;
    basePaths: string[];
    routes: RouteMetadata[];
    serial: number;
}
export interface RouteMetadata {
    basePath: string;
    expressRoute: string;
    openApiRoute: string;
    method: string;
    pathParams: string[];
}
export declare const sortRoutes: (r1: any, r2: any) => 1 | -1;
export declare class OpenApiSpecLoader {
    private readonly framework;
    constructor(opts: OpenAPIFrameworkArgs);
    load(): Promise<Spec>;
    private discoverRoutes;
    private toExpressParams;
}
