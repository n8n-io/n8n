"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenApiContext = void 0;
class OpenApiContext {
    constructor(spec, ignorePaths, ignoreUndocumented = false, useRequestUrl = false) {
        this.expressRouteMap = {};
        this.openApiRouteMap = {};
        this.routes = [];
        this.apiDoc = spec.apiDoc;
        this.basePaths = spec.basePaths;
        this.routes = spec.routes;
        this.ignorePaths = ignorePaths;
        this.ignoreUndocumented = ignoreUndocumented;
        this.buildRouteMaps(spec.routes);
        this.useRequestUrl = useRequestUrl;
        this.serial = spec.serial;
    }
    isManagedRoute(path) {
        for (const bp of this.basePaths) {
            if (path.startsWith(bp) && !this.shouldIgnoreRoute(path)) {
                return true;
            }
        }
        return false;
    }
    shouldIgnoreRoute(path) {
        var _a;
        return typeof this.ignorePaths === 'function' ? this.ignorePaths(path) : (_a = this.ignorePaths) === null || _a === void 0 ? void 0 : _a.test(path);
    }
    routePair(route) {
        const methods = this.methods(route);
        if (methods) {
            return {
                expressRoute: methods._expressRoute,
                openApiRoute: methods._openApiRoute,
            };
        }
        return null;
    }
    methods(route) {
        const expressRouteMethods = this.expressRouteMap[route];
        if (expressRouteMethods)
            return expressRouteMethods;
        const openApiRouteMethods = this.openApiRouteMap[route];
        return openApiRouteMethods;
    }
    // side-effecting builds express/openapi route maps
    buildRouteMaps(routes) {
        for (const route of routes) {
            const { basePath, expressRoute, openApiRoute, method } = route;
            const routeMethods = this.expressRouteMap[expressRoute];
            const pathKey = openApiRoute.substring(basePath.length);
            const schema = this.apiDoc.paths[pathKey][method.toLowerCase()];
            if (routeMethods) {
                routeMethods[route.method] = schema;
            }
            else {
                const { basePath, openApiRoute, expressRoute } = route;
                const routeMethod = { [route.method]: schema };
                const routeDetails = Object.assign({ basePath, _openApiRoute: openApiRoute, _expressRoute: expressRoute }, routeMethod);
                this.expressRouteMap[route.expressRoute] = routeDetails;
                this.openApiRouteMap[route.openApiRoute] = routeDetails;
            }
        }
    }
}
exports.OpenApiContext = OpenApiContext;
//# sourceMappingURL=openapi.context.js.map