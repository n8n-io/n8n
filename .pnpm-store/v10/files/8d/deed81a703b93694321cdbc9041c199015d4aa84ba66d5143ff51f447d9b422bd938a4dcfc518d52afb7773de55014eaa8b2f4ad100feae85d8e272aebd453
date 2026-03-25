"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isObserverBatched = exports.observerBatching = exports.defaultNoopBatch = void 0;
var mobx_1 = require("mobx");
function defaultNoopBatch(callback) {
    callback();
}
exports.defaultNoopBatch = defaultNoopBatch;
function observerBatching(reactionScheduler) {
    if (!reactionScheduler) {
        reactionScheduler = defaultNoopBatch;
        if ("production" !== process.env.NODE_ENV) {
            console.warn("[MobX] Failed to get unstable_batched updates from react-dom / react-native");
        }
    }
    (0, mobx_1.configure)({ reactionScheduler: reactionScheduler });
}
exports.observerBatching = observerBatching;
var isObserverBatched = function () {
    if ("production" !== process.env.NODE_ENV) {
        console.warn("[MobX] Deprecated");
    }
    return true;
};
exports.isObserverBatched = isObserverBatched;
//# sourceMappingURL=observerBatching.js.map