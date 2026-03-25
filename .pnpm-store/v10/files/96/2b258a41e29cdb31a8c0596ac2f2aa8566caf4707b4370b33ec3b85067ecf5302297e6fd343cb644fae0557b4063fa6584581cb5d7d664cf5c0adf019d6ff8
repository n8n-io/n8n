"use strict";
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KoaInstrumentation = void 0;
const api = require("@opentelemetry/api");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const types_1 = require("./types");
/** @knipignore */
const version_1 = require("./version");
const utils_1 = require("./utils");
const core_1 = require("@opentelemetry/core");
const internal_types_1 = require("./internal-types");
/** Koa instrumentation for OpenTelemetry */
class KoaInstrumentation extends instrumentation_1.InstrumentationBase {
    constructor(config = {}) {
        super(version_1.PACKAGE_NAME, version_1.PACKAGE_VERSION, config);
    }
    init() {
        return new instrumentation_1.InstrumentationNodeModuleDefinition('koa', ['>=2.0.0 <4'], (module) => {
            const moduleExports = module[Symbol.toStringTag] === 'Module'
                ? module.default // ESM
                : module; // CommonJS
            if (moduleExports == null) {
                return moduleExports;
            }
            if ((0, instrumentation_1.isWrapped)(moduleExports.prototype.use)) {
                this._unwrap(moduleExports.prototype, 'use');
            }
            this._wrap(moduleExports.prototype, 'use', this._getKoaUsePatch.bind(this));
            return module;
        }, (module) => {
            const moduleExports = module[Symbol.toStringTag] === 'Module'
                ? module.default // ESM
                : module; // CommonJS
            if ((0, instrumentation_1.isWrapped)(moduleExports.prototype.use)) {
                this._unwrap(moduleExports.prototype, 'use');
            }
        });
    }
    /**
     * Patches the Koa.use function in order to instrument each original
     * middleware layer which is introduced
     * @param {KoaMiddleware} middleware - the original middleware function
     */
    _getKoaUsePatch(original) {
        const plugin = this;
        return function use(middlewareFunction) {
            let patchedFunction;
            if (middlewareFunction.router) {
                patchedFunction = plugin._patchRouterDispatch(middlewareFunction);
            }
            else {
                patchedFunction = plugin._patchLayer(middlewareFunction, false);
            }
            return original.apply(this, [patchedFunction]);
        };
    }
    /**
     * Patches the dispatch function used by @koa/router. This function
     * goes through each routed middleware and adds instrumentation via a call
     * to the @function _patchLayer function.
     * @param {KoaMiddleware} dispatchLayer - the original dispatch function which dispatches
     * routed middleware
     */
    _patchRouterDispatch(dispatchLayer) {
        api.diag.debug('Patching @koa/router dispatch');
        const router = dispatchLayer.router;
        const routesStack = router?.stack ?? [];
        for (const pathLayer of routesStack) {
            const path = pathLayer.path;
            // Type cast needed: router.stack comes from @types/koa@2.x but we use @types/koa@3.x
            // See internal-types.ts for full explanation
            const pathStack = pathLayer.stack;
            for (let j = 0; j < pathStack.length; j++) {
                const routedMiddleware = pathStack[j];
                pathStack[j] = this._patchLayer(routedMiddleware, true, path);
            }
        }
        return dispatchLayer;
    }
    /**
     * Patches each individual @param middlewareLayer function in order to create the
     * span and propagate context. It does not create spans when there is no parent span.
     * @param {KoaMiddleware} middlewareLayer - the original middleware function.
     * @param {boolean} isRouter - tracks whether the original middleware function
     * was dispatched by the router originally
     * @param {string?} layerPath - if present, provides additional data from the
     * router about the routed path which the middleware is attached to
     */
    _patchLayer(middlewareLayer, isRouter, layerPath) {
        const layerType = isRouter ? types_1.KoaLayerType.ROUTER : types_1.KoaLayerType.MIDDLEWARE;
        // Skip patching layer if its ignored in the config
        if (middlewareLayer[internal_types_1.kLayerPatched] === true ||
            (0, utils_1.isLayerIgnored)(layerType, this.getConfig()))
            return middlewareLayer;
        if (middlewareLayer.constructor.name === 'GeneratorFunction' ||
            middlewareLayer.constructor.name === 'AsyncGeneratorFunction') {
            api.diag.debug('ignoring generator-based Koa middleware layer');
            return middlewareLayer;
        }
        middlewareLayer[internal_types_1.kLayerPatched] = true;
        api.diag.debug('patching Koa middleware layer');
        return async (context, next) => {
            const parent = api.trace.getSpan(api.context.active());
            if (parent === undefined) {
                return middlewareLayer(context, next);
            }
            const metadata = (0, utils_1.getMiddlewareMetadata)(context, middlewareLayer, isRouter, layerPath);
            const span = this.tracer.startSpan(metadata.name, {
                attributes: metadata.attributes,
            });
            const rpcMetadata = (0, core_1.getRPCMetadata)(api.context.active());
            if (rpcMetadata?.type === core_1.RPCType.HTTP && context._matchedRoute) {
                rpcMetadata.route = context._matchedRoute.toString();
            }
            const { requestHook } = this.getConfig();
            if (requestHook) {
                (0, instrumentation_1.safeExecuteInTheMiddle)(() => requestHook(span, {
                    context,
                    middlewareLayer,
                    layerType,
                }), e => {
                    if (e) {
                        api.diag.error('koa instrumentation: request hook failed', e);
                    }
                }, true);
            }
            const newContext = api.trace.setSpan(api.context.active(), span);
            return api.context.with(newContext, async () => {
                try {
                    return await middlewareLayer(context, next);
                }
                catch (err) {
                    span.recordException(err);
                    throw err;
                }
                finally {
                    span.end();
                }
            });
        };
    }
}
exports.KoaInstrumentation = KoaInstrumentation;
//# sourceMappingURL=instrumentation.js.map