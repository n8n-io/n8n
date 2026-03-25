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
exports.HapiInstrumentation = void 0;
const api = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const instrumentation_1 = require("@opentelemetry/instrumentation");
/** @knipignore */
const version_1 = require("./version");
const internal_types_1 = require("./internal-types");
const utils_1 = require("./utils");
/** Hapi instrumentation for OpenTelemetry */
class HapiInstrumentation extends instrumentation_1.InstrumentationBase {
    _semconvStability;
    constructor(config = {}) {
        super(version_1.PACKAGE_NAME, version_1.PACKAGE_VERSION, config);
        this._semconvStability = (0, instrumentation_1.semconvStabilityFromStr)('http', process.env.OTEL_SEMCONV_STABILITY_OPT_IN);
    }
    init() {
        return new instrumentation_1.InstrumentationNodeModuleDefinition(internal_types_1.HapiComponentName, ['>=17.0.0 <22'], (module) => {
            const moduleExports = module[Symbol.toStringTag] === 'Module' ? module.default : module;
            if (!(0, instrumentation_1.isWrapped)(moduleExports.server)) {
                this._wrap(moduleExports, 'server', this._getServerPatch.bind(this));
            }
            if (!(0, instrumentation_1.isWrapped)(moduleExports.Server)) {
                this._wrap(moduleExports, 'Server', this._getServerPatch.bind(this));
            }
            return moduleExports;
        }, (module) => {
            const moduleExports = module[Symbol.toStringTag] === 'Module' ? module.default : module;
            this._massUnwrap([moduleExports], ['server', 'Server']);
        });
    }
    /**
     * Patches the Hapi.server and Hapi.Server functions in order to instrument
     * the server.route, server.ext, and server.register functions via calls to the
     * @function _getServerRoutePatch, @function _getServerExtPatch, and
     * @function _getServerRegisterPatch functions
     * @param original - the original Hapi Server creation function
     */
    _getServerPatch(original) {
        const instrumentation = this;
        const self = this;
        return function server(opts) {
            const newServer = original.apply(this, [opts]);
            self._wrap(newServer, 'route', originalRouter => {
                return instrumentation._getServerRoutePatch.bind(instrumentation)(originalRouter);
            });
            // Casting as any is necessary here due to multiple overloads on the Hapi.ext
            // function, which requires supporting a variety of different parameters
            // as extension inputs
            self._wrap(newServer, 'ext', originalExtHandler => {
                return instrumentation._getServerExtPatch.bind(instrumentation)(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                originalExtHandler);
            });
            // Casting as any is necessary here due to multiple overloads on the Hapi.Server.register
            // function, which requires supporting a variety of different types of Plugin inputs
            self._wrap(newServer, 'register', 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            instrumentation._getServerRegisterPatch.bind(instrumentation));
            return newServer;
        };
    }
    /**
     * Patches the plugin register function used by the Hapi Server. This function
     * goes through each plugin that is being registered and adds instrumentation
     * via a call to the @function _wrapRegisterHandler function.
     * @param {RegisterFunction<T>} original - the original register function which
     * registers each plugin on the server
     */
    _getServerRegisterPatch(original) {
        const instrumentation = this;
        return function register(pluginInput, options) {
            if (Array.isArray(pluginInput)) {
                for (const pluginObj of pluginInput) {
                    const plugin = (0, utils_1.getPluginFromInput)(pluginObj);
                    instrumentation._wrapRegisterHandler(plugin);
                }
            }
            else {
                const plugin = (0, utils_1.getPluginFromInput)(pluginInput);
                instrumentation._wrapRegisterHandler(plugin);
            }
            return original.apply(this, [pluginInput, options]);
        };
    }
    /**
     * Patches the Server.ext function which adds extension methods to the specified
     * point along the request lifecycle. This function accepts the full range of
     * accepted input into the standard Hapi `server.ext` function. For each extension,
     * it adds instrumentation to the handler via a call to the @function _wrapExtMethods
     * function.
     * @param original - the original ext function which adds the extension method to the server
     * @param {string} [pluginName] - if present, represents the name of the plugin responsible
     * for adding this server extension. Else, signifies that the extension was added directly
     */
    _getServerExtPatch(original, pluginName) {
        const instrumentation = this;
        return function ext(...args) {
            if (Array.isArray(args[0])) {
                const eventsList = args[0];
                for (let i = 0; i < eventsList.length; i++) {
                    const eventObj = eventsList[i];
                    if ((0, utils_1.isLifecycleExtType)(eventObj.type)) {
                        const lifecycleEventObj = eventObj;
                        const handler = instrumentation._wrapExtMethods(lifecycleEventObj.method, eventObj.type, pluginName);
                        lifecycleEventObj.method = handler;
                        eventsList[i] = lifecycleEventObj;
                    }
                }
                return original.apply(this, args);
            }
            else if ((0, utils_1.isDirectExtInput)(args)) {
                const extInput = args;
                const method = extInput[1];
                const handler = instrumentation._wrapExtMethods(method, extInput[0], pluginName);
                return original.apply(this, [extInput[0], handler, extInput[2]]);
            }
            else if ((0, utils_1.isLifecycleExtEventObj)(args[0])) {
                const lifecycleEventObj = args[0];
                const handler = instrumentation._wrapExtMethods(lifecycleEventObj.method, lifecycleEventObj.type, pluginName);
                lifecycleEventObj.method = handler;
                return original.call(this, lifecycleEventObj);
            }
            return original.apply(this, args);
        };
    }
    /**
     * Patches the Server.route function. This function accepts either one or an array
     * of Hapi.ServerRoute objects and adds instrumentation on each route via a call to
     * the @function _wrapRouteHandler function.
     * @param {HapiServerRouteInputMethod} original - the original route function which adds
     * the route to the server
     * @param {string} [pluginName] - if present, represents the name of the plugin responsible
     * for adding this server route. Else, signifies that the route was added directly
     */
    _getServerRoutePatch(original, pluginName) {
        const instrumentation = this;
        return function route(route) {
            if (Array.isArray(route)) {
                for (let i = 0; i < route.length; i++) {
                    const newRoute = instrumentation._wrapRouteHandler.call(instrumentation, route[i], pluginName);
                    route[i] = newRoute;
                }
            }
            else {
                route = instrumentation._wrapRouteHandler.call(instrumentation, route, pluginName);
            }
            return original.apply(this, [route]);
        };
    }
    /**
     * Wraps newly registered plugins to add instrumentation to the plugin's clone of
     * the original server. Specifically, wraps the server.route and server.ext functions
     * via calls to @function _getServerRoutePatch and @function _getServerExtPatch
     * @param {Hapi.Plugin<T>} plugin - the new plugin which is being instrumented
     */
    _wrapRegisterHandler(plugin) {
        const instrumentation = this;
        const pluginName = (0, utils_1.getPluginName)(plugin);
        const oldRegister = plugin.register;
        const self = this;
        const newRegisterHandler = function (server, options) {
            self._wrap(server, 'route', original => {
                return instrumentation._getServerRoutePatch.bind(instrumentation)(original, pluginName);
            });
            // Casting as any is necessary here due to multiple overloads on the Hapi.ext
            // function, which requires supporting a variety of different parameters
            // as extension inputs
            self._wrap(server, 'ext', originalExtHandler => {
                return instrumentation._getServerExtPatch.bind(instrumentation)(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                originalExtHandler, pluginName);
            });
            return oldRegister.call(this, server, options);
        };
        plugin.register = newRegisterHandler;
    }
    /**
     * Wraps request extension methods to add instrumentation to each new extension handler.
     * Patches each individual extension in order to create the
     * span and propagate context. It does not create spans when there is no parent span.
     * @param {PatchableExtMethod | PatchableExtMethod[]} method - the request extension
     * handler which is being instrumented
     * @param {Hapi.ServerRequestExtType} extPoint - the point in the Hapi request lifecycle
     * which this extension targets
     * @param {string} [pluginName] - if present, represents the name of the plugin responsible
     * for adding this server route. Else, signifies that the route was added directly
     */
    _wrapExtMethods(method, extPoint, pluginName) {
        const instrumentation = this;
        if (method instanceof Array) {
            for (let i = 0; i < method.length; i++) {
                method[i] = instrumentation._wrapExtMethods(method[i], extPoint);
            }
            return method;
        }
        else if ((0, utils_1.isPatchableExtMethod)(method)) {
            if (method[internal_types_1.handlerPatched] === true)
                return method;
            method[internal_types_1.handlerPatched] = true;
            const newHandler = async function (...params) {
                if (api.trace.getSpan(api.context.active()) === undefined) {
                    return await method.apply(this, params);
                }
                const metadata = (0, utils_1.getExtMetadata)(extPoint, pluginName);
                const span = instrumentation.tracer.startSpan(metadata.name, {
                    attributes: metadata.attributes,
                });
                try {
                    return await api.context.with(api.trace.setSpan(api.context.active(), span), method, undefined, ...params);
                }
                catch (err) {
                    span.recordException(err);
                    span.setStatus({
                        code: api.SpanStatusCode.ERROR,
                        message: err.message,
                    });
                    throw err;
                }
                finally {
                    span.end();
                }
            };
            return newHandler;
        }
        return method;
    }
    /**
     * Patches each individual route handler method in order to create the
     * span and propagate context. It does not create spans when there is no parent span.
     * @param {PatchableServerRoute} route - the route handler which is being instrumented
     * @param {string} [pluginName] - if present, represents the name of the plugin responsible
     * for adding this server route. Else, signifies that the route was added directly
     */
    _wrapRouteHandler(route, pluginName) {
        const instrumentation = this;
        if (route[internal_types_1.handlerPatched] === true)
            return route;
        route[internal_types_1.handlerPatched] = true;
        const wrapHandler = oldHandler => {
            return async function (...params) {
                if (api.trace.getSpan(api.context.active()) === undefined) {
                    return await oldHandler.call(this, ...params);
                }
                const rpcMetadata = (0, core_1.getRPCMetadata)(api.context.active());
                if (rpcMetadata?.type === core_1.RPCType.HTTP) {
                    rpcMetadata.route = route.path;
                }
                const metadata = (0, utils_1.getRouteMetadata)(route, instrumentation._semconvStability, pluginName);
                const span = instrumentation.tracer.startSpan(metadata.name, {
                    attributes: metadata.attributes,
                });
                try {
                    return await api.context.with(api.trace.setSpan(api.context.active(), span), () => oldHandler.call(this, ...params));
                }
                catch (err) {
                    span.recordException(err);
                    span.setStatus({
                        code: api.SpanStatusCode.ERROR,
                        message: err.message,
                    });
                    throw err;
                }
                finally {
                    span.end();
                }
            };
        };
        if (typeof route.handler === 'function') {
            route.handler = wrapHandler(route.handler);
        }
        else if (typeof route.options === 'function') {
            const oldOptions = route.options;
            route.options = function (server) {
                const options = oldOptions(server);
                if (typeof options.handler === 'function') {
                    options.handler = wrapHandler(options.handler);
                }
                return options;
            };
        }
        else if (typeof route.options?.handler === 'function') {
            route.options.handler = wrapHandler(route.options.handler);
        }
        return route;
    }
}
exports.HapiInstrumentation = HapiInstrumentation;
//# sourceMappingURL=instrumentation.js.map