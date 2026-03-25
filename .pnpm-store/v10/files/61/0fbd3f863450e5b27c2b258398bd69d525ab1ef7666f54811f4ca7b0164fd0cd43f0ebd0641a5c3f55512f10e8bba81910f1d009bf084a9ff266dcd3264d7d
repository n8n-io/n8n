export function shallowEqual(objA: any, objB: any): boolean {
    //From: https://github.com/facebook/fbjs/blob/c69904a511b900266935168223063dd8772dfc40/packages/fbjs/src/core/shallowEqual.js
    if (is(objA, objB)) {
        return true
    }
    if (typeof objA !== "object" || objA === null || typeof objB !== "object" || objB === null) {
        return false
    }
    const keysA = Object.keys(objA)
    const keysB = Object.keys(objB)
    if (keysA.length !== keysB.length) {
        return false
    }
    for (let i = 0; i < keysA.length; i++) {
        if (!Object.hasOwnProperty.call(objB, keysA[i]) || !is(objA[keysA[i]], objB[keysA[i]])) {
            return false
        }
    }
    return true
}

function is(x: any, y: any): boolean {
    // From: https://github.com/facebook/fbjs/blob/c69904a511b900266935168223063dd8772dfc40/packages/fbjs/src/core/shallowEqual.js
    if (x === y) {
        return x !== 0 || 1 / x === 1 / y
    } else {
        return x !== x && y !== y
    }
}

// based on https://github.com/mridgway/hoist-non-react-statics/blob/master/src/index.js
const hoistBlackList = {
    $$typeof: 1,
    render: 1,
    compare: 1,
    type: 1,
    childContextTypes: 1,
    contextType: 1,
    contextTypes: 1,
    defaultProps: 1,
    getDefaultProps: 1,
    getDerivedStateFromError: 1,
    getDerivedStateFromProps: 1,
    mixins: 1,
    displayName: 1,
    propTypes: 1
}

export function copyStaticProperties(base: object, target: object): void {
    const protoProps = Object.getOwnPropertyNames(Object.getPrototypeOf(base))
    Object.getOwnPropertyNames(base).forEach(key => {
        if (!hoistBlackList[key] && protoProps.indexOf(key) === -1) {
            Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(base, key)!)
        }
    })
}

/**
 * Helper to set `prop` to `this` as non-enumerable (hidden prop)
 * @param target
 * @param prop
 * @param value
 */
export function setHiddenProp(target: object, prop: any, value: any): void {
    if (!Object.hasOwnProperty.call(target, prop)) {
        Object.defineProperty(target, prop, {
            enumerable: false,
            configurable: true,
            writable: true,
            value
        })
    } else {
        target[prop] = value
    }
}

/**
 * Utilities for patching componentWillUnmount, to make sure @disposeOnUnmount works correctly icm with user defined hooks
 * and the handler provided by mobx-react
 */
const mobxMixins = Symbol("patchMixins")
const mobxPatchedDefinition = Symbol("patchedDefinition")

export interface Mixins extends Record<string, any> {
    locks: number
    methods: Array<Function>
}

function getMixins(target: object, methodName: string): Mixins {
    const mixins = (target[mobxMixins] = target[mobxMixins] || {})
    const methodMixins = (mixins[methodName] = mixins[methodName] || {})
    methodMixins.locks = methodMixins.locks || 0
    methodMixins.methods = methodMixins.methods || []
    return methodMixins
}

function wrapper(realMethod: Function, mixins: Mixins, ...args: Array<any>) {
    // locks are used to ensure that mixins are invoked only once per invocation, even on recursive calls
    mixins.locks++

    try {
        let retVal
        if (realMethod !== undefined && realMethod !== null) {
            retVal = realMethod.apply(this, args)
        }

        return retVal
    } finally {
        mixins.locks--
        if (mixins.locks === 0) {
            mixins.methods.forEach(mx => {
                mx.apply(this, args)
            })
        }
    }
}

function wrapFunction(realMethod: Function, mixins: Mixins): (...args: Array<any>) => any {
    const fn = function (...args: Array<any>) {
        wrapper.call(this, realMethod, mixins, ...args)
    }
    return fn
}

export function patch(target: object, methodName: string, mixinMethod: Function): void {
    const mixins = getMixins(target, methodName)

    if (mixins.methods.indexOf(mixinMethod) < 0) {
        mixins.methods.push(mixinMethod)
    }

    const oldDefinition = Object.getOwnPropertyDescriptor(target, methodName)
    if (oldDefinition && oldDefinition[mobxPatchedDefinition]) {
        // already patched definition, do not repatch
        return
    }

    const originalMethod = target[methodName]
    const newDefinition = createDefinition(
        target,
        methodName,
        oldDefinition ? oldDefinition.enumerable : undefined,
        mixins,
        originalMethod
    )

    Object.defineProperty(target, methodName, newDefinition)
}

function createDefinition(
    target: object,
    methodName: string,
    enumerable: any,
    mixins: Mixins,
    originalMethod: Function
): PropertyDescriptor {
    let wrappedFunc = wrapFunction(originalMethod, mixins)

    return {
        // @ts-ignore
        [mobxPatchedDefinition]: true,
        get: function () {
            return wrappedFunc
        },
        set: function (value) {
            if (this === target) {
                wrappedFunc = wrapFunction(value, mixins)
            } else {
                // when it is an instance of the prototype/a child prototype patch that particular case again separately
                // since we need to store separate values depending on wether it is the actual instance, the prototype, etc
                // e.g. the method for super might not be the same as the method for the prototype which might be not the same
                // as the method for the instance
                const newDefinition = createDefinition(this, methodName, enumerable, mixins, value)
                Object.defineProperty(this, methodName, newDefinition)
            }
        },
        configurable: true,
        enumerable: enumerable
    }
}
