import {
    $mobx,
    asObservableObject,
    AnnotationsMap,
    CreateObservableOptions,
    ObservableObjectAdministration,
    collectStoredAnnotations,
    isPlainObject,
    isObservableObject,
    die,
    ownKeys,
    extendObservable,
    addHiddenProp,
    storedAnnotationsSymbol,
    initObservable
} from "../internal"

// Hack based on https://github.com/Microsoft/TypeScript/issues/14829#issuecomment-322267089
// We need this, because otherwise, AdditionalKeys is going to be inferred to be any
// set of superfluous keys. But, we rather want to get a compile error unless AdditionalKeys is
// _explicity_ passed as generic argument
// Fixes: https://github.com/mobxjs/mobx/issues/2325#issuecomment-691070022
type NoInfer<T> = [T][T extends any ? 0 : never]

type MakeObservableOptions = Omit<CreateObservableOptions, "proxy">

export function makeObservable<T extends object, AdditionalKeys extends PropertyKey = never>(
    target: T,
    annotations?: AnnotationsMap<T, NoInfer<AdditionalKeys>>,
    options?: MakeObservableOptions
): T {
    initObservable(() => {
        const adm: ObservableObjectAdministration = asObservableObject(target, options)[$mobx]
        if (__DEV__ && annotations && target[storedAnnotationsSymbol]) {
            die(
                `makeObservable second arg must be nullish when using decorators. Mixing @decorator syntax with annotations is not supported.`
            )
        }
        // Default to decorators
        annotations ??= collectStoredAnnotations(target)

        // Annotate
        ownKeys(annotations).forEach(key => adm.make_(key, annotations![key]))
    })
    return target
}

// proto[keysSymbol] = new Set<PropertyKey>()
const keysSymbol = Symbol("mobx-keys")

export function makeAutoObservable<T extends object, AdditionalKeys extends PropertyKey = never>(
    target: T,
    overrides?: AnnotationsMap<T, NoInfer<AdditionalKeys>>,
    options?: MakeObservableOptions
): T {
    if (__DEV__) {
        if (!isPlainObject(target) && !isPlainObject(Object.getPrototypeOf(target))) {
            die(`'makeAutoObservable' can only be used for classes that don't have a superclass`)
        }
        if (isObservableObject(target)) {
            die(`makeAutoObservable can only be used on objects not already made observable`)
        }
    }

    // Optimization: avoid visiting protos
    // Assumes that annotation.make_/.extend_ works the same for plain objects
    if (isPlainObject(target)) {
        return extendObservable(target, target, overrides, options)
    }

    initObservable(() => {
        const adm: ObservableObjectAdministration = asObservableObject(target, options)[$mobx]

        // Optimization: cache keys on proto
        // Assumes makeAutoObservable can be called only once per object and can't be used in subclass
        if (!target[keysSymbol]) {
            const proto = Object.getPrototypeOf(target)
            const keys = new Set([...ownKeys(target), ...ownKeys(proto)])
            keys.delete("constructor")
            keys.delete($mobx)
            addHiddenProp(proto, keysSymbol, keys)
        }

        target[keysSymbol].forEach(key =>
            adm.make_(
                key,
                // must pass "undefined" for { key: undefined }
                !overrides ? true : key in overrides ? overrides[key] : true
            )
        )
    })

    return target
}
