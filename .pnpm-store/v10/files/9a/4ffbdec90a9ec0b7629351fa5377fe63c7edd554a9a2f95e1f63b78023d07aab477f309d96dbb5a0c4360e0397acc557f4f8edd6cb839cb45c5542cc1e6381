import { PureComponent, Component, ComponentClass, ClassAttributes } from "react"
import {
    _allowStateChanges,
    Reaction,
    _allowStateReadsStart,
    _allowStateReadsEnd,
    _getGlobalState
} from "mobx"
import {
    isUsingStaticRendering,
    _observerFinalizationRegistry as observerFinalizationRegistry
} from "mobx-react-lite"
import { shallowEqual, patch } from "./utils/utils"

const administrationSymbol = Symbol("ObserverAdministration")
const isMobXReactObserverSymbol = Symbol("isMobXReactObserver")

let observablePropDescriptors: PropertyDescriptorMap
if (__DEV__) {
    observablePropDescriptors = {
        props: createObservablePropDescriptor("props"),
        state: createObservablePropDescriptor("state"),
        context: createObservablePropDescriptor("context")
    }
}

type ObserverAdministration = {
    reaction: Reaction | null // also serves as disposed flag
    forceUpdate: Function | null
    mounted: boolean // we could use forceUpdate as mounted flag
    reactionInvalidatedBeforeMount: boolean
    name: string
    // Used only on __DEV__
    props: any
    state: any
    context: any
}

function getAdministration(component: Component): ObserverAdministration {
    // We create administration lazily, because we can't patch constructor
    // and the exact moment of initialization partially depends on React internals.
    // At the time of writing this, the first thing invoked is one of the observable getter/setter (state/props/context).
    return (component[administrationSymbol] ??= {
        reaction: null,
        mounted: false,
        reactionInvalidatedBeforeMount: false,
        forceUpdate: null,
        name: getDisplayName(component.constructor as ComponentClass),
        state: undefined,
        props: undefined,
        context: undefined
    })
}

export function makeClassComponentObserver(
    componentClass: ComponentClass<any, any>
): ComponentClass<any, any> {
    const { prototype } = componentClass

    if (componentClass[isMobXReactObserverSymbol]) {
        const displayName = getDisplayName(componentClass)
        throw new Error(
            `The provided component class (${displayName}) has already been declared as an observer component.`
        )
    } else {
        componentClass[isMobXReactObserverSymbol] = true
    }

    if (prototype.componentWillReact) {
        throw new Error("The componentWillReact life-cycle event is no longer supported")
    }
    if (componentClass["__proto__"] !== PureComponent) {
        if (!prototype.shouldComponentUpdate) {
            prototype.shouldComponentUpdate = observerSCU
        } else if (prototype.shouldComponentUpdate !== observerSCU) {
            // n.b. unequal check, instead of existence check, as @observer might be on superclass as well
            throw new Error(
                "It is not allowed to use shouldComponentUpdate in observer based components."
            )
        }
    }

    if (__DEV__) {
        Object.defineProperties(prototype, observablePropDescriptors)
    }

    const originalRender = prototype.render
    if (typeof originalRender !== "function") {
        const displayName = getDisplayName(componentClass)
        throw new Error(
            `[mobx-react] class component (${displayName}) is missing \`render\` method.` +
                `\n\`observer\` requires \`render\` being a function defined on prototype.` +
                `\n\`render = () => {}\` or \`render = function() {}\` is not supported.`
        )
    }

    prototype.render = function () {
        Object.defineProperty(this, "render", {
            // There is no safe way to replace render, therefore it's forbidden.
            configurable: false,
            writable: false,
            value: isUsingStaticRendering()
                ? originalRender
                : createReactiveRender.call(this, originalRender)
        })
        return this.render()
    }

    const originalComponentDidMount = prototype.componentDidMount
    prototype.componentDidMount = function () {
        if (__DEV__ && this.componentDidMount !== Object.getPrototypeOf(this).componentDidMount) {
            const displayName = getDisplayName(componentClass)
            throw new Error(
                `[mobx-react] \`observer(${displayName}).componentDidMount\` must be defined on prototype.` +
                    `\n\`componentDidMount = () => {}\` or \`componentDidMount = function() {}\` is not supported.`
            )
        }

        // `componentDidMount` may not be called at all. React can abandon the instance after `render`.
        // That's why we use finalization registry to dispose reaction created during render.
        // Happens with `<Suspend>` see #3492
        //
        // `componentDidMount` can be called immediately after `componentWillUnmount` without calling `render` in between.
        // Happens with `<StrictMode>`see #3395.
        //
        // If `componentDidMount` is called, it's guaranteed to run synchronously with render (similary to `useLayoutEffect`).
        // Therefore we don't have to worry about external (observable) state being updated before mount (no state version checking).
        //
        // Things may change: "In the future, React will provide a feature that lets components preserve state between unmounts"

        const admin = getAdministration(this)

        admin.mounted = true

        // Component instance committed, prevent reaction disposal.
        observerFinalizationRegistry.unregister(this)

        // We don't set forceUpdate before mount because it requires a reference to `this`,
        // therefore `this` could NOT be garbage collected before mount,
        // preventing reaction disposal by FinalizationRegistry and leading to memory leak.
        // As an alternative we could have `admin.instanceRef = new WeakRef(this)`, but lets avoid it if possible.
        admin.forceUpdate = () => this.forceUpdate()

        if (!admin.reaction || admin.reactionInvalidatedBeforeMount) {
            // Missing reaction:
            // 1. Instance was unmounted (reaction disposed) and immediately remounted without running render #3395.
            // 2. Reaction was disposed by finalization registry before mount. Shouldn't ever happen for class components:
            // `componentDidMount` runs synchronously after render, but our registry are deferred (can't run in between).
            // In any case we lost subscriptions to observables, so we have to create new reaction and re-render to resubscribe.
            // The reaction will be created lazily by following render.

            // Reaction invalidated before mount:
            // 1. A descendant's `componenDidMount` invalidated it's parent #3730

            admin.forceUpdate()
        }
        return originalComponentDidMount?.apply(this, arguments)
    }

    // TODO@major Overly complicated "patch" is only needed to support the deprecated @disposeOnUnmount
    patch(prototype, "componentWillUnmount", function () {
        if (isUsingStaticRendering()) {
            return
        }
        const admin = getAdministration(this)
        admin.reaction?.dispose()
        admin.reaction = null
        admin.forceUpdate = null
        admin.mounted = false
        admin.reactionInvalidatedBeforeMount = false
    })

    return componentClass
}

// Generates a friendly name for debugging
function getDisplayName(componentClass: ComponentClass) {
    return componentClass.displayName || componentClass.name || "<component>"
}

function createReactiveRender(originalRender: any) {
    const boundOriginalRender = originalRender.bind(this)

    const admin = getAdministration(this)

    function reactiveRender() {
        if (!admin.reaction) {
            // Create reaction lazily to support re-mounting #3395
            admin.reaction = createReaction(admin)
            if (!admin.mounted) {
                // React can abandon this instance and never call `componentDidMount`/`componentWillUnmount`,
                // we have to make sure reaction will be disposed.
                observerFinalizationRegistry.register(this, admin, this)
            }
        }

        let error: unknown = undefined
        let renderResult = undefined
        admin.reaction.track(() => {
            try {
                // TODO@major
                // Optimization: replace with _allowStateChangesStart/End (not available in mobx@6.0.0)
                renderResult = _allowStateChanges(false, boundOriginalRender)
            } catch (e) {
                error = e
            }
        })
        if (error) {
            throw error
        }
        return renderResult
    }

    return reactiveRender
}

function createReaction(admin: ObserverAdministration) {
    return new Reaction(`${admin.name}.render()`, () => {
        if (!admin.mounted) {
            // This is neccessary to avoid react warning about calling forceUpdate on component that isn't mounted yet.
            // This happens when component is abandoned after render - our reaction is already created and reacts to changes.
            // `componenDidMount` runs synchronously after `render`, so unlike functional component, there is no delay during which the reaction could be invalidated.
            // However `componentDidMount` runs AFTER it's descendants' `componentDidMount`, which CAN invalidate the reaction, see #3730. Therefore remember and forceUpdate on mount.
            admin.reactionInvalidatedBeforeMount = true
            return
        }

        try {
            admin.forceUpdate?.()
        } catch (error) {
            admin.reaction?.dispose()
            admin.reaction = null
        }
    })
}

function observerSCU(nextProps: ClassAttributes<any>, nextState: any): boolean {
    if (isUsingStaticRendering()) {
        console.warn(
            "[mobx-react] It seems that a re-rendering of a React component is triggered while in static (server-side) mode. Please make sure components are rendered only once server-side."
        )
    }
    // update on any state changes (as is the default)
    if (this.state !== nextState) {
        return true
    }
    // update if props are shallowly not equal, inspired by PureRenderMixin
    // we could return just 'false' here, and avoid the `skipRender` checks etc
    // however, it is nicer if lifecycle events are triggered like usually,
    // so we return true here if props are shallowly modified.
    return !shallowEqual(this.props, nextProps)
}

function createObservablePropDescriptor(key: "props" | "state" | "context") {
    return {
        configurable: true,
        enumerable: true,
        get() {
            const admin = getAdministration(this)
            const derivation = _getGlobalState().trackingDerivation
            if (derivation && derivation !== admin.reaction) {
                throw new Error(
                    `[mobx-react] Cannot read "${admin.name}.${key}" in a reactive context, as it isn't observable.
                    Please use component lifecycle method to copy the value into a local observable first.
                    See https://github.com/mobxjs/mobx/blob/main/packages/mobx-react/README.md#note-on-using-props-and-state-in-derivations`
                )
            }
            return admin[key]
        },
        set(value) {
            getAdministration(this)[key] = value
        }
    }
}
