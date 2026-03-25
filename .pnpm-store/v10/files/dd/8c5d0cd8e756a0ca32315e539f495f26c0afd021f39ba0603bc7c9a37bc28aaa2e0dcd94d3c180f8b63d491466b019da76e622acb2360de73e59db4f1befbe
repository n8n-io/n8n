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
exports.ExpressInstrumentation = void 0;
const core_1 = require("@opentelemetry/core");
const api_1 = require("@opentelemetry/api");
const ExpressLayerType_1 = require("./enums/ExpressLayerType");
const AttributeNames_1 = require("./enums/AttributeNames");
const utils_1 = require("./utils");
/** @knipignore */
const version_1 = require("./version");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const internal_types_1 = require("./internal-types");
/** Express instrumentation for OpenTelemetry */
class ExpressInstrumentation extends instrumentation_1.InstrumentationBase {
    constructor(config = {}) {
        super(version_1.PACKAGE_NAME, version_1.PACKAGE_VERSION, config);
    }
    init() {
        return [
            new instrumentation_1.InstrumentationNodeModuleDefinition('express', ['>=4.0.0 <6'], moduleExports => {
                const isExpressWithRouterPrototype = typeof moduleExports?.Router?.prototype?.route === 'function';
                const routerProto = isExpressWithRouterPrototype
                    ? moduleExports.Router.prototype // Express v5
                    : moduleExports.Router; // Express v4
                // patch express.Router.route
                if ((0, instrumentation_1.isWrapped)(routerProto.route)) {
                    this._unwrap(routerProto, 'route');
                }
                this._wrap(routerProto, 'route', this._getRoutePatch());
                // patch express.Router.use
                if ((0, instrumentation_1.isWrapped)(routerProto.use)) {
                    this._unwrap(routerProto, 'use');
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                this._wrap(routerProto, 'use', this._getRouterUsePatch());
                // patch express.Application.use
                if ((0, instrumentation_1.isWrapped)(moduleExports.application.use)) {
                    this._unwrap(moduleExports.application, 'use');
                }
                this._wrap(moduleExports.application, 'use', 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                this._getAppUsePatch(isExpressWithRouterPrototype));
                return moduleExports;
            }, moduleExports => {
                if (moduleExports === undefined)
                    return;
                const isExpressWithRouterPrototype = typeof moduleExports?.Router?.prototype?.route === 'function';
                const routerProto = isExpressWithRouterPrototype
                    ? moduleExports.Router.prototype
                    : moduleExports.Router;
                this._unwrap(routerProto, 'route');
                this._unwrap(routerProto, 'use');
                this._unwrap(moduleExports.application, 'use');
            }),
        ];
    }
    /**
     * Get the patch for Router.route function
     */
    _getRoutePatch() {
        const instrumentation = this;
        return function (original) {
            return function route_trace(...args) {
                const route = original.apply(this, args);
                const layer = this.stack[this.stack.length - 1];
                instrumentation._applyPatch(layer, (0, utils_1.getLayerPath)(args));
                return route;
            };
        };
    }
    /**
     * Get the patch for Router.use function
     */
    _getRouterUsePatch() {
        const instrumentation = this;
        return function (original) {
            return function use(...args) {
                const route = original.apply(this, args);
                const layer = this.stack[this.stack.length - 1];
                instrumentation._applyPatch(layer, (0, utils_1.getLayerPath)(args));
                return route;
            };
        };
    }
    /**
     * Get the patch for Application.use function
     */
    _getAppUsePatch(isExpressWithRouterPrototype) {
        const instrumentation = this;
        return function (original) {
            return function use(...args) {
                // If we access app.router in express 4.x we trigger an assertion error.
                // This property existed in v3, was removed in v4 and then re-added in v5.
                const router = isExpressWithRouterPrototype
                    ? this.router
                    : this._router;
                const route = original.apply(this, args);
                if (router) {
                    const layer = router.stack[router.stack.length - 1];
                    instrumentation._applyPatch(layer, (0, utils_1.getLayerPath)(args));
                }
                return route;
            };
        };
    }
    /** Patch each express layer to create span and propagate context */
    _applyPatch(layer, layerPath) {
        const instrumentation = this;
        // avoid patching multiple times the same layer
        if (layer[internal_types_1.kLayerPatched] === true)
            return;
        layer[internal_types_1.kLayerPatched] = true;
        this._wrap(layer, 'handle', original => {
            // TODO: instrument error handlers
            if (original.length === 4)
                return original;
            const patched = function (req, res) {
                const { isLayerPathStored } = (0, utils_1.storeLayerPath)(req, layerPath);
                const constructedRoute = (0, utils_1.getConstructedRoute)(req);
                const actualMatchedRoute = (0, utils_1.getActualMatchedRoute)(req);
                const attributes = {
                    [semantic_conventions_1.ATTR_HTTP_ROUTE]: actualMatchedRoute,
                };
                const metadata = (0, utils_1.getLayerMetadata)(constructedRoute, layer, layerPath);
                const type = metadata.attributes[AttributeNames_1.AttributeNames.EXPRESS_TYPE];
                const rpcMetadata = (0, core_1.getRPCMetadata)(api_1.context.active());
                if (rpcMetadata?.type === core_1.RPCType.HTTP) {
                    rpcMetadata.route = actualMatchedRoute;
                }
                // verify against the config if the layer should be ignored
                if ((0, utils_1.isLayerIgnored)(metadata.name, type, instrumentation.getConfig())) {
                    if (type === ExpressLayerType_1.ExpressLayerType.MIDDLEWARE) {
                        req[internal_types_1._LAYERS_STORE_PROPERTY].pop();
                    }
                    return original.apply(this, arguments);
                }
                if (api_1.trace.getSpan(api_1.context.active()) === undefined) {
                    return original.apply(this, arguments);
                }
                const spanName = instrumentation._getSpanName({
                    request: req,
                    layerType: type,
                    route: constructedRoute,
                }, metadata.name);
                const span = instrumentation.tracer.startSpan(spanName, {
                    attributes: Object.assign(attributes, metadata.attributes),
                });
                const parentContext = api_1.context.active();
                let currentContext = api_1.trace.setSpan(parentContext, span);
                const { requestHook } = instrumentation.getConfig();
                if (requestHook) {
                    (0, instrumentation_1.safeExecuteInTheMiddle)(() => requestHook(span, {
                        request: req,
                        layerType: type,
                        route: constructedRoute,
                    }), e => {
                        if (e) {
                            api_1.diag.error('express instrumentation: request hook failed', e);
                        }
                    }, true);
                }
                let spanHasEnded = false;
                // TODO: Fix router spans (getRouterPath does not work properly) to
                // have useful names before removing this branch
                if (metadata.attributes[AttributeNames_1.AttributeNames.EXPRESS_TYPE] ===
                    ExpressLayerType_1.ExpressLayerType.ROUTER) {
                    span.end();
                    spanHasEnded = true;
                    currentContext = parentContext;
                }
                // listener for response.on('finish')
                const onResponseFinish = () => {
                    if (spanHasEnded === false) {
                        spanHasEnded = true;
                        span.end();
                    }
                };
                // verify we have a callback
                const args = Array.from(arguments);
                const callbackIdx = args.findIndex(arg => typeof arg === 'function');
                if (callbackIdx >= 0) {
                    arguments[callbackIdx] = function () {
                        // express considers anything but an empty value, "route" or "router"
                        // passed to its callback to be an error
                        const maybeError = arguments[0];
                        const isError = ![undefined, null, 'route', 'router'].includes(maybeError);
                        if (!spanHasEnded && isError) {
                            const [error, message] = (0, utils_1.asErrorAndMessage)(maybeError);
                            span.recordException(error);
                            span.setStatus({
                                code: api_1.SpanStatusCode.ERROR,
                                message,
                            });
                        }
                        if (spanHasEnded === false) {
                            spanHasEnded = true;
                            req.res?.removeListener('finish', onResponseFinish);
                            span.end();
                        }
                        if (!(req.route && isError) && isLayerPathStored) {
                            req[internal_types_1._LAYERS_STORE_PROPERTY].pop();
                        }
                        const callback = args[callbackIdx];
                        return api_1.context.bind(parentContext, callback).apply(this, arguments);
                    };
                }
                try {
                    return api_1.context.bind(currentContext, original).apply(this, arguments);
                }
                catch (anyError) {
                    const [error, message] = (0, utils_1.asErrorAndMessage)(anyError);
                    span.recordException(error);
                    span.setStatus({
                        code: api_1.SpanStatusCode.ERROR,
                        message,
                    });
                    throw anyError;
                }
                finally {
                    /**
                     * At this point if the callback wasn't called, that means either the
                     * layer is asynchronous (so it will call the callback later on) or that
                     * the layer directly ends the http response, so we'll hook into the "finish"
                     * event to handle the later case.
                     */
                    if (!spanHasEnded) {
                        res.once('finish', onResponseFinish);
                    }
                }
            };
            // `handle` isn't just a regular function in some cases. It also contains
            // some properties holding metadata and state so we need to proxy them
            // through through patched function
            // ref: https://github.com/open-telemetry/opentelemetry-js-contrib/issues/1950
            // Also some apps/libs do their own patching before OTEL and have these properties
            // in the proptotype. So we use a `for...in` loop to get own properties and also
            // any enumerable prop in the prototype chain
            // ref: https://github.com/open-telemetry/opentelemetry-js-contrib/issues/2271
            for (const key in original) {
                Object.defineProperty(patched, key, {
                    get() {
                        return original[key];
                    },
                    set(value) {
                        original[key] = value;
                    },
                });
            }
            return patched;
        });
    }
    _getSpanName(info, defaultName) {
        const { spanNameHook } = this.getConfig();
        if (!(spanNameHook instanceof Function)) {
            return defaultName;
        }
        try {
            return spanNameHook(info, defaultName) ?? defaultName;
        }
        catch (err) {
            api_1.diag.error('express instrumentation: error calling span name rewrite hook', err);
            return defaultName;
        }
    }
}
exports.ExpressInstrumentation = ExpressInstrumentation;
//# sourceMappingURL=instrumentation.js.map