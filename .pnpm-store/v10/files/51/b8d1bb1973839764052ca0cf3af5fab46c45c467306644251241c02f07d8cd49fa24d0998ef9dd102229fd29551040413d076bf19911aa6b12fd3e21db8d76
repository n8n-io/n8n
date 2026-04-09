"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsyncLocalStorageContextManager = void 0;
const api_1 = require("@opentelemetry/api");
const async_hooks_1 = require("async_hooks");
const AbstractAsyncHooksContextManager_1 = require("./AbstractAsyncHooksContextManager");
class AsyncLocalStorageContextManager extends AbstractAsyncHooksContextManager_1.AbstractAsyncHooksContextManager {
    _asyncLocalStorage;
    constructor() {
        super();
        this._asyncLocalStorage = new async_hooks_1.AsyncLocalStorage();
    }
    active() {
        return this._asyncLocalStorage.getStore() ?? api_1.ROOT_CONTEXT;
    }
    with(context, fn, thisArg, ...args) {
        const cb = thisArg == null ? fn : fn.bind(thisArg);
        return this._asyncLocalStorage.run(context, cb, ...args);
    }
    enable() {
        return this;
    }
    disable() {
        this._asyncLocalStorage.disable();
        return this;
    }
}
exports.AsyncLocalStorageContextManager = AsyncLocalStorageContextManager;
//# sourceMappingURL=AsyncLocalStorageContextManager.js.map