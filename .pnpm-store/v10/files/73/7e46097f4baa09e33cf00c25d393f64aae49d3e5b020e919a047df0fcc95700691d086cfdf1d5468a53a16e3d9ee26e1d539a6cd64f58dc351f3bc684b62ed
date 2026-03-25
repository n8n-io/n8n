import { forwardRef, memo } from "react"

import { isUsingStaticRendering } from "./staticRendering"
import { useObserver } from "./useObserver"

let warnObserverOptionsDeprecated = true

const hasSymbol = typeof Symbol === "function" && Symbol.for
const isFunctionNameConfigurable =
    Object.getOwnPropertyDescriptor(() => {}, "name")?.configurable ?? false

// Using react-is had some issues (and operates on elements, not on types), see #608 / #609
const ReactForwardRefSymbol = hasSymbol
    ? Symbol.for("react.forward_ref")
    : typeof forwardRef === "function" && forwardRef((props: any) => null)["$$typeof"]

const ReactMemoSymbol = hasSymbol
    ? Symbol.for("react.memo")
    : typeof memo === "function" && memo((props: any) => null)["$$typeof"]

export interface IObserverOptions {
    readonly forwardRef?: boolean
}

export function observer<P extends object, TRef = {}>(
    baseComponent: React.ForwardRefRenderFunction<TRef, P>,
    options: IObserverOptions & { forwardRef: true }
): React.MemoExoticComponent<
    React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<TRef>>
>

export function observer<P extends object, TRef = {}>(
    baseComponent: React.ForwardRefExoticComponent<
        React.PropsWithoutRef<P> & React.RefAttributes<TRef>
    >
): React.MemoExoticComponent<
    React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<TRef>>
>

export function observer<P extends object>(
    baseComponent: React.FunctionComponent<P>,
    options?: IObserverOptions
): React.FunctionComponent<P>

export function observer<
    C extends React.FunctionComponent<any> | React.ForwardRefRenderFunction<any>,
    Options extends IObserverOptions
>(
    baseComponent: C,
    options?: Options
): Options extends { forwardRef: true }
    ? C extends React.ForwardRefRenderFunction<infer TRef, infer P>
        ? C &
              React.MemoExoticComponent<
                  React.ForwardRefExoticComponent<
                      React.PropsWithoutRef<P> & React.RefAttributes<TRef>
                  >
              >
        : never /* forwardRef set for a non forwarding component */
    : C & { displayName: string }

// n.b. base case is not used for actual typings or exported in the typing files
export function observer<P extends object, TRef = {}>(
    baseComponent:
        | React.ForwardRefRenderFunction<TRef, P>
        | React.FunctionComponent<P>
        | React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<TRef>>,
    // TODO remove in next major
    options?: IObserverOptions
) {
    if (process.env.NODE_ENV !== "production" && warnObserverOptionsDeprecated && options) {
        warnObserverOptionsDeprecated = false
        console.warn(
            `[mobx-react-lite] \`observer(fn, { forwardRef: true })\` is deprecated, use \`observer(React.forwardRef(fn))\``
        )
    }

    if (ReactMemoSymbol && baseComponent["$$typeof"] === ReactMemoSymbol) {
        throw new Error(
            `[mobx-react-lite] You are trying to use \`observer\` on a function component wrapped in either another \`observer\` or \`React.memo\`. The observer already applies 'React.memo' for you.`
        )
    }

    // The working of observer is explained step by step in this talk: https://www.youtube.com/watch?v=cPF4iBedoF0&feature=youtu.be&t=1307
    if (isUsingStaticRendering()) {
        return baseComponent
    }

    let useForwardRef = options?.forwardRef ?? false
    let render = baseComponent

    const baseComponentName = baseComponent.displayName || baseComponent.name

    // If already wrapped with forwardRef, unwrap,
    // so we can patch render and apply memo
    if (ReactForwardRefSymbol && baseComponent["$$typeof"] === ReactForwardRefSymbol) {
        useForwardRef = true
        render = baseComponent["render"]
        if (typeof render !== "function") {
            throw new Error(
                `[mobx-react-lite] \`render\` property of ForwardRef was not a function`
            )
        }
    }

    let observerComponent = (props: any, ref: React.Ref<TRef>) => {
        return useObserver(() => render(props, ref), baseComponentName)
    }

    // Inherit original name and displayName, see #3438
    ;(observerComponent as React.FunctionComponent).displayName = baseComponent.displayName

    if (isFunctionNameConfigurable) {
        Object.defineProperty(observerComponent, "name", {
            value: baseComponent.name,
            writable: true,
            configurable: true
        })
    }

    // Support legacy context: `contextTypes` must be applied before `memo`
    if ((baseComponent as any).contextTypes) {
        ;(observerComponent as React.FunctionComponent).contextTypes = (
            baseComponent as any
        ).contextTypes
    }

    if (useForwardRef) {
        // `forwardRef` must be applied prior `memo`
        // `forwardRef(observer(cmp))` throws:
        // "forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...))"
        observerComponent = forwardRef(observerComponent)
    }

    // memo; we are not interested in deep updates
    // in props; we assume that if deep objects are changed,
    // this is in observables, which would have been tracked anyway
    observerComponent = memo(observerComponent)

    copyStaticProperties(baseComponent, observerComponent)

    if ("production" !== process.env.NODE_ENV) {
        Object.defineProperty(observerComponent, "contextTypes", {
            set() {
                throw new Error(
                    `[mobx-react-lite] \`${
                        this.displayName || this.type?.displayName || this.type?.name || "Component"
                    }.contextTypes\` must be set before applying \`observer\`.`
                )
            }
        })
    }

    return observerComponent
}

// based on https://github.com/mridgway/hoist-non-react-statics/blob/master/src/index.js
const hoistBlackList: any = {
    $$typeof: true,
    render: true,
    compare: true,
    type: true,
    // Don't redefine `displayName`,
    // it's defined as getter-setter pair on `memo` (see #3192).
    displayName: true
}

function copyStaticProperties(base: any, target: any) {
    Object.keys(base).forEach(key => {
        if (!hoistBlackList[key]) {
            Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(base, key)!)
        }
    })
}
