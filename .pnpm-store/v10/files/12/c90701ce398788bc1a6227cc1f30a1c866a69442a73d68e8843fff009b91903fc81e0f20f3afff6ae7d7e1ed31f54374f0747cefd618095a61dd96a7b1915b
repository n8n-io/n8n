import {
    CreateObservableOptions,
    isObservableMap,
    AnnotationsMap,
    asObservableObject,
    isPlainObject,
    ObservableObjectAdministration,
    isObservable,
    die,
    getOwnPropertyDescriptors,
    $mobx,
    ownKeys,
    initObservable
} from "../internal"

export function extendObservable<A extends Object, B extends Object>(
    target: A,
    properties: B,
    annotations?: AnnotationsMap<B, never>,
    options?: CreateObservableOptions
): A & B {
    if (__DEV__) {
        if (arguments.length > 4) {
            die("'extendObservable' expected 2-4 arguments")
        }
        if (typeof target !== "object") {
            die("'extendObservable' expects an object as first argument")
        }
        if (isObservableMap(target)) {
            die("'extendObservable' should not be used on maps, use map.merge instead")
        }
        if (!isPlainObject(properties)) {
            die(`'extendObservable' only accepts plain objects as second argument`)
        }
        if (isObservable(properties) || isObservable(annotations)) {
            die(`Extending an object with another observable (object) is not supported`)
        }
    }
    // Pull descriptors first, so we don't have to deal with props added by administration ($mobx)
    const descriptors = getOwnPropertyDescriptors(properties)

    initObservable(() => {
        const adm: ObservableObjectAdministration = asObservableObject(target, options)[$mobx]
        ownKeys(descriptors).forEach(key => {
            adm.extend_(
                key,
                descriptors[key as any],
                // must pass "undefined" for { key: undefined }
                !annotations ? true : key in annotations ? annotations[key] : true
            )
        })
    })

    return target as any
}
