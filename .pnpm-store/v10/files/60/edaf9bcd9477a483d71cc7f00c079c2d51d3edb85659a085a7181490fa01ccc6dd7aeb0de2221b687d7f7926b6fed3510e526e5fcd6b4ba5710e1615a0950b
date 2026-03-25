import "./utils/assertEnvironment"

import { unstable_batchedUpdates as batch } from "./utils/reactBatchedUpdates"
import { observerBatching } from "./utils/observerBatching"
import { useDeprecated } from "./utils/utils"
import { useObserver as useObserverOriginal } from "./useObserver"
import { enableStaticRendering } from "./staticRendering"
import { observerFinalizationRegistry } from "./utils/observerFinalizationRegistry"

observerBatching(batch)

export { isUsingStaticRendering, enableStaticRendering } from "./staticRendering"
export { observer, IObserverOptions } from "./observer"
export { Observer } from "./ObserverComponent"
export { useLocalObservable } from "./useLocalObservable"
export { useLocalStore } from "./useLocalStore"
export { useAsObservableSource } from "./useAsObservableSource"

export { observerFinalizationRegistry as _observerFinalizationRegistry }
export const clearTimers = observerFinalizationRegistry["finalizeAllImmediately"] ?? (() => {})

export function useObserver<T>(fn: () => T, baseComponentName: string = "observed"): T {
    if ("production" !== process.env.NODE_ENV) {
        useDeprecated(
            "[mobx-react-lite] 'useObserver(fn)' is deprecated. Use `<Observer>{fn}</Observer>` instead, or wrap the entire component in `observer`."
        )
    }
    return useObserverOriginal(fn, baseComponentName)
}

export { isObserverBatched, observerBatching } from "./utils/observerBatching"

export function useStaticRendering(enable: boolean) {
    if ("production" !== process.env.NODE_ENV) {
        console.warn(
            "[mobx-react-lite] 'useStaticRendering' is deprecated, use 'enableStaticRendering' instead"
        )
    }
    enableStaticRendering(enable)
}
