"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenApiSpecLoader = exports.sortRoutes = void 0;
const util_1 = require("../middlewares/parsers/util");
const index_1 = require("./index");
// Sort routes by most specific to least specific i.e. static routes before dynamic
// e.g. /users/my_route before /users/{id}
// Exported for tests
const sortRoutes = (r1, r2) => {
    const e1 = r1.expressRoute.replace(/\/:/g, '/~');
    const e2 = r2.expressRoute.replace(/\/:/g, '/~');
    if (e1.startsWith(e2))
        return -1;
    else if (e2.startsWith(e1))
        return 1;
    return e1 > e2 ? 1 : -1;
};
exports.sortRoutes = sortRoutes;
// Uniquely identify the Spec that is emitted
let serial = 0;
class OpenApiSpecLoader {
    constructor(opts) {
        this.framework = new index_1.OpenAPIFramework(opts);
    }
    async load() {
        return this.discoverRoutes();
    }
    async discoverRoutes() {
        const routes = [];
        const toExpressParams = this.toExpressParams;
        // const basePaths = this.framework.basePaths;
        // let apiDoc: OpenAPIV3.DocumentV3 | OpenAPIV3.DocumentV3_1 = null;
        // let basePaths: string[] = null;
        const { apiDoc, basePaths } = await this.framework.initialize({
            visitApi(ctx) {
                var _a, _b;
                const apiDoc = ctx.getApiDoc();
                const basePaths = ctx.basePaths;
                for (const bpa of basePaths) {
                    const bp = bpa.replace(/\/$/, '');
                    if (apiDoc.paths) {
                        for (const [path, methods] of Object.entries(apiDoc.paths)) {
                            for (const [method, schema] of Object.entries(methods)) {
                                if (method.startsWith('x-') ||
                                    ['parameters', 'summary', 'description'].includes(method)) {
                                    continue;
                                }
                                const pathParams = [
                                    ...((_a = schema.parameters) !== null && _a !== void 0 ? _a : []),
                                    ...((_b = methods.parameters) !== null && _b !== void 0 ? _b : []),
                                ]
                                    .map(param => (0, util_1.dereferenceParameter)(apiDoc, param))
                                    .filter(param => param.in === 'path')
                                    .map(param => param.name);
                                const openApiRoute = `${bp}${path}`;
                                const expressRoute = `${openApiRoute}`
                                    .split(':')
                                    .map(toExpressParams)
                                    .join('\\:');
                                routes.push({
                                    basePath: bp,
                                    expressRoute,
                                    openApiRoute,
                                    method: method.toUpperCase(),
                                    pathParams: Array.from(new Set(pathParams)),
                                });
                            }
                        }
                    }
                }
            },
        });
        routes.sort(exports.sortRoutes);
        serial = serial + 1;
        return {
            apiDoc,
            basePaths,
            routes,
            serial
        };
    }
    toExpressParams(part) {
        // substitute wildcard path with express equivalent
        // {/path} => /path(*) <--- RFC 6570 format (not supported by openapi)
        // const pass1 = part.replace(/\{(\/)([^\*]+)(\*)}/g, '$1:$2$3');
        //if wildcard path use new path-to-regex expected model
        if (/[*]/g.test(part)) {
            // /v1/{path}* => /v1/*path)
            // /v1/{path}(*) => /v1/*path)
            const pass1 = part.replace(/\/{([^}]+)}\({0,1}(\*)\){0,1}/g, '/$2$1');
            // substitute params with express equivalent
            // /path/{multi}/test/{/*path}=> /path/:multi/test/{/*path}
            return pass1.replace(/\{([^\/}]+)}/g, ':$1');
            //return pass1;
        }
        // instead create our own syntax that is compatible with express' pathToRegex
        // /{path}* => /:path*)
        // /{path}(*) => /:path*)
        const pass1 = part.replace(/\/{([^}]+)}\({0,1}(\*)\){0,1}/g, '/:$1$2');
        // substitute params with express equivalent
        // /path/{id} => /path/:id
        return pass1.replace(/\{([^}]+)}/g, ':$1');
    }
}
exports.OpenApiSpecLoader = OpenApiSpecLoader;
//# sourceMappingURL=openapi.spec.loader.js.map