"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isObserverBatched = void 0;
exports.defaultNoopBatch = defaultNoopBatch;
exports.observerBatching = observerBatching;
var mobx_1 = require("mobx");
function defaultNoopBatch(callback) {
    callback();
}
function observerBatching(reactionScheduler) {
    if (!reactionScheduler) {
        reactionScheduler = defaultNoopBatch;
        if ("production" !== process.env.NODE_ENV) {
            console.warn("[MobX] Failed to get unstable_batched updates from react-dom / react-native");
        }
    }
    (0, mobx_1.configure)({ reactionScheduler: reactionScheduler });
}
var isObserverBatched = function () {
    if ("production" !== process.env.NODE_ENV) {
        console.warn("[MobX] Deprecated");
    }
    return true;
};
exports.isObserverBatched = isObserverBatched;
//# sourceMappingURL=observerBatching.js.map