import {
    getNextId,
    addHiddenFinalProp,
    makeIterable,
    addHiddenProp,
    ObservableArrayAdministration,
    $mobx,
    arrayExtensions,
    IEnhancer,
    isObservableArray,
    IObservableArray,
    defineProperty,
    initObservable
} from "../internal"

// Bug in safari 9.* (or iOS 9 safari mobile). See #364
const ENTRY_0 = createArrayEntryDescriptor(0)

const safariPrototypeSetterInheritanceBug = (() => {
    let v = false
    const p = {}
    Object.defineProperty(p, "0", {
        set: () => {
            v = true
        }
    })
    Object.create(p)["0"] = 1
    return v === false
})()

/**
 * This array buffer contains two lists of properties, so that all arrays
 * can recycle their property definitions, which significantly improves performance of creating
 * properties on the fly.
 */
let OBSERVABLE_ARRAY_BUFFER_SIZE = 0

// Typescript workaround to make sure ObservableArray extends Array
class StubArray {}
function inherit(ctor, proto) {
    if (Object.setPrototypeOf) {
        Object.setPrototypeOf(ctor.prototype, proto)
    } else if (ctor.prototype.__proto__ !== undefined) {
        ctor.prototype.__proto__ = proto
    } else {
        ctor.prototype = proto
    }
}
inherit(StubArray, Array.prototype)

// Weex proto freeze protection was here,
// but it is unclear why the hack is need as MobX never changed the prototype
// anyway, so removed it in V6

export class LegacyObservableArray<T> extends StubArray {
    constructor(
        initialValues: T[] | undefined,
        enhancer: IEnhancer<T>,
        name = __DEV__ ? "ObservableArray@" + getNextId() : "ObservableArray",
        owned = false
    ) {
        super()
        initObservable(() => {
            const adm = new ObservableArrayAdministration(name, enhancer, owned, true)
            adm.proxy_ = this as any
            addHiddenFinalProp(this, $mobx, adm)

            if (initialValues && initialValues.length) {
                // @ts-ignore
                this.spliceWithArray(0, 0, initialValues)
            }

            if (safariPrototypeSetterInheritanceBug) {
                // Seems that Safari won't use numeric prototype setter untill any * numeric property is
                // defined on the instance. After that it works fine, even if this property is deleted.
                Object.defineProperty(this, "0", ENTRY_0)
            }
        })
    }

    concat(...arrays: T[][]): T[] {
        ;(this[$mobx] as ObservableArrayAdministration).atom_.reportObserved()
        return Array.prototype.concat.apply(
            (this as any).slice(),
            //@ts-ignore
            arrays.map(a => (isObservableArray(a) ? a.slice() : a))
        )
    }

    get length(): number {
        return (this[$mobx] as ObservableArrayAdministration).getArrayLength_()
    }

    set length(newLength: number) {
        ;(this[$mobx] as ObservableArrayAdministration).setArrayLength_(newLength)
    }

    get [Symbol.toStringTag]() {
        return "Array"
    }

    [Symbol.iterator]() {
        const self = this
        let nextIndex = 0
        return makeIterable({
            next() {
                return nextIndex < self.length
                    ? { value: self[nextIndex++], done: false }
                    : { done: true, value: undefined }
            }
        })
    }
}

Object.entries(arrayExtensions).forEach(([prop, fn]) => {
    if (prop !== "concat") {
        addHiddenProp(LegacyObservableArray.prototype, prop, fn)
    }
})

function createArrayEntryDescriptor(index: number) {
    return {
        enumerable: false,
        configurable: true,
        get: function () {
            return this[$mobx].get_(index)
        },
        set: function (value) {
            this[$mobx].set_(index, value)
        }
    }
}

function createArrayBufferItem(index: number) {
    defineProperty(LegacyObservableArray.prototype, "" + index, createArrayEntryDescriptor(index))
}

export function reserveArrayBuffer(max: number) {
    if (max > OBSERVABLE_ARRAY_BUFFER_SIZE) {
        for (let index = OBSERVABLE_ARRAY_BUFFER_SIZE; index < max + 100; index++) {
            createArrayBufferItem(index)
        }
        OBSERVABLE_ARRAY_BUFFER_SIZE = max
    }
}

reserveArrayBuffer(1000)

export function createLegacyArray<T>(
    initialValues: T[] | undefined,
    enhancer: IEnhancer<T>,
    name?: string
): IObservableArray<T> {
    return new LegacyObservableArray(initialValues, enhancer, name) as any
}
