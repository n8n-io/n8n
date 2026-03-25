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
exports.ConnectInstrumentation = exports.ANONYMOUS_NAME = void 0;
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
const AttributeNames_1 = require("./enums/AttributeNames");
/** @knipignore */
const version_1 = require("./version");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const utils_1 = require("./utils");
exports.ANONYMOUS_NAME = 'anonymous';
/** Connect instrumentation for OpenTelemetry */
class ConnectInstrumentation extends instrumentation_1.InstrumentationBase {
    constructor(config = {}) {
        super(version_1.PACKAGE_NAME, version_1.PACKAGE_VERSION, config);
    }
    init() {
        return [
            new instrumentation_1.InstrumentationNodeModuleDefinition('connect', ['>=3.0.0 <4'], moduleExports => {
                return this._patchConstructor(moduleExports);
            }),
        ];
    }
    _patchApp(patchedApp) {
        if (!(0, instrumentation_1.isWrapped)(patchedApp.use)) {
            this._wrap(patchedApp, 'use', this._patchUse.bind(this));
        }
        if (!(0, instrumentation_1.isWrapped)(patchedApp.handle)) {
            this._wrap(patchedApp, 'handle', this._patchHandle.bind(this));
        }
    }
    _patchConstructor(original) {
        const instrumentation = this;
        return function (...args) {
            const app = original.apply(this, args);
            instrumentation._patchApp(app);
            return app;
        };
    }
    _patchNext(next, finishSpan) {
        return function nextFunction(err) {
            const result = next.apply(this, [err]);
            finishSpan();
            return result;
        };
    }
    _startSpan(routeName, middleWare) {
        let connectType;
        let connectName;
        let connectTypeName;
        if (routeName) {
            connectType = AttributeNames_1.ConnectTypes.REQUEST_HANDLER;
            connectTypeName = AttributeNames_1.ConnectNames.REQUEST_HANDLER;
            connectName = routeName;
        }
        else {
            connectType = AttributeNames_1.ConnectTypes.MIDDLEWARE;
            connectTypeName = AttributeNames_1.ConnectNames.MIDDLEWARE;
            connectName = middleWare.name || exports.ANONYMOUS_NAME;
        }
        const spanName = `${connectTypeName} - ${connectName}`;
        const options = {
            attributes: {
                [semantic_conventions_1.ATTR_HTTP_ROUTE]: routeName.length > 0 ? routeName : '/',
                [AttributeNames_1.AttributeNames.CONNECT_TYPE]: connectType,
                [AttributeNames_1.AttributeNames.CONNECT_NAME]: connectName,
            },
        };
        return this.tracer.startSpan(spanName, options);
    }
    _patchMiddleware(routeName, middleWare) {
        const instrumentation = this;
        const isErrorMiddleware = middleWare.length === 4;
        function patchedMiddleware() {
            if (!instrumentation.isEnabled()) {
                return middleWare.apply(this, arguments);
            }
            const [reqArgIdx, resArgIdx, nextArgIdx] = isErrorMiddleware
                ? [1, 2, 3]
                : [0, 1, 2];
            const req = arguments[reqArgIdx];
            const res = arguments[resArgIdx];
            const next = arguments[nextArgIdx];
            (0, utils_1.replaceCurrentStackRoute)(req, routeName);
            const rpcMetadata = (0, core_1.getRPCMetadata)(api_1.context.active());
            if (routeName && rpcMetadata?.type === core_1.RPCType.HTTP) {
                rpcMetadata.route = (0, utils_1.generateRoute)(req);
            }
            let spanName = '';
            if (routeName) {
                spanName = `request handler - ${routeName}`;
            }
            else {
                spanName = `middleware - ${middleWare.name || exports.ANONYMOUS_NAME}`;
            }
            const span = instrumentation._startSpan(routeName, middleWare);
            instrumentation._diag.debug('start span', spanName);
            let spanFinished = false;
            function finishSpan() {
                if (!spanFinished) {
                    spanFinished = true;
                    instrumentation._diag.debug(`finishing span ${span.name}`);
                    span.end();
                }
                else {
                    instrumentation._diag.debug(`span ${span.name} - already finished`);
                }
                res.removeListener('close', finishSpan);
            }
            res.addListener('close', finishSpan);
            arguments[nextArgIdx] = instrumentation._patchNext(next, finishSpan);
            return middleWare.apply(this, arguments);
        }
        Object.defineProperty(patchedMiddleware, 'length', {
            value: middleWare.length,
            writable: false,
            configurable: true,
        });
        return patchedMiddleware;
    }
    _patchUse(original) {
        const instrumentation = this;
        return function (...args) {
            const middleWare = args[args.length - 1];
            const routeName = (args[args.length - 2] || '');
            args[args.length - 1] = instrumentation._patchMiddleware(routeName, middleWare);
            return original.apply(this, args);
        };
    }
    _patchHandle(original) {
        const instrumentation = this;
        return function () {
            const [reqIdx, outIdx] = [0, 2];
            const req = arguments[reqIdx];
            const out = arguments[outIdx];
            const completeStack = (0, utils_1.addNewStackLayer)(req);
            if (typeof out === 'function') {
                arguments[outIdx] = instrumentation._patchOut(out, completeStack);
            }
            return original.apply(this, arguments);
        };
    }
    _patchOut(out, completeStack) {
        return function nextFunction(...args) {
            completeStack();
            return Reflect.apply(out, this, args);
        };
    }
}
exports.ConnectInstrumentation = ConnectInstrumentation;
//# sourceMappingURL=instrumentation.js.map