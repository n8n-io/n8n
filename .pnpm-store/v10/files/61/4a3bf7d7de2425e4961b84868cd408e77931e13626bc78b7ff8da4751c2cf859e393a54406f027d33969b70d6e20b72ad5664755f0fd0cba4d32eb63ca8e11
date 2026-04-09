"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.observerBatching = exports.isObserverBatched = exports.clearTimers = exports._observerFinalizationRegistry = exports.useAsObservableSource = exports.useLocalStore = exports.useLocalObservable = exports.Observer = exports.observer = exports.enableStaticRendering = exports.isUsingStaticRendering = void 0;
exports.useObserver = useObserver;
exports.useStaticRendering = useStaticRendering;
require("./utils/assertEnvironment");
var reactBatchedUpdates_1 = require("./utils/reactBatchedUpdates");
var observerBatching_1 = require("./utils/observerBatching");
var utils_1 = require("./utils/utils");
var useObserver_1 = require("./useObserver");
var staticRendering_1 = require("./staticRendering");
var observerFinalizationRegistry_1 = require("./utils/observerFinalizationRegistry");
Object.defineProperty(exports, "_observerFinalizationRegistry", { enumerable: true, get: function () { return observerFinalizationRegistry_1.observerFinalizationRegistry; } });
(0, observerBatching_1.observerBatching)(reactBatchedUpdates_1.unstable_batchedUpdates);
var staticRendering_2 = require("./staticRendering");
Object.defineProperty(exports, "isUsingStaticRendering", { enumerable: true, get: function () { return staticRendering_2.isUsingStaticRendering; } });
Object.defineProperty(exports, "enableStaticRendering", { enumerable: true, get: function () { return staticRendering_2.enableStaticRendering; } });
var observer_1 = require("./observer");
Object.defineProperty(exports, "observer", { enumerable: true, get: function () { return observer_1.observer; } });
var ObserverComponent_1 = require("./ObserverComponent");
Object.defineProperty(exports, "Observer", { enumerable: true, get: function () { return ObserverComponent_1.Observer; } });
var useLocalObservable_1 = require("./useLocalObservable");
Object.defineProperty(exports, "useLocalObservable", { enumerable: true, get: function () { return useLocalObservable_1.useLocalObservable; } });
var useLocalStore_1 = require("./useLocalStore");
Object.defineProperty(exports, "useLocalStore", { enumerable: true, get: function () { return useLocalStore_1.useLocalStore; } });
var useAsObservableSource_1 = require("./useAsObservableSource");
Object.defineProperty(exports, "useAsObservableSource", { enumerable: true, get: function () { return useAsObservableSource_1.useAsObservableSource; } });
exports.clearTimers = (_a = observerFinalizationRegistry_1.observerFinalizationRegistry["finalizeAllImmediately"]) !== null && _a !== void 0 ? _a : (function () { });
function useObserver(fn, baseComponentName) {
    if (baseComponentName === void 0) { baseComponentName = "observed"; }
    if ("production" !== process.env.NODE_ENV) {
        (0, utils_1.useDeprecated)("[mobx-react-lite] 'useObserver(fn)' is deprecated. Use `<Observer>{fn}</Observer>` instead, or wrap the entire component in `observer`.");
    }
    return (0, useObserver_1.useObserver)(fn, baseComponentName);
}
var observerBatching_2 = require("./utils/observerBatching");
Object.defineProperty(exports, "isObserverBatched", { enumerable: true, get: function () { return observerBatching_2.isObserverBatched; } });
Object.defineProperty(exports, "observerBatching", { enumerable: true, get: function () { return observerBatching_2.observerBatching; } });
function useStaticRendering(enable) {
    if ("production" !== process.env.NODE_ENV) {
        console.warn("[mobx-react-lite] 'useStaticRendering' is deprecated, use 'enableStaticRendering' instead");
    }
    (0, staticRendering_1.enableStaticRendering)(enable);
}
//# sourceMappingURL=index.js.map