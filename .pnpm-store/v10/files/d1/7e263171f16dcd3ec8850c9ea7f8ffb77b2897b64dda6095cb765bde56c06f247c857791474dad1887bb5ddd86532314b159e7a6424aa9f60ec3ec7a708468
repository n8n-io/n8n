import { observable } from "mobx"
import { Component } from "react"

if (!Component) {
    throw new Error("mobx-react requires React to be available")
}

if (!observable) {
    throw new Error("mobx-react requires mobx to be available")
}

export {
    Observer,
    useObserver,
    useAsObservableSource,
    useLocalStore,
    isUsingStaticRendering,
    useStaticRendering,
    enableStaticRendering,
    observerBatching,
    useLocalObservable
} from "mobx-react-lite"

export { observer } from "./observer"

export { MobXProviderContext, Provider, ProviderProps } from "./Provider"
export { inject } from "./inject"
export { disposeOnUnmount } from "./disposeOnUnmount"
export { PropTypes } from "./propTypes"
export { IWrappedComponent } from "./types/IWrappedComponent"
