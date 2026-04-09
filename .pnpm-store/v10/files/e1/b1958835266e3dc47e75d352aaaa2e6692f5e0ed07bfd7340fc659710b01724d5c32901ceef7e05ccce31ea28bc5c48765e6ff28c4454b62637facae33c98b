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
exports.AsyncLocalStorageContextManager = void 0;
const api_1 = require("@opentelemetry/api");
const async_hooks_1 = require("async_hooks");
const AbstractAsyncHooksContextManager_1 = require("./AbstractAsyncHooksContextManager");
class AsyncLocalStorageContextManager extends AbstractAsyncHooksContextManager_1.AbstractAsyncHooksContextManager {
    constructor() {
        super();
        this._asyncLocalStorage = new async_hooks_1.AsyncLocalStorage();
    }
    active() {
        var _a;
        return (_a = this._asyncLocalStorage.getStore()) !== null && _a !== void 0 ? _a : api_1.ROOT_CONTEXT;
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