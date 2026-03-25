import { observable } from "mobx"
import { useState } from "react"

import { useDeprecated } from "./utils/utils"
import { useAsObservableSource } from "./useAsObservableSource"

export function useLocalStore<TStore extends Record<string, any>>(initializer: () => TStore): TStore
export function useLocalStore<TStore extends Record<string, any>, TSource extends object>(
    initializer: (source: TSource) => TStore,
    current: TSource
): TStore
export function useLocalStore<TStore extends Record<string, any>, TSource extends object>(
    initializer: (source?: TSource) => TStore,
    current?: TSource
): TStore {
    if ("production" !== process.env.NODE_ENV) {
        useDeprecated(
            "[mobx-react-lite] 'useLocalStore' is deprecated, use 'useLocalObservable' instead."
        )
    }
    const source = current && useAsObservableSource(current)
    return useState(() => observable(initializer(source), undefined, { autoBind: true }))[0]
}
