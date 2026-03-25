import { useDeprecated } from "./utils/utils"
import { observable, runInAction } from "mobx"
import { useState } from "react"

export function useAsObservableSource<TSource extends object>(current: TSource): TSource {
    if ("production" !== process.env.NODE_ENV)
        useDeprecated(
            "[mobx-react-lite] 'useAsObservableSource' is deprecated, please store the values directly in an observable, for example by using 'useLocalObservable', and sync future updates using 'useEffect' when needed. See the README for examples."
        )
    // We're deliberately not using idiomatic destructuring for the hook here.
    // Accessing the state value as an array element prevents TypeScript from generating unnecessary helpers in the resulting code.
    // For further details, please refer to mobxjs/mobx#3842.
    const res = useState(() => observable(current, {}, { deep: false }))[0]
    runInAction(() => {
        Object.assign(res, current)
    })
    return res
}
