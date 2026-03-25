import { configure } from "mobx"

export function defaultNoopBatch(callback: () => void) {
    callback()
}

export function observerBatching(reactionScheduler: any) {
    if (!reactionScheduler) {
        reactionScheduler = defaultNoopBatch
        if ("production" !== process.env.NODE_ENV) {
            console.warn(
                "[MobX] Failed to get unstable_batched updates from react-dom / react-native"
            )
        }
    }
    configure({ reactionScheduler })
}

export const isObserverBatched = () => {
    if ("production" !== process.env.NODE_ENV) {
        console.warn("[MobX] Deprecated")
    }

    return true
}
