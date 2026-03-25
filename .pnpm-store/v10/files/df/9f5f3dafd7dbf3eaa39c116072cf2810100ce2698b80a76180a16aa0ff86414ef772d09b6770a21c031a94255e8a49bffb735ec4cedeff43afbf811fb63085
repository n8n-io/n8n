import React from "react"
import { observer } from "./observer"
import { copyStaticProperties } from "./utils/utils"
import { MobXProviderContext } from "./Provider"
import { IReactComponent } from "./types/IReactComponent"
import { IValueMap } from "./types/IValueMap"
import { IWrappedComponent } from "./types/IWrappedComponent"
import { IStoresToProps } from "./types/IStoresToProps"

/**
 * Store Injection
 */
function createStoreInjector(
    grabStoresFn: IStoresToProps,
    component: IReactComponent<any>,
    injectNames: string,
    makeReactive: boolean
): IReactComponent<any> {
    // Support forward refs
    let Injector: IReactComponent<any> = React.forwardRef((props, ref) => {
        const newProps = { ...props }
        const context = React.useContext(MobXProviderContext)
        Object.assign(newProps, grabStoresFn(context || {}, newProps) || {})

        if (ref) {
            newProps.ref = ref
        }

        return React.createElement(component, newProps)
    })

    if (makeReactive) Injector = observer(Injector)
    Injector["isMobxInjector"] = true // assigned late to suppress observer warning

    // Static fields from component should be visible on the generated Injector
    copyStaticProperties(component, Injector)
    Injector["wrappedComponent"] = component
    Injector.displayName = getInjectName(component, injectNames)
    return Injector
}

function getInjectName(component: IReactComponent<any>, injectNames: string): string {
    let displayName
    const componentName =
        component.displayName ||
        component.name ||
        (component.constructor && component.constructor.name) ||
        "Component"
    if (injectNames) displayName = "inject-with-" + injectNames + "(" + componentName + ")"
    else displayName = "inject(" + componentName + ")"
    return displayName
}

function grabStoresByName(
    storeNames: Array<string>
): (
    baseStores: IValueMap,
    nextProps: React.ClassAttributes<any>
) => React.PropsWithRef<any> | undefined {
    return function (baseStores, nextProps) {
        storeNames.forEach(function (storeName) {
            if (
                storeName in nextProps // prefer props over stores
            )
                return
            if (!(storeName in baseStores))
                throw new Error(
                    "MobX injector: Store '" +
                        storeName +
                        "' is not available! Make sure it is provided by some Provider"
                )
            nextProps[storeName] = baseStores[storeName]
        })
        return nextProps
    }
}

export function inject(
    ...stores: Array<string>
): <T extends IReactComponent<any>>(
    target: T
) => T & (T extends IReactComponent<infer P> ? IWrappedComponent<P> : never)
export function inject<S extends IValueMap = {}, P extends IValueMap = {}, I extends IValueMap = {}, C extends IValueMap = {}>(
    fn: IStoresToProps<S, P, I, C>
): <T extends IReactComponent>(target: T) => T & IWrappedComponent<P>

/**
 * higher order component that injects stores to a child.
 * takes either a varargs list of strings, which are stores read from the context,
 * or a function that manually maps the available stores from the context to props:
 * storesToProps(mobxStores, props, context) => newProps
 */
export function inject(/* fn(stores, nextProps) or ...storeNames */ ...storeNames: Array<any>) {
    if (typeof arguments[0] === "function") {
        let grabStoresFn = arguments[0]
        return (componentClass: React.ComponentClass<any, any>) =>
            createStoreInjector(grabStoresFn, componentClass, grabStoresFn.name, true)
    } else {
        return (componentClass: React.ComponentClass<any, any>) =>
            createStoreInjector(
                grabStoresByName(storeNames),
                componentClass,
                storeNames.join("-"),
                false
            )
    }
}
