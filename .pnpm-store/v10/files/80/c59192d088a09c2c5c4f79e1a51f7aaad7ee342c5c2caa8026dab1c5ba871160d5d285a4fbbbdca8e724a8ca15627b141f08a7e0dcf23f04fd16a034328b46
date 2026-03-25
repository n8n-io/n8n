import { configure } from "mobx";
export function defaultNoopBatch(callback) {
    callback();
}
export function observerBatching(reactionScheduler) {
    if (!reactionScheduler) {
        reactionScheduler = defaultNoopBatch;
        if ("production" !== process.env.NODE_ENV) {
            console.warn("[MobX] Failed to get unstable_batched updates from react-dom / react-native");
        }
    }
    configure({ reactionScheduler: reactionScheduler });
}
export var isObserverBatched = function () {
    if ("production" !== process.env.NODE_ENV) {
        console.warn("[MobX] Deprecated");
    }
    return true;
};
//# sourceMappingURL=observerBatching.js.map